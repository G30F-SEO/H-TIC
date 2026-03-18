import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCampaigns, addCampaign, updateCampaign, deleteCampaigns, syncAllFromKV } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Ensure KV data is loaded on cold start before reading
  await syncAllFromKV()
  return NextResponse.json(getCampaigns())
}

export async function POST(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const data = await request.json()
  const campaign = addCampaign(data)
  return NextResponse.json(campaign)
}

export async function PUT(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, ...updates } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })
  const campaign = updateCampaign(id, updates)
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(campaign)
}

export async function DELETE(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { ids } = await request.json()
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'IDs required' }, { status: 400 })
  deleteCampaigns(ids)
  return NextResponse.json({ ok: true })
}
