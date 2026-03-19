import { NextResponse } from 'next/server'
import { ensureLoaded, getClient, updateClient } from '@/lib/db'
import { provisionClient, deprovisionClient, isMakeConfigured } from '@/lib/make-api'

// POST — reprovision a client's Make.com scenario
export async function POST(request) {
  await ensureLoaded()
  const { clientId } = await request.json()
  if (!clientId) return NextResponse.json({ error: 'clientId requis' }, { status: 400 })

  if (!isMakeConfigured()) {
    return NextResponse.json({ error: 'Make.com API non configuree' }, { status: 400 })
  }

  const client = getClient(clientId)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })

  // Deprovision existing if any
  await deprovisionClient(client)

  // Reprovision
  const makeData = await provisionClient(`${client.firstName} ${client.lastName}`)
  if (makeData?.error) {
    return NextResponse.json({ error: `Echec du provisioning: ${makeData.error}` }, { status: 500 })
  }
  if (!makeData) {
    return NextResponse.json({ error: 'Echec du provisioning Make.com' }, { status: 500 })
  }

  await updateClient(clientId, makeData)
  return NextResponse.json({ ok: true, ...makeData })
}
