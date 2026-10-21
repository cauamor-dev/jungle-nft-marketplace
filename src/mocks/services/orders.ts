import type { Network, Quote, ReceiptSnapshot } from '@/api/contracts'
import { canTransition } from '@/domain/order'
import { editionPriceEth } from '@/domain/editions'
import { multiplyEth } from '@/domain/money'
import { nextId, nowIso, persist, type CartRecord, type DbState, type OrderRecord, type QuoteRecord } from '../db'
import { publishNftUpdated, publishOrderUpdated } from '../events'
import { MockHttpError } from '../http-error'
import { availableQuantity, buildCartView, findNftAndEdition, lineKey, touch } from './cart'
import { computeTotals, evaluateCoupon } from './pricing'
import { sha256 } from './passwords'

const QUOTE_TTL_MS = 5 * 60 * 1000

export type StaleReason = 'CART_CHANGED' | 'PRICE_CHANGED' | 'AVAILABILITY_CHANGED' | 'COUPON_CHANGED' | 'FEE_CHANGED'

export function createQuote(db: DbState, userId: string, cart: CartRecord, network: Network): QuoteRecord {
  if (cart.lines.length === 0) throw new MockHttpError(422, 'CART_EMPTY', 'O carrinho está vazio.')

  const coupon = evaluateCoupon(db, cart.couponCode)
  if (coupon.status === 'invalid' || coupon.status === 'expired') {
    const message = coupon.status === 'expired' ? 'O cupom expirou.' : 'Cupom inválido.'
    throw new MockHttpError(422, coupon.status === 'expired' ? 'COUPON_EXPIRED' : 'COUPON_INVALID', message)
  }

  const items = cart.lines.map((line) => {
    const found = findNftAndEdition(db, line.nftId, line.editionId)
    if (!found) throw new MockHttpError(404, 'NFT_NOT_FOUND', 'Um item do carrinho não existe mais.')
    const { nft, edition } = found
    if (edition.stock === 0) {
      throw new MockHttpError(409, 'EDITION_SOLD_OUT', `${nft.title} (${edition.label}) está esgotada.`, {
        details: { nftId: nft.id, editionId: edition.id },
      })
    }
    if (line.quantity > availableQuantity(edition)) {
      throw new MockHttpError(409, 'QUANTITY_LIMIT', `Quantidade acima do disponível para ${nft.title}.`, {
        details: { nftId: nft.id, editionId: edition.id, max: availableQuantity(edition) },
      })
    }
    return {
      nftId: nft.id,
      editionId: edition.id,
      title: nft.title,
      editionLabel: edition.label,
      quantity: line.quantity,
      unitPriceEth: editionPriceEth(nft.priceEth, edition),
      lineTotalEth: multiplyEth(editionPriceEth(nft.priceEth, edition), line.quantity),
      nftVersion: nft.version,
    }
  })

  const createdAt = Date.now()
  const quote: QuoteRecord = {
    id: nextId(db, 'quote'),
    userId,
    orderId: null,
    cartVersion: cart.version,
    couponCode: cart.couponCode,
    network,
    items,
    ...computeTotals(items, coupon, network),
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + QUOTE_TTL_MS).toISOString(),
  }
  db.quotes.push(quote)
  persist()
  return quote
}

export function toPublicQuote(quote: QuoteRecord): Quote {
  const { userId: _userId, orderId: _orderId, ...publicQuote } = quote
  return publicQuote
}

// Compara a cotação com o estado atual do carrinho e do catálogo. Qualquer diferença exige nova confirmação.
export function findStaleReasons(db: DbState, quote: QuoteRecord, cart: CartRecord | undefined): StaleReason[] {
  const reasons = new Set<StaleReason>()
  if (!cart || cart.version !== quote.cartVersion) reasons.add('CART_CHANGED')

  for (const item of quote.items) {
    const found = findNftAndEdition(db, item.nftId, item.editionId)
    if (!found) {
      reasons.add('AVAILABILITY_CHANGED')
      continue
    }
    if (editionPriceEth(found.nft.priceEth, found.edition) !== item.unitPriceEth) reasons.add('PRICE_CHANGED')
    if (found.edition.stock === 0 || item.quantity > availableQuantity(found.edition)) reasons.add('AVAILABILITY_CHANGED')
  }

  const coupon = evaluateCoupon(db, quote.couponCode)
  if (quote.couponCode && coupon.status !== 'valid') reasons.add('COUPON_CHANGED')
  if (cart) {
    const current = buildCartView(db, cart, quote.network).summary
    if (current.networkFeeEth !== quote.networkFeeEth) reasons.add('FEE_CHANGED')
  }
  return [...reasons]
}

