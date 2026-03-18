import { NextResponse } from 'next/server'
import { getCampaigns, updateLine, addHistoryEntry, ensureLoaded } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

// This endpoint is called by Vercel Cron Jobs or auto-mode
// Secured by CRON_SECRET env var
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureLoaded()
  const campaigns = getCampaigns()

  // Find next queued line across all campaigns
  let targetCampaign = null
  let targetLine = null
  for (const camp of campaigns) {
    const line = (camp.lines || []).find(l => l.status === 'queued')
    if (line) {
      targetCampaign = camp
      targetLine = line
      break
    }
  }

  if (!targetCampaign || !targetLine) {
    logger.info('Cron: aucune ligne en file')
    return NextResponse.json({ message: 'no_queued', launched: 0 })
  }

  const webhookUrl = getWebhookUrl(targetCampaign.branch)
  if (!webhookUrl) {
    const error = `Webhook non configure pour "${targetCampaign.branch}"`
    await updateLine(targetCampaign.id, targetLine.id, { status: 'error', error })
    logger.error(`Cron: ${error}`, { campaignId: targetCampaign.id, lineId: targetLine.id })
    return NextResponse.json({ error, launched: 0 })
  }

  const payload = {
    branch: targetCampaign.branch,
    company: targetCampaign.name,
    sector: targetCampaign.sector || '',
    description: targetCampaign.description || '',
    word_count: targetCampaign.word_count || '1200',
    tone: targetCampaign.tone || 'expert',
    language: targetCampaign.lang || 'fr',
    url: targetLine.url,
    city: targetLine.city || '',
    keyword_main: targetLine.keyword_main,
    keywords_secondary: targetLine.keywords_sec || '',
    intent: targetLine.intent || '',
    h1: targetLine.h1 || '',
    extra_instructions: targetLine.extra || '',
    product_name: targetLine.product_name || '',
    product_price: targetLine.product_price || '',
    product_ref: targetLine.product_ref || '',
    cat_product: targetLine.cat_product || '',
    cat_ref: targetLine.cat_ref || '',
    cat_specs: targetLine.cat_specs || '',
    source: 'H-TIC-Launcher-Cron',
    campaignId: targetCampaign.id,
    lineId: targetLine.id,
    sentAt: new Date().toISOString(),
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/webhook/callback`,
  }

  // Merge campaign info
  const info = targetCampaign.info || {}
  for (const [k, v] of Object.entries(info)) {
    if (v) payload[k] = v
  }

  // Internal linking: all other pages from the campaign
  const otherLines = (targetCampaign.lines || []).filter(l => l.id !== targetLine.id && l.url)
  if (otherLines.length > 0) {
    payload.internal_links = otherLines.map(l => ({
      url: l.url,
      keyword: l.keyword_main || '',
      h1: l.h1 || '',
      city: l.city || '',
    }))
  }

  try {
    await updateLine(targetCampaign.id, targetLine.id, { status: 'processing' })
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()
    if (res.ok) {
      await updateLine(targetCampaign.id, targetLine.id, { status: 'processing', launchedAt: now, makeStatus: res.status })
      await addHistoryEntry({ branch: targetCampaign.branch, company: targetCampaign.name, keyword_main: targetLine.keyword_main, url: targetLine.url, status: 'sent', makeStatus: res.status, payload, campaignId: targetCampaign.id, lineId: targetLine.id })
      logger.success(`Cron: "${targetLine.keyword_main}" lance (${targetCampaign.name})`, { campaignId: targetCampaign.id, lineId: targetLine.id })
      return NextResponse.json({ ok: true, launched: 1, company: targetCampaign.name, keyword: targetLine.keyword_main })
    } else {
      const error = `HTTP ${res.status}`
      await updateLine(targetCampaign.id, targetLine.id, { status: 'error', error, completedAt: now, makeStatus: res.status })
      await addHistoryEntry({ branch: targetCampaign.branch, company: targetCampaign.name, keyword_main: targetLine.keyword_main, url: targetLine.url, status: 'error', error, makeStatus: res.status, payload, campaignId: targetCampaign.id, lineId: targetLine.id })
      logger.error(`Cron: echec "${targetLine.keyword_main}": ${error}`, { campaignId: targetCampaign.id, lineId: targetLine.id })
      return NextResponse.json({ error, launched: 0 })
    }
  } catch (err) {
    await updateLine(targetCampaign.id, targetLine.id, { status: 'error', error: err.message, completedAt: new Date().toISOString() })
    logger.error(`Cron: erreur reseau "${targetLine.keyword_main}": ${err.message}`, { campaignId: targetCampaign.id, lineId: targetLine.id })
    return NextResponse.json({ error: err.message, launched: 0 })
  }
}
