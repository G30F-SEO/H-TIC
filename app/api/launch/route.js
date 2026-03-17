import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWebhookUrl } from '@/lib/webhooks'
import { addHistoryEntry } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = await request.json()
  const { branch } = payload

  if (!branch) return NextResponse.json({ error: 'Branch required' }, { status: 400 })

  const webhookUrl = getWebhookUrl(branch)
  if (!webhookUrl) {
    logger.error(`Webhook non configure pour la branche "${branch}"`, { branch })
    return NextResponse.json({
      error: `Webhook non configure pour la branche "${branch}". Ajoutez WEBHOOK_${branch.toUpperCase()} dans vos variables d'environnement Vercel.`,
    }, { status: 400 })
  }

  let status = 'error'
  let makeResponse = null
  let errorMessage = null

  try {
    const makeRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, source: 'H-TIC-Launcher', sentAt: new Date().toISOString() }),
    })
    status = makeRes.ok ? 'sent' : 'error'
    makeResponse = makeRes.status
    if (!makeRes.ok) errorMessage = `HTTP ${makeRes.status} depuis Make`
  } catch (err) {
    errorMessage = err.message
  }

  const entry = addHistoryEntry({
    branch,
    company: payload.company || 'Inconnu',
    keyword_main: payload.keyword_main || '',
    url: payload.url || '',
    status,
    makeStatus: makeResponse,
    error: errorMessage,
    payload,
  })

  if (status === 'sent') {
    logger.success(`Lancement reussi pour "${payload.company}" (${branch})`, { branch, company: payload.company })
    return NextResponse.json({ ok: true, entry })
  } else {
    logger.error(`Echec lancement pour "${payload.company}" (${branch}): ${errorMessage}`, { branch, company: payload.company, error: errorMessage })
    return NextResponse.json({ error: errorMessage || 'Erreur webhook', entry }, { status: 502 })
  }
}
