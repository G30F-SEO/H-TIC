import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getCampaigns, addCampaign, updateCampaign, deleteCampaigns, saveCampaigns } from '@/lib/db'

export async function GET(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = getCampaigns().filter(c => c.clientId === client.id)
  return NextResponse.json(campaigns)
}

export async function POST(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const data = await request.json()
  const campaign = await addCampaign({ ...data, clientId: client.id })
  return NextResponse.json(campaign)
}

export async function PUT(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await request.json()
  // Verify campaign belongs to client
  const campaign = getCampaigns().find(c => c.id === id && c.clientId === client.id)
  if (!campaign) return NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 })

  const updated = await updateCampaign(id, updates)
  return NextResponse.json(updated)
}

export async function DELETE(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await request.json()
  // Only delete campaigns belonging to this client
  const campaigns = getCampaigns()
  const clientCampIds = campaigns.filter(c => ids.includes(c.id) && c.clientId === client.id).map(c => c.id)
  await deleteCampaigns(clientCampIds)
  return NextResponse.json({ ok: true })
}
