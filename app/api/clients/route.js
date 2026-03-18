import { NextResponse } from 'next/server'
import { ensureLoaded, getClients, addClient, updateClient, deleteClients } from '@/lib/db'

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
  await deleteClients(ids)
  return NextResponse.json({ ok: true })
}
