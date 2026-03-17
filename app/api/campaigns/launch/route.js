import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCampaigns, getCampaign, updateLine, addHistoryEntry } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

// Build the full payload by merging campaign info + line data
function buildPayload(campaign, line) {
  const payload = {
    // Campaign-level
    branch: campaign.branch,
    company: campaign.name,
    sector: campaign.sector || '',
    description: campaign.description || '',
    word_count: campaign.word_count || '1200',
    tone: campaign.tone || 'expert',
    language: campaign.lang || 'fr',
    // Line-level
    url: line.url,
    city: line.city || '',
    keyword_main: line.keyword_main,
    keywords_secondary: line.keywords_sec || '',
    intent: line.intent || '',
    h1: line.h1 || '',
    extra_instructions: line.extra || '',
    // E-commerce
    product_name: line.product_name || '',
    product_price: line.product_price || '',
    product_ref: line.product_ref || '',
    // Catalogue
    cat_product: line.cat_product || '',
    cat_ref: line.cat_ref || '',
    cat_specs: line.cat_specs || '',
    // Meta
    source: 'H-TIC-Launcher',
    campaignId: campaign.id,
    lineId: line.id,
    sentAt: new Date().toISOString(),
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/webhook/callback`,
  }

  // Merge all info fields from campaign
  const info = campaign.info || {}
  const infoFields = ['context', 'b2b_target', 'b2b_offer', 'b2b_value', 'b2c_target', 'b2c_experience', 'b2c_ambiance', 'personas', 'services', 'geo_location', 'geo_zone', 'geo_environment', 'style_approach', 'style_relation', 'style_objective', 'style_vocabulary', 'style_promises', 'style_structure', 'style_storytelling', 'style_engagement', 'style_verb_tense', 'reviews', 'extra_info']
  for (const f of infoFields) {
    if (info[f]) payload[f] = info[f]
  }

  // Internal linking: include all other pages from the campaign
  const otherLines = (campaign.lines || []).filter(l => l.id !== line.id && l.url)
  if (otherLines.length > 0) {
    payload.internal_links = otherLines.map(l => ({
      url: l.url,
      keyword: l.keyword_main || '',
      h1: l.h1 || '',
      city: l.city || '',
    }))
  }

  return payload
}

async function launchLine(campaign, line) {
  const webhookUrl = getWebhookUrl(campaign.branch)
  if (!webhookUrl) {
    const error = `Webhook non configure pour "${campaign.branch}"`
    logger.error(error, { campaignId: campaign.id, lineId: line.id })
    updateLine(campaign.id, line.id, { status: 'error', error, completedAt: new Date().toISOString() })
    return { id: line.id, status: 'error', error }
  }

  updateLine(campaign.id, line.id, { status: 'processing' })
  const payload = buildPayload(campaign, line)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()

    if (res.ok) {
      updateLine(campaign.id, line.id, {
        status: 'processing', launchedAt: now, error: null, makeStatus: res.status,
      })
      addHistoryEntry({
        branch: campaign.branch, company: campaign.name,
        keyword_main: line.keyword_main, url: line.url,
        status: 'sent', makeStatus: res.status, error: null,
        payload, campaignId: campaign.id, lineId: line.id,
      })
      logger.success(`Ligne "${line.keyword_main}" lancee (${campaign.name})`, {
        campaignId: campaign.id, lineId: line.id, makeStatus: res.status,
      })
      return { id: line.id, status: 'done' }
    } else {
      const error = `HTTP ${res.status} depuis Make`
      updateLine(campaign.id, line.id, { status: 'error', error, makeStatus: res.status, completedAt: now })
      addHistoryEntry({
        branch: campaign.branch, company: campaign.name,
        keyword_main: line.keyword_main, url: line.url,
        status: 'error', makeStatus: res.status, error,
        payload, campaignId: campaign.id, lineId: line.id,
      })
      logger.error(`Ligne "${line.keyword_main}" echouee: ${error}`, { campaignId: campaign.id, lineId: line.id })
      return { id: line.id, status: 'error', error }
    }
  } catch (err) {
    const error = err.message
    updateLine(campaign.id, line.id, { status: 'error', error, completedAt: new Date().toISOString() })
    addHistoryEntry({
      branch: campaign.branch, company: campaign.name,
      keyword_main: line.keyword_main, url: line.url,
      status: 'error', error, payload, campaignId: campaign.id, lineId: line.id,
    })
    logger.error(`Ligne "${line.keyword_main}" erreur reseau: ${error}`, { campaignId: campaign.id, lineId: line.id })
    return { id: line.id, status: 'error', error }
  }
}

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Mode "next" : lance la prochaine ligne en file (tous campagnes confondues)
  if (body.mode === 'next') {
    const campaigns = getCampaigns()
    for (const camp of campaigns) {
      const nextLine = (camp.lines || []).find(l => l.status === 'queued')
      if (nextLine) {
        const result = await launchLine(camp, nextLine)
        return NextResponse.json({ result: { ...result, company: camp.name, keyword_main: nextLine.keyword_main } })
      }
    }
    return NextResponse.json({ message: 'no_queued' })
  }

  // Launch specific lines in a campaign
  if (body.campaignId && body.lineIds && Array.isArray(body.lineIds)) {
    const campaign = getCampaign(body.campaignId)
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const results = []
    for (const lineId of body.lineIds) {
      const line = (campaign.lines || []).find(l => l.id === lineId)
      if (line) {
        const result = await launchLine(campaign, line)
        results.push(result)
        if (body.lineIds.length > 1) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }
    return NextResponse.json({ results })
  }

  // Legacy: launch by campaign IDs (old format compat)
  if (body.ids && Array.isArray(body.ids)) {
    const campaigns = getCampaigns()
    const results = []
    for (const id of body.ids) {
      const campaign = campaigns.find(c => c.id === id)
      if (campaign) {
        const queuedLines = (campaign.lines || []).filter(l => l.status === 'queued' || l.status === 'draft')
        for (const line of queuedLines) {
          const result = await launchLine(campaign, line)
          results.push({ ...result, company: campaign.name })
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }
    return NextResponse.json({ results })
  }

  return NextResponse.json({ error: 'campaignId + lineIds, ids, or mode required' }, { status: 400 })
}
