import { NextResponse } from 'next/server'
import { getCampaign, updateLine, addHistoryEntry, saveArticle } from '@/lib/db'
import { logger } from '@/lib/logger'

// Webhook callback from Make.com
// Make sends:
// {
//   campaignId, lineId, status: 'done'|'error', error?,
//   meta_title?, meta_description?, h1?, intro?, body?, faq?, full_html?
// }
export async function POST(request) {
  try {
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

    const updated = updateLine(campaignId, lineId, updates)
    if (!updated) {
      logger.warn(`Webhook callback: ligne introuvable ${lineId} (campagne ${campaignId})`)
      return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    }

    // If content is provided, save article
    const hasContent = content.meta_title || content.meta_description || content.h1 || content.intro || content.body || content.faq || content.full_html
    let article = null

    if (hasContent && lineStatus === 'done') {
      // Get campaign + line info for context
      const campaign = getCampaign(campaignId)
      const line = campaign?.lines?.find(l => l.id === lineId)

      article = saveArticle({
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

      // Also store articleId on the line for quick reference
      updateLine(campaignId, lineId, { articleId: article.id })

      logger.success(`Article genere pour "${line?.keyword_main || lineId}"`, {
        campaignId, lineId, articleId: article.id,
      })
    }

    addHistoryEntry({
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

    return NextResponse.json({ ok: true, status: lineStatus, articleId: article?.id || null })
  } catch (err) {
    logger.error(`Webhook callback erreur: ${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
