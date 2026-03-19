import { NextResponse } from 'next/server'
import { verifyClientRequest } from '@/lib/portal-auth'
import { ensureLoaded } from '@/lib/db'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

const TICKETS_FILE = path.join('/tmp/htic-data', 'tickets.json')

function getTickets() {
  if (!existsSync(TICKETS_FILE)) return []
  try { return JSON.parse(readFileSync(TICKETS_FILE, 'utf-8')) } catch { return [] }
}

function saveTickets(tickets) {
  writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2))
}

function uid() {
  return 'tk-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export async function GET(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureLoaded()
  const tickets = getTickets().filter(t => t.clientId === client.id)
  return NextResponse.json(tickets)
}

export async function POST(request) {
  const client = await verifyClientRequest(request)
  if (!client) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureLoaded()
  const { subject, message } = await request.json()
  if (!subject || !message) {
    return NextResponse.json({ error: 'Sujet et message requis' }, { status: 400 })
  }

  const ticket = {
    id: uid(),
    clientId: client.id,
    clientName: `${client.firstName} ${client.lastName}`,
    subject,
    status: 'open',
    messages: [
      { from: 'client', text: message, at: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  const tickets = getTickets()
  tickets.push(ticket)
  saveTickets(tickets)

  return NextResponse.json(ticket)
}
