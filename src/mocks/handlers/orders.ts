import { delay, HttpResponse } from 'msw'
import { z } from 'zod'
import { collectorSchema, networkSchema, type ReceiptSnapshot } from '@/api/contracts'
import { MockHttpError } from '../http-error'
import { persist } from '../db'
import { requireSession } from '../services/auth'
import { findCart } from '../services/cart'
import { createQuote, findStaleReasons, placeOrder, settleDueOrders, toPublicOrder, toPublicQuote } from '../services/orders'
import { sha256 } from '../services/passwords'
import { parseBody, readJson, route } from './route'

const quoteRequestSchema = z.object({ network: networkSchema })

const orderRequestSchema = z.object({
  quoteId: z.string().min(1),
  walletId: z.string().min(1),
  network: networkSchema,
  collector: collectorSchema,
})

// Serialização com chaves ordenadas: o mesmo conteúdo sempre gera o mesmo hash.
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export const orderHandlers = [
  route('post', '/api/quotes', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const { network } = parseBody(quoteRequestSchema, await readJson(request))
    const cart = findCart(db, { userId: user.id, guestId: '' })
    if (!cart) throw new MockHttpError(422, 'CART_EMPTY', 'O carrinho está vazio.')
    const quote = createQuote(db, user.id, cart, network)
    return HttpResponse.json(toPublicQuote(quote), { status: 201 })
  }),

  route('post', '/api/orders', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    const idempotencyKey = request.headers.get('Idempotency-Key')
    if (!idempotencyKey) {
      throw new MockHttpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'Envie o cabeçalho Idempotency-Key.')
    }
    const body = parseBody(orderRequestSchema, await readJson(request))
    const payloadHash = await sha256(stableStringify(body))

    const previous = db.idempotency[`${user.id}:${idempotencyKey}`]
    if (previous) {
      if (previous.payloadHash !== payloadHash) {
        throw new MockHttpError(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada com outro conteúdo.')
      }
      const existing = db.orders.find((order) => order.id === previous.orderId)
      if (existing) return HttpResponse.json(toPublicOrder(existing), { status: 200 })
    }

    const quote = db.quotes.find((candidate) => candidate.id === body.quoteId)
    if (!quote || quote.userId !== user.id) throw new MockHttpError(404, 'QUOTE_NOT_FOUND', 'Cotação não encontrada.')
    if (quote.orderId) throw new MockHttpError(409, 'QUOTE_ALREADY_USED', 'Esta cotação já gerou um pedido.')
    if (new Date(quote.expiresAt).getTime() <= Date.now()) {
      throw new MockHttpError(409, 'QUOTE_EXPIRED', 'A cotação expirou. Confira os valores novamente.')
    }

    const cart = findCart(db, { userId: user.id, guestId: '' })
    const reasons = findStaleReasons(db, quote, cart)
    if (reasons.length > 0) {
      let currentQuote = null
      if (cart) {
        try {
          currentQuote = toPublicQuote(createQuote(db, user.id, cart, quote.network))
        } catch {
          currentQuote = null
        }
      }
      throw new MockHttpError(409, 'QUOTE_STALE', 'Os valores mudaram desde a cotação. Confirme novamente.', {
        details: { reasons, currentQuote },
      })
    }

    if (body.collector.referralCode.toUpperCase().startsWith('INVALIDO')) {
      throw new MockHttpError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', {
        fieldErrors: { 'collector.referralCode': 'Código de indicação não reconhecido.' },
      })
    }

    const wallet = db.wallets.find((candidate) => candidate.id === body.walletId && candidate.userId === user.id)
    if (!wallet) throw new MockHttpError(404, 'WALLET_NOT_FOUND', 'Carteira não encontrada.')
    if (wallet.connection !== 'connected') {
      throw new MockHttpError(409, 'WALLET_NOT_CONNECTED', 'Conecte a carteira antes de finalizar.')
    }
    if (wallet.network !== body.network || quote.network !== body.network) {
      throw new MockHttpError(422, 'NETWORK_MISMATCH', 'A rede escolhida não corresponde à carteira e à cotação.', {
        fieldErrors: { network: 'Rede incompatível com a carteira selecionada.' },
      })
    }

    const receipt: ReceiptSnapshot = {
      items: structuredClone(quote.items),
      couponCode: quote.couponCode,
      network: quote.network,
      subtotalEth: quote.subtotalEth,
      discountEth: quote.discountEth,
      networkFeeEth: quote.networkFeeEth,
      totalEth: quote.totalEth,
      walletAddress: wallet.address,
      collector: body.collector,
    }
    const order = placeOrder(db, { userId: user.id, idempotencyKey, payloadHash, quote, walletId: wallet.id, receipt })

    if (db.scenario.hangNextOrderCreate) {
      db.scenario.hangNextOrderCreate = false
      persist()
      await delay('infinite')
    }
    return HttpResponse.json(toPublicOrder(order), { status: 201 })
  }),

  route('get', '/api/orders', async ({ db, request, url }) => {
    const { user } = requireSession(db, request)
    await settleDueOrders(db)
    const key = url.searchParams.get('idempotencyKey')
    const items = db.orders
      .filter((order) => order.userId === user.id && (!key || order.idempotencyKey === key))
      .map(toPublicOrder)
    return { items }
  }),

  route('get', '/api/orders/:id', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    await settleDueOrders(db)
    const order = db.orders.find((candidate) => candidate.id === params.id)
    if (!order) throw new MockHttpError(404, 'ORDER_NOT_FOUND', 'Pedido não encontrado.')
    if (order.userId !== user.id) throw new MockHttpError(403, 'FORBIDDEN', 'Você não tem acesso a este pedido.')
    return { ...toPublicOrder(order) }
  }),
]
