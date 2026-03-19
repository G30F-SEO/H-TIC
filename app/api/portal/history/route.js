import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { getHistory } from '@/lib/db'

export async function GET(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const history = getHistory().filter(h => h.clientId === client.id)
  return NextResponse.json(history)
}
