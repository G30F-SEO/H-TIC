import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getCampaigns, saveCampaigns, addLog } from '@/lib/db'

// POST /api/campaigns/reset-processing — Reset all stuck "processing" lines back to "draft"
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const campaigns = getCampaigns()
  let resetCount = 0

  for (const campaign of campaigns) {
    for (const line of campaign.lines) {
      if (line.status === 'processing') {
        line.status = 'draft'
        line.error = null
        resetCount++
      }
    }
  }

  if (resetCount > 0) {
    saveCampaigns(campaigns)
    addLog('info', `Reset ${resetCount} ligne(s) bloquee(s) en "processing" → "draft"`)
  }

  return NextResponse.json({ ok: true, resetCount })
}
