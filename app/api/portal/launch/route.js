import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { ensureLoaded, getClient, useCredit, addHistoryEntry } from '@/lib/db'
import { getWebhookUrl } from '@/lib/webhooks'
import { logger } from '@/lib/logger'

function getSecret() {
  const secret = process.env.JWT_SECRET || 'htic-auto-secret-' + (process.env.APP_PASSWORD || 'default')
  return new TextEncoder().encode(secret)
}

export async function POST(request) {
  // Verify client session
  const token = request.cookies.get('htic_client_session')?.value
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let payload
  try {
    const { payload: p } = await jwtVerify(token, getSecret())
    if (p.role !== 'client') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    payload = p
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureLoaded()
  const client = getClient(payload.clientId)
  if (!client || !client.active) {
    return NextResponse.json({ error: 'Compte client inactif ou introuvable' }, { status: 403 })
  }

  // Check credits
  const creditsLeft = client.credits - client.creditsUsed
  if (creditsLeft <= 0) {
    return NextResponse.json({ error: 'Plus de credits disponibles' }, { status: 403 })
  }

  const body = await request.json()
  const { branch } = body

  if (!branch) return NextResponse.json({ error: 'Branch required' }, { status: 400 })

  // Use client webhook if set, otherwise fall back to global
  const webhookUrl = client.webhookUrl || getWebhookUrl(branch)
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Webhook non configure. Contactez H-TIC.' }, { status: 400 })
  }

  let status = 'error'
  let makeResponse = null
  let errorMessage = null

  try {
    const makeRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...body,
        clientId: client.id,
        clientName: `${client.firstName} ${client.lastName}`,
        source: 'H-TIC-Client-Portal',
        sentAt: new Date().toISOString(),
      }),
    })
    status = makeRes.ok ? 'sent' : 'error'
    makeResponse = makeRes.status
    if (!makeRes.ok) errorMessage = `HTTP ${makeRes.status} depuis Make`
  } catch (err) {
    errorMessage = err.message
  }

  // Deduct credit only on successful send
  if (status === 'sent') {
    await useCredit(client.id)
  }

  const entry = await addHistoryEntry({
    branch,
    company: body.company || 'Inconnu',
    keyword_main: body.keyword_main || '',
    url: body.url || '',
    status,
    makeStatus: makeResponse,
    error: errorMessage,
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    payload: body,
  })

  if (status === 'sent') {
    logger.success(`[Client: ${client.firstName} ${client.lastName}] Lancement reussi pour "${body.company}" (${branch})`, { branch, clientId: client.id })
    return NextResponse.json({ ok: true, entry })
  } else {
    logger.error(`[Client: ${client.firstName} ${client.lastName}] Echec lancement: ${errorMessage}`, { branch, clientId: client.id, error: errorMessage })
    return NextResponse.json({ error: errorMessage || 'Erreur webhook', entry }, { status: 502 })
  }
}
