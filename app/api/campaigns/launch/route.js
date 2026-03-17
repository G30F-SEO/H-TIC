import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCampaigns, updateCampaign, addHistoryEntry } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

async function launchCampaign(campaign) {
  const webhookUrl = getWebhookUrl(campaign.branch)
  if (!webhookUrl) {
    const error = `Webhook non configure pour "${campaign.branch}"`
    logger.error(error, { campaignId: campaign.id, branch: campaign.branch })
    return { ...campaign, status: 'error', error, completedAt: new Date().toISOString() }
  }

  // Mark as processing
  updateCampaign(campaign.id, { status: 'processing' })

  const payload = {
    branch: campaign.branch,
    company: campaign.company,
    url: campaign.url,
    city: campaign.city,
    sector: campaign.sector,
    description: campaign.description || '',
    keyword_main: campaign.keyword_main,
    keywords_secondary: campaign.keywords_sec || '',
    intent: campaign.intent || '',
    h1: campaign.h1 || '',
    word_count: campaign.word_count || '1200',
    tone: campaign.tone || 'expert',
    language: campaign.lang || 'fr',
    extra_instructions: campaign.extra || '',
    // E-commerce
    product_name: campaign.product_name || '',
    product_price: campaign.product_price || '',
    product_ref: campaign.product_ref || '',
    // Catalogue
    cat_product: campaign.cat_product || '',
    cat_ref: campaign.cat_ref || '',
    cat_specs: campaign.cat_specs || '',
    // Meta
    source: 'H-TIC-Launcher',
    campaignId: campaign.id,
    sentAt: new Date().toISOString(),
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()

    if (res.ok) {
      const updated = updateCampaign(campaign.id, {
        status: 'done',
        launchedAt: now,
        completedAt: now,
        error: null,
        makeStatus: res.status,
      })
      addHistoryEntry({
        branch: campaign.branch,
        company: campaign.company,
        keyword_main: campaign.keyword_main,
        url: campaign.url,
        status: 'sent',
        makeStatus: res.status,
        error: null,
        payload,
        campaignId: campaign.id,
      })
      logger.success(`Campagne "${campaign.company}" lancee (${campaign.branch})`, {
        campaignId: campaign.id,
        makeStatus: res.status,
      })
      return { ...updated, status: 'done' }
    } else {
      const error = `HTTP ${res.status} depuis Make`
      const updated = updateCampaign(campaign.id, {
        status: 'error',
        error,
        makeStatus: res.status,
        completedAt: now,
      })
      addHistoryEntry({
        branch: campaign.branch,
        company: campaign.company,
        keyword_main: campaign.keyword_main,
        url: campaign.url,
        status: 'error',
        makeStatus: res.status,
        error,
        payload,
        campaignId: campaign.id,
      })
      logger.error(`Campagne "${campaign.company}" echouee: ${error}`, { campaignId: campaign.id })
      return { ...updated, status: 'error', error }
    }
  } catch (err) {
    const error = err.message
    const updated = updateCampaign(campaign.id, {
      status: 'error',
      error,
      completedAt: new Date().toISOString(),
    })
    addHistoryEntry({
      branch: campaign.branch,
      company: campaign.company,
      keyword_main: campaign.keyword_main,
      url: campaign.url,
      status: 'error',
      error,
      payload,
      campaignId: campaign.id,
    })
    logger.error(`Campagne "${campaign.company}" erreur reseau: ${error}`, { campaignId: campaign.id })
    return { ...updated, status: 'error', error }
  }
}

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Mode "next" : lance la prochaine campagne en file
  if (body.mode === 'next') {
    const campaigns = getCampaigns()
    const next = campaigns.find(c => c.status === 'queued')
    if (!next) {
      return NextResponse.json({ message: 'no_queued' })
    }
    const result = await launchCampaign(next)
    return NextResponse.json({ result })
  }

  // Mode batch : lancer des IDs specifiques
  if (body.ids && Array.isArray(body.ids)) {
    const campaigns = getCampaigns()
    const results = []
    for (const id of body.ids) {
      const campaign = campaigns.find(c => c.id === id)
      if (campaign) {
        const result = await launchCampaign(campaign)
        results.push(result)
        // Pause between launches to not overwhelm Make
        if (body.ids.length > 1) {
          await new Promise(r => setTimeout(r, 2000))
        }
      }
    }
    return NextResponse.json({ results })
  }

  return NextResponse.json({ error: 'ids or mode required' }, { status: 400 })
}
