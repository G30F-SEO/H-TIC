import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLogs, clearLogs } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(getLogs())
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  clearLogs()
  return NextResponse.json({ ok: true })
}
