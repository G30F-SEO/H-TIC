import { NextResponse } from 'next/server'
import { getCampaigns, updateCampaign, addHistoryEntry } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

// This endpoint is called by Vercel Cron Jobs
// Secured by CRON_SECRET env var
export async function GET(request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const campaigns = getCampaigns()
  const next = campaigns.find(c => c.status === 'queued')

  if (!next) {
    logger.info('Cron: aucune campagne en file')
    return NextResponse.json({ message: 'no_queued', launched: 0 })
  }

  // Launch next queued campaign
  const webhookUrl = getWebhookUrl(next.branch)
  if (!webhookUrl) {
    const error = `Webhook non configure pour "${next.branch}"`
    updateCampaign(next.id, { status: 'error', error })
    logger.error(`Cron: ${error}`, { campaignId: next.id })
    return NextResponse.json({ error, launched: 0 })
  }

  const payload = {
    branch: next.branch,
    company: next.company,
    url: next.url,
    city: next.city,
    sector: next.sector || '',
    keyword_main: next.keyword_main,
    keywords_secondary: next.keywords_sec || '',
    intent: next.intent || '',
    h1: next.h1 || '',
    word_count: next.word_count || '1200',
    tone: next.tone || 'expert',
    language: next.lang || 'fr',
    extra_instructions: next.extra || '',
    product_name: next.product_name || '',
    product_price: next.product_price || '',
    product_ref: next.product_ref || '',
    cat_product: next.cat_product || '',
    cat_ref: next.cat_ref || '',
    cat_specs: next.cat_specs || '',
    source: 'H-TIC-Launcher-Cron',
    campaignId: next.id,
    sentAt: new Date().toISOString(),
  }

  try {
    updateCampaign(next.id, { status: 'processing' })
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()
    if (res.ok) {
      updateCampaign(next.id, { status: 'done', launchedAt: now, completedAt: now, makeStatus: res.status })
      addHistoryEntry({ branch: next.branch, company: next.company, keyword_main: next.keyword_main, url: next.url, status: 'sent', makeStatus: res.status, payload, campaignId: next.id })
      logger.success(`Cron: "${next.company}" lance (${next.branch})`, { campaignId: next.id })
      return NextResponse.json({ ok: true, launched: 1, company: next.company })
    } else {
      const error = `HTTP ${res.status}`
      updateCampaign(next.id, { status: 'error', error, completedAt: now, makeStatus: res.status })
      addHistoryEntry({ branch: next.branch, company: next.company, keyword_main: next.keyword_main, url: next.url, status: 'error', error, makeStatus: res.status, payload, campaignId: next.id })
      logger.error(`Cron: echec "${next.company}": ${error}`, { campaignId: next.id })
      return NextResponse.json({ error, launched: 0 })
    }
  } catch (err) {
    updateCampaign(next.id, { status: 'error', error: err.message, completedAt: new Date().toISOString() })
    logger.error(`Cron: erreur reseau "${next.company}": ${err.message}`, { campaignId: next.id })
    return NextResponse.json({ error: err.message, launched: 0 })
  }
}
