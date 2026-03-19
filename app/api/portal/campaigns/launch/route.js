import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getCampaigns, getCampaign, updateLine, addHistoryEntry, useCredit, ensureLoaded } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

function buildPayload(campaign, line, client) {
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
    source: 'H-TIC-Client-Portal',
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    campaignId: campaign.id,
    lineId: line.id,
    sentAt: new Date().toISOString(),
    callback_url: `${process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000'}/api/webhook/callback`,
  }

  const info = campaign.info || {}
  const infoFields = ['context', 'b2b_target', 'b2b_offer', 'b2b_value', 'b2c_target', 'b2c_experience', 'b2c_ambiance', 'personas', 'services', 'geo_location', 'geo_zone', 'geo_environment', 'style_approach', 'style_relation', 'style_objective', 'style_vocabulary', 'style_promises', 'style_structure', 'style_storytelling', 'style_engagement', 'style_verb_tense', 'reviews', 'extra_info']
  for (const f of infoFields) {
    if (info[f]) payload[f] = info[f]
  }

  return payload
}

async function launchLine(campaign, line, client) {
  const webhookUrl = client.webhookUrl || getWebhookUrl(campaign.branch)
  if (!webhookUrl) {
    const error = 'Webhook non configure. Contactez H-TIC.'
    await updateLine(campaign.id, line.id, { status: 'error', error, completedAt: new Date().toISOString() })
    return { id: line.id, status: 'error', error }
  }

  // Check credits
  const creditsLeft = client.credits - client.creditsUsed
  if (creditsLeft <= 0) {
    const error = 'Plus de credits disponibles'
    await updateLine(campaign.id, line.id, { status: 'error', error, completedAt: new Date().toISOString() })
    return { id: line.id, status: 'error', error }
  }

  await updateLine(campaign.id, line.id, { status: 'processing' })
  const payload = buildPayload(campaign, line, client)

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const now = new Date().toISOString()

    if (res.ok) {
      await useCredit(client.id)
      await updateLine(campaign.id, line.id, { status: 'processing', launchedAt: now, error: null, makeStatus: res.status })
      await addHistoryEntry({
        branch: campaign.branch, company: campaign.name,
        keyword_main: line.keyword_main, url: line.url,
        status: 'sent', makeStatus: res.status, error: null,
        payload, campaignId: campaign.id, lineId: line.id,
        clientId: client.id, clientName: `${client.firstName} ${client.lastName}`,
      })
      logger.success(`[Client: ${client.firstName}] Ligne "${line.keyword_main}" lancee`, { campaignId: campaign.id, lineId: line.id, clientId: client.id })
      return { id: line.id, status: 'processing' }
    } else {
      const error = `HTTP ${res.status} depuis Make`
      await updateLine(campaign.id, line.id, { status: 'error', error, makeStatus: res.status, completedAt: now })
      await addHistoryEntry({
        branch: campaign.branch, company: campaign.name,
        keyword_main: line.keyword_main, url: line.url,
        status: 'error', makeStatus: res.status, error,
        payload, campaignId: campaign.id, lineId: line.id,
        clientId: client.id,
      })
      return { id: line.id, status: 'error', error }
    }
  } catch (err) {
    const error = err.message
    await updateLine(campaign.id, line.id, { status: 'error', error, completedAt: new Date().toISOString() })
    await addHistoryEntry({
      branch: campaign.branch, company: campaign.name,
      keyword_main: line.keyword_main, url: line.url,
      status: 'error', error, payload, campaignId: campaign.id, lineId: line.id,
      clientId: client.id,
    })
    return { id: line.id, status: 'error', error }
  }
}

export async function POST(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureLoaded()
  const body = await request.json()

  // Mode "next": launch next queued line across client's campaigns
  if (body.mode === 'next') {
    const campaigns = getCampaigns().filter(c => c.clientId === client.id)
    for (const camp of campaigns) {
      const nextLine = (camp.lines || []).find(l => l.status === 'queued')
      if (nextLine) {
        const result = await launchLine(camp, nextLine, client)
        return NextResponse.json({ result: { ...result, company: camp.name, keyword_main: nextLine.keyword_main } })
      }
    }
    return NextResponse.json({ message: 'no_queued' })
  }

  // Launch specific lines
  if (body.campaignId && body.lineIds && Array.isArray(body.lineIds)) {
    const campaign = getCampaign(body.campaignId)
    if (!campaign || campaign.clientId !== client.id) {
      return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })
    }

    const results = []
    for (const lineId of body.lineIds) {
      const line = (campaign.lines || []).find(l => l.id === lineId)
      if (line) {
        const result = await launchLine(campaign, line, client)
        results.push(result)
        if (body.lineIds.length > 1) await new Promise(r => setTimeout(r, 2000))
      }
    }
    return NextResponse.json({ results })
  }

  return NextResponse.json({ error: 'campaignId + lineIds or mode required' }, { status: 400 })
}
