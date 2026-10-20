import type { QueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import {
  nftUpdatedEventSchema,
  orderUpdatedEventSchema,
  socketEvents,
  type Nft,
  type NftUpdatedEvent,
  type Order,
  type OrderUpdatedEvent,
} from '@/api/contracts'
import { queryKeys, userOwner, guestOwner, type Owner } from '@/api/query-keys'
import { getGuestId, getSessionToken } from '@/api/session-storage'

export type RealtimeActivity =
  | { kind: 'connected' | 'disconnected' | 'reconnected' }
  | {
      kind: 'applied' | 'duplicate' | 'stale' | 'foreign-user' | 'invalid'
      eventName: string
      eventId?: string
      resource?: string
      version?: number
    }

type Listener = (activity: RealtimeActivity) => void

const MAX_REMEMBERED_EVENTS = 500

export type RealtimeOptions = {
  queryClient: QueryClient
  userId: string | null
  url?: string
}

// Um cliente por sessão: ao trocar de usuário o anterior é destruído (socket, listeners e versões vistas).
export class RealtimeClient {
  private socket: Socket | null = null
  private readonly listeners = new Set<Listener>()
  private readonly seenEventIds = new Set<string>()
  private readonly lastVersions = new Map<string, number>()
  private hasConnectedBefore = false
  private readonly owner: Owner

  constructor(private readonly options: RealtimeOptions) {
    this.owner = options.userId ? userOwner(options.userId) : guestOwner(getGuestId())
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  start() {
    if (this.socket) return
    // Sem long-polling: o binding do MSW só intercepta o transporte WebSocket.
    const socket = io(this.options.url ?? window.location.origin, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 2000,
    })
    this.socket = socket

    socket.on('connect', () => {
      socket.emit(socketEvents.subscribe, { token: getSessionToken() })
      if (this.hasConnectedBefore) {
        this.notify({ kind: 'reconnected' })
        this.reconcile()
      } else {
        this.notify({ kind: 'connected' })
      }
      this.hasConnectedBefore = true
    })
    socket.on('disconnect', () => this.notify({ kind: 'disconnected' }))
    socket.on(socketEvents.nftUpdated, (payload: unknown) => this.handleNft(payload))
    socket.on(socketEvents.orderUpdated, (payload: unknown) => this.handleOrder(payload))
  }

  stop() {
    this.socket?.removeAllListeners()
    this.socket?.disconnect()
    this.socket = null
    this.listeners.clear()
    this.seenEventIds.clear()
    this.lastVersions.clear()
  }

  // Depois de uma queda, os eventos perdidos não voltam: a API REST é a fonte da verdade.
  private reconcile() {
    const { queryClient } = this.options
    void queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all })
    void queryClient.invalidateQueries({ queryKey: queryKeys.private(this.owner).root })
  }

  private notify(activity: RealtimeActivity) {
    for (const listener of this.listeners) listener(activity)
  }

  // Retorna true se o evento é novo e mais recente que o último aplicado para o recurso.
  private accept(eventName: string, event: { eventId: string; resource: { type: string; id: string }; version: number }) {
    const resource = `${event.resource.type}:${event.resource.id}`
    const info = { eventName, eventId: event.eventId, resource, version: event.version }

    if (this.seenEventIds.has(event.eventId)) {
      this.notify({ kind: 'duplicate', ...info })
      return false
    }
    this.seenEventIds.add(event.eventId)
    if (this.seenEventIds.size > MAX_REMEMBERED_EVENTS) {
      const oldest = this.seenEventIds.values().next().value
      if (oldest) this.seenEventIds.delete(oldest)
    }

    if (event.version <= (this.lastVersions.get(resource) ?? 0)) {
      this.notify({ kind: 'stale', ...info })
      return false
    }
    this.lastVersions.set(resource, event.version)
    return true
  }

  private handleNft(payload: unknown) {
    const parsed = nftUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return this.notify({ kind: 'invalid', eventName: socketEvents.nftUpdated })
    const event = parsed.data
    if (!this.accept(socketEvents.nftUpdated, event)) return

    this.applyNft(event)
    this.notify({
      kind: 'applied',
      eventName: socketEvents.nftUpdated,
      eventId: event.eventId,
      resource: `nft:${event.resource.id}`,
      version: event.version,
    })
  }

  private applyNft(event: NftUpdatedEvent) {
    const { queryClient } = this.options
    const patch = (nft: Nft): Nft =>
      nft.version >= event.version
        ? nft
        : {
            ...nft,
            priceEth: event.data.priceEth,
            available: event.data.available,
            editions: event.data.editions,
            version: event.version,
          }

    queryClient.setQueryData<Nft>(queryKeys.nfts.detail(event.resource.id), (nft) => (nft ? patch(nft) : nft))
    queryClient.setQueriesData<{ items: Nft[] }>({ queryKey: queryKeys.nfts.lists }, (list) =>
      list ? { ...list, items: list.items.map((nft) => (nft.id === event.resource.id ? patch(nft) : nft)) } : list,
    )
    // Carrinho e cotação dependem de preço e estoque: a API recalcula os totais.
    const keys = queryKeys.private(this.owner)
    void queryClient.invalidateQueries({ queryKey: keys.cartRoot })
    void queryClient.invalidateQueries({ queryKey: keys.quote })
  }

  private handleOrder(payload: unknown) {
    const parsed = orderUpdatedEventSchema.safeParse(payload)
    if (!parsed.success) return this.notify({ kind: 'invalid', eventName: socketEvents.orderUpdated })
    const event = parsed.data

    if (!event.userId || event.userId !== this.options.userId) {
      return this.notify({ kind: 'foreign-user', eventName: socketEvents.orderUpdated, eventId: event.eventId })
    }
    if (!this.accept(socketEvents.orderUpdated, event)) return

    this.applyOrder(event)
    this.notify({
      kind: 'applied',
      eventName: socketEvents.orderUpdated,
      eventId: event.eventId,
      resource: `order:${event.resource.id}`,
      version: event.version,
    })
  }

  private applyOrder(event: OrderUpdatedEvent) {
    const { queryClient } = this.options
    const keys = queryKeys.private(this.owner)
    queryClient.setQueryData<Order>(keys.order(event.resource.id), (order) =>
      order && order.version < event.version
        ? { ...order, ...event.data, version: event.version }
        : order,
    )
    void queryClient.invalidateQueries({ queryKey: keys.order(event.resource.id) })
    void queryClient.invalidateQueries({ queryKey: keys.orders })
    if (event.data.status === 'confirmed') void queryClient.invalidateQueries({ queryKey: keys.cartRoot })
  }
}
