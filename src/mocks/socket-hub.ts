import { socketEvents } from '@/api/contracts'
import { subscribeToEvents } from './events'

export type HubConnection = {
  id: string
  userId: string | null
  subscribed: boolean
  send: (event: string, payload: unknown) => void
  close: () => void
}

const connections = new Set<HubConnection>()

export function registerConnection(connection: HubConnection) {
  connections.add(connection)
  return () => {
    connections.delete(connection)
  }
}

export function disconnectAll() {
  for (const connection of [...connections]) connection.close()
}

export function connectionCount() {
  return connections.size
}

// Eventos privados só saem para o dono; os públicos vão para todos os conectados.
subscribeToEvents((event) => {
  const { type, ...payload } = event
  const name = type === 'nft.updated' ? socketEvents.nftUpdated : socketEvents.orderUpdated
  for (const connection of connections) {
    if (!connection.subscribed) continue
    if (payload.userId && payload.userId !== connection.userId) continue
    connection.send(name, payload)
  }
})
