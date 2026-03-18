import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getArticles, getArticlesByCampaign, ensureLoaded } from '@/lib/db'

export async function GET(request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureLoaded()

  const { searchParams } = new URL(request.url)
  const campaignId = searchParams.get('campaignId')

  if (campaignId) {
    return NextResponse.json(getArticlesByCampaign(campaignId))
  }
  return NextResponse.json(getArticles())
}
