// Simple in-memory event bus for SSE notifications

const clients = new Set()

export function addClient(controller) {
  clients.add(controller)
}

export function removeClient(controller) {
  clients.delete(controller)
}

export function broadcast(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  for (const controller of clients) {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch {
      clients.delete(controller)
    }
  }
}

export function getClientCount() {
  return clients.size
}
