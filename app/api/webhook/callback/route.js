import { NextResponse } from 'next/server'
import { getCampaign, updateLine, addHistoryEntry, saveArticle, ensureLoaded } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'
import { broadcast } from '@/lib/events'

// Webhook callback from Make.com
export async function POST(request) {
  try {
    await ensureLoaded()
    const body = await request.json()
    const { campaignId, lineId, status, error, ...content } = body

    if (!campaignId || !lineId) {
      return NextResponse.json({ error: 'campaignId and lineId required' }, { status: 400 })
    }

    const validStatuses = ['done', 'error']
    const lineStatus = validStatuses.includes(status) ? status : 'done'

    const updates = {
      status: lineStatus,
      completedAt: new Date().toISOString(),
    }
    if (error) updates.error = error

    const updated = await updateLine(campaignId, lineId, updates)
    if (!updated) {
      logger.warn(`Webhook callback: ligne introuvable ${lineId} (campagne ${campaignId})`)
      return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    }

    // If content is provided, save article
    const hasContent = content.meta_title || content.meta_description || content.h1 || content.intro || content.body || content.faq || content.full_html
    let article = null

    if (hasContent && lineStatus === 'done') {
      const campaign = getCampaign(campaignId)
      const line = campaign?.lines?.find(l => l.id === lineId)

      article = await saveArticle({
        campaignId,
        lineId,
        company: campaign?.name || '',
        keyword: line?.keyword_main || content.keyword || '',
        url: line?.url || content.url || '',
        city: line?.city || content.city || '',
        meta_title: content.meta_title || '',
        meta_description: content.meta_description || '',
        h1: content.h1 || line?.h1 || '',
        intro: content.intro || '',
        body: content.body || '',
        faq: content.faq || '',
        full_html: content.full_html || '',
      })

      await updateLine(campaignId, lineId, { articleId: article.id })

      logger.success(`Article genere pour "${line?.keyword_main || lineId}"`, {
        campaignId, lineId, articleId: article.id,
      })

      // Broadcast SSE notification
      broadcast('article_ready', {
        articleId: article.id,
        keyword: line?.keyword_main || '',
        company: campaign?.name || '',
        campaignId,
        lineId,
      })
    }

    await addHistoryEntry({
      type: 'webhook_callback',
      campaignId,
      lineId,
      status: lineStatus,
      articleId: article?.id || null,
      error: error || null,
      receivedAt: new Date().toISOString(),
    })

    logger.info(`Webhook callback: ligne ${lineId} -> ${lineStatus}`, {
      campaignId, lineId, status: lineStatus, hasArticle: !!article,
    })

    // Auto-chain: if line completed successfully, launch next queued line in same campaign
    let nextLaunched = null
    if (lineStatus === 'done' && campaignId) {
      const campaign = getCampaign(campaignId)
      if (campaign) {
        const nextLine = (campaign.lines || []).find(l => l.status === 'queued')
        if (nextLine) {
          nextLaunched = await autoLaunchNext(campaign, nextLine)
        }
      }
    }

    return NextResponse.json({
      ok: true,
      status: lineStatus,
      articleId: article?.id || null,
      nextLaunched: nextLaunched || null,
    })
  } catch (err) {
    logger.error(`Webhook callback erreur: ${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Auto-launch the next queued line in a campaign
async function autoLaunchNext(campaign, line) {
  const webhookUrl = getWebhookUrl(campaign.branch)
  if (!webhookUrl) {
    logger.warn(`Auto-chain: webhook non configure pour "${campaign.branch}"`)
    return null
  }

  await updateLine(campaign.id, line.id, { status: 'processing' })

  const payload = {
    branch: campaign.branch,
    company: campaign.name,
    sector: campaign.sector || '',
    description: campaign.description || '',
    word_count: campaign.word_count || '1200',
    tone: campaign.tone || 'expert',
    language: campaign.lang || 'fr',
    url: line.url,
    city: line.city || '',
    keyword_main: line.keyword_main,
    keywords_secondary: line.keywords_sec || '',
    intent: line.intent || '',
    h1: line.h1 || '',
    extra_instructions: line.extra || '',
    product_name: line.product_name || '',
    product_price: line.product_price || '',
    product_ref: line.product_ref || '',
    cat_product: line.cat_product || '',
    cat_ref: line.cat_ref || '',
    cat_specs: line.cat_specs || '',
    source: 'H-TIC-Launcher-AutoChain',
    campaignId: campaign.id,
    lineId: line.id,
    sentAt: new Date().toISOString(),
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/webhook/callback`,
  }

  const info = campaign.info || {}
  for (const [k, v] of Object.entries(info)) {
    if (v) payload[k] = v
  }

  const otherLines = (campaign.lines || []).filter(l => l.id !== line.id && l.url)
  if (otherLines.length > 0) {
    payload.internal_links = otherLines.map(l => ({
      url: l.url,
      keyword: l.keyword_main || '',
      h1: l.h1 || '',
      city: l.city || '',
    }))
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()
    if (res.ok) {
      await updateLine(campaign.id, line.id, { launchedAt: now, makeStatus: res.status })
      await addHistoryEntry({
        branch: campaign.branch, company: campaign.name,
        keyword_main: line.keyword_main, url: line.url,
        status: 'sent', makeStatus: res.status,
        payload, campaignId: campaign.id, lineId: line.id,
        autoChain: true,
      })
      logger.success(`Auto-chain: "${line.keyword_main}" lance (${campaign.name})`, {
        campaignId: campaign.id, lineId: line.id,
      })
      return { lineId: line.id, keyword: line.keyword_main, status: 'launched' }
    } else {
      const error = `HTTP ${res.status}`
      await updateLine(campaign.id, line.id, { status: 'error', error, completedAt: now, makeStatus: res.status })
      logger.error(`Auto-chain: echec "${line.keyword_main}": ${error}`)
      return { lineId: line.id, keyword: line.keyword_main, status: 'error', error }
    }
  } catch (err) {
    await updateLine(campaign.id, line.id, { status: 'error', error: err.message, completedAt: new Date().toISOString() })
    logger.error(`Auto-chain: erreur reseau "${line.keyword_main}": ${err.message}`)
    return { lineId: line.id, keyword: line.keyword_main, status: 'error', error: err.message }
  }
}
