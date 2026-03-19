import { NextResponse } from 'next/server'
import { ensureLoaded, getClients, getClient, addClient, updateClient, deleteClients } from '@/lib/db'
import { provisionClient, deprovisionClient, isMakeConfigured } from '@/lib/make-api'

export async function GET() {
  await ensureLoaded()
  return NextResponse.json(getClients())
}

export async function POST(request) {
  await ensureLoaded()
  const data = await request.json()
  if (!data.firstName || !data.lastName) {
    return NextResponse.json({ error: 'Nom et prénom requis' }, { status: 400 })
  }
  const client = await addClient(data)

  // Auto-provision Make.com scenario if configured
  if (isMakeConfigured()) {
    const makeData = await provisionClient(`${data.firstName} ${data.lastName}`)
    if (makeData) {
      await updateClient(client.id, makeData)
      Object.assign(client, makeData)
    }
  }

  return NextResponse.json(client)
}

export async function PUT(request) {
  await ensureLoaded()
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })
  const client = await updateClient(id, updates)
  if (!client) return NextResponse.json({ error: 'Client introuvable' }, { status: 404 })
  return NextResponse.json(client)
}

export async function DELETE(request) {
  await ensureLoaded()
  const { ids } = await request.json()
  if (!ids?.length) return NextResponse.json({ error: 'IDs requis' }, { status: 400 })

  // Deprovision Make.com scenarios before deleting
  if (isMakeConfigured()) {
    for (const id of ids) {
      const client = getClient(id)
      if (client) await deprovisionClient(client)
    }
  }

  await deleteClients(ids)
  return NextResponse.json({ ok: true })
}
