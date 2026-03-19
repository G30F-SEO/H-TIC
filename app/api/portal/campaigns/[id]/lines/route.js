import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getCampaign, addLine, updateLine, deleteLines, ensureLoaded } from '@/lib/db'

async function verifyCampaignOwnership(request, campaignId) {
  const client = await verifyClientRequest(request)
  if (!client) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }

  await ensureLoaded()
  const campaign = getCampaign(campaignId)
  if (!campaign || campaign.clientId !== client.id) {
    return { error: NextResponse.json({ error: 'Campagne introuvable' }, { status: 404 }) }
  }
  return { client, campaign }
}

export async function GET(request, { params }) {
  const { id } = await params
  const result = await verifyCampaignOwnership(request, id)
  if (result.error) return result.error
  return NextResponse.json(result.campaign.lines || [])
}

export async function POST(request, { params }) {
  const { id } = await params
  const result = await verifyCampaignOwnership(request, id)
  if (result.error) return result.error

  const data = await request.json()
  const line = await addLine(id, data)
  if (!line) return NextResponse.json({ error: 'Erreur ajout ligne' }, { status: 500 })
  return NextResponse.json(line)
}

export async function PUT(request, { params }) {
  const { id } = await params
  const result = await verifyCampaignOwnership(request, id)
  if (result.error) return result.error

  const { lineId, ...updates } = await request.json()
  if (!lineId) return NextResponse.json({ error: 'lineId required' }, { status: 400 })
  const line = await updateLine(id, lineId, updates)
  if (!line) return NextResponse.json({ error: 'Ligne introuvable' }, { status: 404 })
  return NextResponse.json(line)
}

export async function DELETE(request, { params }) {
  const { id } = await params
  const result = await verifyCampaignOwnership(request, id)
  if (result.error) return result.error

  const { lineIds } = await request.json()
  if (!lineIds || !Array.isArray(lineIds)) return NextResponse.json({ error: 'lineIds required' }, { status: 400 })
  await deleteLines(id, lineIds)
  return NextResponse.json({ ok: true })
}
