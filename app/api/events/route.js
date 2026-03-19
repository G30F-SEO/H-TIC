import { addClient, removeClient } from '@/lib/events'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  let controller

  const stream = new ReadableStream({
    start(c) {
      controller = c
      addClient(controller)
      // Send initial connection event
      controller.enqueue(new TextEncoder().encode('event: connected\ndata: {}\n\n'))
    },
    cancel() {
      removeClient(controller)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
