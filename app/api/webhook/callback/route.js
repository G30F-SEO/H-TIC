import { NextResponse } from 'next/server'
import { updateLine, addHistoryEntry } from '@/lib/db'
import { logger } from '@/lib/logger'

// Webhook callback from Make.com
// Make sends: { campaignId, lineId, status: 'done'|'error', error?, data? }
export async function POST(request) {
  try {
    const body = await request.json()
    const { campaignId, lineId, status, error, data } = body

    if (!campaignId || !lineId) {
      return NextResponse.json({ error: 'campaignId and lineId required' }, { status: 400 })
    }

    const validStatuses = ['done', 'error']
    const lineStatus = validStatuses.includes(status) ? status : 'done'

    const updates = {
      status: lineStatus,
      completedAt: new Date().toISOString(),
    }
    if (error) updates.error = error
    if (data) updates.makeData = data

    const updated = updateLine(campaignId, lineId, updates)
    if (!updated) {
      logger.warn(`Webhook callback: ligne introuvable ${lineId} (campagne ${campaignId})`)
      return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    }

    addHistoryEntry({
      type: 'webhook_callback',
      campaignId,
      lineId,
      status: lineStatus,
      error: error || null,
      receivedAt: new Date().toISOString(),
    })

    logger.info(`Webhook callback: ligne ${lineId} -> ${lineStatus}`, {
      campaignId, lineId, status: lineStatus, error: error || null,
    })

    return NextResponse.json({ ok: true, status: lineStatus })
  } catch (err) {
    logger.error(`Webhook callback erreur: ${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
