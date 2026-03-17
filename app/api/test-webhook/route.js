import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getWebhookUrl } from '@/lib/webhooks'

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { branch } = await request.json()
  const url = getWebhookUrl(branch)

  if (!url) {
    return NextResponse.json({ ok: false, configured: false, message: 'Webhook non configure dans les variables d\'environnement.' })
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, branch, source: 'H-TIC-Launcher' }),
    })
    return NextResponse.json({ ok: res.ok, configured: true, status: res.status })
  } catch (err) {
    return NextResponse.json({ ok: false, configured: true, message: err.message })
  }
}
