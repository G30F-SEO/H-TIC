import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getArticles, getCampaigns } from '@/lib/db'

export async function GET(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get all campaign IDs belonging to this client
  const clientCampaignIds = getCampaigns()
    .filter(c => c.clientId === client.id)
    .map(c => c.id)

  // Also include articles launched directly (via quick launch) with this clientId
  const articles = getArticles().filter(a =>
    clientCampaignIds.includes(a.campaignId) || a.clientId === client.id
  )

  return NextResponse.json(articles)
}
