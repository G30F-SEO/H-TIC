import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getLogs, clearLogs, ensureLoaded } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureLoaded()
  return NextResponse.json(getLogs())
}

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await ensureLoaded()
  await clearLogs()
  return NextResponse.json({ ok: true })
}