function hasStockFor(db: DbState, quote: Quote) {
  return quote.items.every((item) => {
    const found = findNftAndEdition(db, item.nftId, item.editionId)
    return found !== null && found.edition.stock >= item.quantity
  })
}

function consumeStock(db: DbState, quote: Quote) {
  for (const item of quote.items) {
    const found = findNftAndEdition(db, item.nftId, item.editionId)
    if (!found) continue
    found.edition.stock -= item.quantity
    found.nft.available = found.nft.editions.some((edition) => edition.stock > 0)
    found.nft.version += 1
    publishNftUpdated(db, found.nft)
  }
}

export type PlaceOrderInput = {
  userId: string
  idempotencyKey: string
  payloadHash: string
  quote: QuoteRecord
  walletId: string
  receipt: ReceiptSnapshot
}

export function placeOrder(db: DbState, input: PlaceOrderInput): OrderRecord {
  const { quote } = input
  const createdAt = Date.now()
  const order: OrderRecord = {
    id: nextId(db, 'order'),
    userId: input.userId,
    status: 'pending',
    version: 1,
    quoteId: quote.id,
    idempotencyKey: input.idempotencyKey,
    createdAt: new Date(createdAt).toISOString(),
    settledAt: null,
    txReference: null,
    explorerUrl: null,
    rejectionReason: null,
    receipt: input.receipt,
    payloadHash: input.payloadHash,
    walletId: input.walletId,
    resolveAt: createdAt + db.scenario.paymentDelayMs,
    outcome: db.scenario.payment,
  }
  db.orders.push(order)
  db.idempotency[`${input.userId}:${input.idempotencyKey}`] = { payloadHash: input.payloadHash, orderId: order.id }
  quote.orderId = order.id
  persist()
  publishOrderUpdated(db, order)
  scheduleSettlement(db)
  return order
}

async function settle(db: DbState, order: OrderRecord) {
  const txHash = await sha256(`${order.id}:${order.quoteId}`)
  const quote = db.quotes.find((candidate) => candidate.id === order.quoteId)
  const outOfStock = quote !== undefined && !hasStockFor(db, quote)
  const nextStatus = order.outcome === 'confirmed' && !outOfStock ? 'confirmed' : 'rejected'
  if (!canTransition(order.status, nextStatus)) return

  order.status = nextStatus
  order.version += 1
  order.settledAt = nowIso()

  if (nextStatus === 'confirmed') {
    order.txReference = `0x${txHash}`
    order.explorerUrl = `https://explorer.mock.test/tx/0x${txHash}`
    if (quote) {
      consumeStock(db, quote)
      removePurchasedFromCart(db, order.userId, quote)
    }
  } else {
    order.rejectionReason = outOfStock
      ? 'O estoque acabou antes da confirmação do pagamento.'
      : 'O pagamento foi recusado pela carteira simulada.'
  }
  persist()
  publishOrderUpdated(db, order)
}

function removePurchasedFromCart(db: DbState, userId: string, quote: Quote) {
  const cart = db.carts.find((candidate) => candidate.ownerKey === `user:${userId}`)
  if (!cart) return
  for (const item of quote.items) {
    const line = cart.lines.find((candidate) => lineKey(candidate.nftId, candidate.editionId) === lineKey(item.nftId, item.editionId))
    if (line) line.quantity -= item.quantity
  }
  cart.lines = cart.lines.filter((line) => line.quantity > 0)
  touch(cart)
}

export async function settleDueOrders(db: DbState) {
  const due = db.orders.filter((order) => order.status === 'pending' && order.resolveAt <= Date.now())
  for (const order of due) await settle(db, order)
  scheduleSettlement(db)
}

let settlementTimer: ReturnType<typeof setTimeout> | undefined

export function scheduleSettlement(db: DbState) {
  clearTimeout(settlementTimer)
  const pending = db.orders.filter((order) => order.status === 'pending')
  if (pending.length === 0) return
  const next = Math.min(...pending.map((order) => order.resolveAt))
  settlementTimer = setTimeout(() => void settleDueOrders(db), Math.max(0, next - Date.now()))
}

export function toPublicOrder(order: OrderRecord) {
  const { payloadHash: _payloadHash, walletId: _walletId, resolveAt: _resolveAt, outcome: _outcome, ...publicOrder } = order
  return publicOrder
}
