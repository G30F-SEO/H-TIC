import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getHistory, clearHistory } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(getHistory())
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  clearHistory()
  return NextResponse.json({ ok: true })
}
