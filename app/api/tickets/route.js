import { NextResponse } from 'next/server'
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

// GET all tickets (admin)
export async function GET() {
  await ensureLoaded()
  const tickets = getTickets().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  return NextResponse.json(tickets)
}

// PUT — reply to a ticket or change status
export async function PUT(request) {
  await ensureLoaded()
  const { id, message, status } = await request.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const tickets = getTickets()
  const idx = tickets.findIndex(t => t.id === id)
  if (idx === -1) return NextResponse.json({ error: 'Ticket introuvable' }, { status: 404 })

  if (message) {
    tickets[idx].messages.push({
      from: 'admin',
      text: message,
      at: new Date().toISOString(),
    })
    tickets[idx].status = 'answered'
  }

  if (status) {
    tickets[idx].status = status
  }

  tickets[idx].updatedAt = new Date().toISOString()
  saveTickets(tickets)

  return NextResponse.json(tickets[idx])
}

// DELETE — delete ticket(s)
export async function DELETE(request) {
  await ensureLoaded()
  const { ids } = await request.json()
  if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'ids requis' }, { status: 400 })

  const tickets = getTickets().filter(t => !ids.includes(t.id))
  saveTickets(tickets)

  return NextResponse.json({ ok: true })
}
