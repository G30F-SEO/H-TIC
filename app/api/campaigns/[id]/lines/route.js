import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCampaign, addLine, updateLine, deleteLines } from '@/lib/db'

export async function GET(request, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const campaign = getCampaign(id)
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json(campaign.lines || [])
}

export async function POST(request, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const data = await request.json()
  const line = addLine(id, data)
  if (!line) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  return NextResponse.json(line)
}

export async function PUT(request, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { lineId, ...updates } = await request.json()
  if (!lineId) return NextResponse.json({ error: 'lineId required' }, { status: 400 })
  const line = updateLine(id, lineId, updates)
  if (!line) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(line)
}

export async function DELETE(request, { params }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const { lineIds } = await request.json()
  if (!lineIds || !Array.isArray(lineIds)) return NextResponse.json({ error: 'lineIds required' }, { status: 400 })
  deleteLines(id, lineIds)
  return NextResponse.json({ ok: true })
}
