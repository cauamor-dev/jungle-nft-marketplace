import type { Nft, NftUpdatedEvent, Order } from '@/api/contracts'
import { nextId, nowIso, persist, type DbState, type OrderRecord, type StoredEvent } from './db'

type Listener = (event: StoredEvent) => void

const listeners = new Set<Listener>()
const MAX_LOGGED_EVENTS = 200

export function subscribeToEvents(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function emit(event: StoredEvent) {
  for (const listener of listeners) listener(event)
}

function record(db: DbState, event: StoredEvent) {
  db.events.push(event)
  if (db.events.length > MAX_LOGGED_EVENTS) db.events.shift()
  persist()
  emit(event)
}

export function publishNftUpdated(db: DbState, nft: Nft) {
  record(db, {
    type: 'nft.updated',
    eventId: nextId(db, 'evt'),
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    data: { priceEth: nft.priceEth, available: nft.available, editions: nft.editions },
  })
}

export function publishOrderUpdated(db: DbState, order: Order | OrderRecord) {
  record(db, {
    type: 'order.updated',
    eventId: nextId(db, 'evt'),
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    userId: order.userId,
    data: {
      status: order.status,
      txReference: order.txReference,
      rejectionReason: order.rejectionReason,
    },
  })
}

// Reenvia o mesmo evento (mesmo eventId) para exercitar a deduplicação no cliente.
export function replayEvent(event: StoredEvent) {
  emit(event)
}

// Reenvia uma versão anterior do recurso com um novo eventId, como um evento atrasado na rede.
export function replayOlderEvent(db: DbState, resource: NftUpdatedEvent['resource']) {
  const history = db.events.filter((event) => event.resource.type === resource.type && event.resource.id === resource.id)
  const older = history.at(-2)
  if (!older) return null
  const stale = { ...older, eventId: nextId(db, 'evt') } as StoredEvent
  persist()
  emit(stale)
  return stale
}
