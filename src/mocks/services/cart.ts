import type { Cart, CartItem, Edition, Network } from '@/api/contracts'
import { multiplyEth } from '@/domain/money'
import { nextId, persist, type CartLine, type CartRecord, type DbState } from '../db'
import { MockHttpError } from '../http-error'
import { computeTotals, evaluateCoupon } from './pricing'

export type CartOwner = { userId: string | null; guestId: string }

export const lineKey = (nftId: string, editionId: string) => `${nftId}:${editionId}`

export function ownerKey(owner: CartOwner) {
  return owner.userId ? `user:${owner.userId}` : `guest:${owner.guestId}`
}

export function findCart(db: DbState, owner: CartOwner) {
  return db.carts.find((cart) => cart.ownerKey === ownerKey(owner))
}

export function getOrCreateCart(db: DbState, owner: CartOwner): CartRecord {
  const existing = findCart(db, owner)
  if (existing) return existing
  const cart: CartRecord = {
    id: nextId(db, 'cart'),
    ownerKey: ownerKey(owner),
    ownerUserId: owner.userId,
    version: 0,
    couponCode: null,
    lines: [],
  }
  db.carts.push(cart)
  return cart
}

export function findNftAndEdition(db: DbState, nftId: string, editionId: string) {
  const nft = db.nfts.find((candidate) => candidate.id === nftId)
  const edition = nft?.editions.find((candidate) => candidate.id === editionId)
  return nft && edition ? { nft, edition } : null
}

export function availableQuantity(edition: Edition) {
  return Math.min(edition.stock, edition.maxPerBuyer)
}

function assertCanHold(edition: Edition, quantity: number) {
  if (edition.stock === 0) {
    throw new MockHttpError(409, 'EDITION_SOLD_OUT', 'Esta edição está esgotada.')
  }
  const limit = availableQuantity(edition)
  if (quantity > limit) {
    throw new MockHttpError(409, 'QUANTITY_LIMIT', `Limite de ${limit} unidade(s) para esta edição.`, {
      details: { max: limit },
    })
  }
}

export function addLine(db: DbState, cart: CartRecord, nftId: string, editionId: string, quantity: number) {
  const found = findNftAndEdition(db, nftId, editionId)
  if (!found) throw new MockHttpError(404, 'NFT_NOT_FOUND', 'NFT ou edição não encontrada.')
  const existing = cart.lines.find((line) => line.nftId === nftId && line.editionId === editionId)
  assertCanHold(found.edition, (existing?.quantity ?? 0) + quantity)
  if (existing) existing.quantity += quantity
  else cart.lines.push({ nftId, editionId, quantity, addedPriceEth: found.nft.priceEth })
  touch(cart)
}

export function setLineQuantity(db: DbState, cart: CartRecord, key: string, quantity: number) {
  const line = cart.lines.find((candidate) => lineKey(candidate.nftId, candidate.editionId) === key)
  if (!line) throw new MockHttpError(404, 'CART_ITEM_NOT_FOUND', 'Item não está no carrinho.')
  const found = findNftAndEdition(db, line.nftId, line.editionId)
  if (found) assertCanHold(found.edition, quantity)
  line.quantity = quantity
  touch(cart)
}

export function removeLine(cart: CartRecord, key: string) {
  const before = cart.lines.length
  cart.lines = cart.lines.filter((line) => lineKey(line.nftId, line.editionId) !== key)
  if (cart.lines.length === before) throw new MockHttpError(404, 'CART_ITEM_NOT_FOUND', 'Item não está no carrinho.')
  touch(cart)
}

export function touch(cart: CartRecord) {
  cart.version += 1
  persist()
}

export type MergeConflict = {
  nftId: string
  editionId: string
  requested: number
  applied: number
  reason: 'EDITION_SOLD_OUT' | 'QUANTITY_LIMIT'
}

// Junta o carrinho do visitante ao do usuário sem passar do limite da edição. O que não couber vira conflito.
export function mergeGuestCart(db: DbState, guest: CartRecord, user: CartRecord) {
  const conflicts: MergeConflict[] = []
  let mergedItems = 0
  for (const line of guest.lines) {
    const found = findNftAndEdition(db, line.nftId, line.editionId)
    if (!found) continue
    const existing = user.lines.find((candidate) => candidate.nftId === line.nftId && candidate.editionId === line.editionId)
    const current = existing?.quantity ?? 0
    const limit = availableQuantity(found.edition)
    const applied = Math.max(0, Math.min(line.quantity, limit - current))
    if (applied > 0) {
      if (existing) existing.quantity += applied
      else user.lines.push({ ...line, quantity: applied })
      mergedItems += 1
    }
    if (applied < line.quantity) {
      conflicts.push({
        nftId: line.nftId,
        editionId: line.editionId,
        requested: line.quantity,
        applied,
        reason: found.edition.stock === 0 ? 'EDITION_SOLD_OUT' : 'QUANTITY_LIMIT',
      })
    }
  }
  if (!user.couponCode && guest.couponCode) user.couponCode = guest.couponCode
  db.carts = db.carts.filter((cart) => cart.id !== guest.id)
  touch(user)
  return { mergedItems, conflicts }
}

function buildItem(db: DbState, line: CartLine): CartItem | null {
  const found = findNftAndEdition(db, line.nftId, line.editionId)
  if (!found) return null
  const { nft, edition } = found
  const available = availableQuantity(edition)
  return {
    key: lineKey(line.nftId, line.editionId),
    nftId: nft.id,
    editionId: edition.id,
    title: nft.title,
    editionLabel: edition.label,
    image: nft.images[0] ?? null,
    quantity: line.quantity,
    unitPriceEth: nft.priceEth,
    addedPriceEth: line.addedPriceEth,
    lineTotalEth: multiplyEth(nft.priceEth, line.quantity),
    availableQuantity: available,
    issue: edition.stock === 0 ? 'SOLD_OUT' : line.quantity > available ? 'QUANTITY_EXCEEDS_AVAILABLE' : null,
  }
}

export function buildCartView(db: DbState, cart: CartRecord, network: Network = 'ethereum'): Cart {
  const items = cart.lines.map((line) => buildItem(db, line)).filter((item): item is CartItem => item !== null)
  const coupon = evaluateCoupon(db, cart.couponCode)
  return {
    id: cart.id,
    ownerUserId: cart.ownerUserId,
    version: cart.version,
    couponCode: cart.couponCode,
    couponStatus: coupon.status,
    network,
    items,
    summary: computeTotals(items, coupon, network),
  }
}
