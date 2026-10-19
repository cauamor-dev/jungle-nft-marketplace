import type {
  EnsSuffix,
  Nft,
  Order,
  OrderUpdatedEvent,
  NftUpdatedEvent,
  Quote,
  Wallet,
} from '@/api/contracts'
import { buildSeed } from './fixtures'

export type UserRecord = {
  id: string
  email: string
  name: string
  username: string
  ensName: string
  ensSuffix: EnsSuffix
  walletNickname: string
  avatarUrl: string | null
  passwordSalt: string
  passwordHash: string
}

export type SessionRecord = { token: string; userId: string; expiresAt: number }

export type CartLine = { nftId: string; editionId: string; quantity: number; addedPriceEth: string }

export type CartRecord = {
  id: string
  ownerKey: string
  ownerUserId: string | null
  version: number
  couponCode: string | null
  lines: CartLine[]
}

export type CouponRecord = {
  code: string
  kind: 'percent' | 'fixed'
  value: string
  expiresAt: string
}

export type WalletRecord = Wallet & { userId: string }

export type OrderRecord = Order & {
  payloadHash: string
  walletId: string
  resolveAt: number
  outcome: 'confirmed' | 'rejected'
}

export type QuoteRecord = Quote & { userId: string; orderId: string | null }

export type StoredEvent = (NftUpdatedEvent & { type: 'nft.updated' }) | (OrderUpdatedEvent & { type: 'order.updated' })

export type FailureRule = {
  match: string | null
  kind: 'status' | 'network' | 'timeout'
  status: number
  remaining: number | null
}

export type LatencyMode =
  | { kind: 'none' }
  | { kind: 'variable'; min: number; max: number }
  | { kind: 'fixed'; ms: number }
  | { kind: 'out-of-order'; slowMs: number; fastMs: number }

export type ScenarioState = {
  label: string
  latency: LatencyMode
  catalogEmpty: boolean
  registrationConflict: boolean
  walletRefusal: boolean
  payment: 'confirmed' | 'rejected'
  paymentDelayMs: number
  hangNextOrderCreate: boolean
  socketBlocked: boolean
  failures: FailureRule[]
}

export type DbState = {
  schemaVersion: number
  sequence: number
  rngSeed: number
  catalogRequests: number
  users: UserRecord[]
  sessions: SessionRecord[]
  nfts: Nft[]
  favorites: Record<string, string[]>
  carts: CartRecord[]
  coupons: CouponRecord[]
  wallets: WalletRecord[]
  quotes: QuoteRecord[]
  orders: OrderRecord[]
  idempotency: Record<string, { payloadHash: string; orderId: string }>
  events: StoredEvent[]
  scenario: ScenarioState
}

export type SeedData = Omit<DbState, 'scenario'>

const STORAGE_KEY = 'jg-mock-db'
export const SCHEMA_VERSION = 1

export function defaultScenario(): ScenarioState {
  return {
    label: 'happy-path',
    latency: { kind: 'variable', min: 30, max: 120 },
    catalogEmpty: false,
    registrationConflict: false,
    walletRefusal: false,
    payment: 'confirmed',
    paymentDelayMs: 1500,
    hangNextOrderCreate: false,
    socketBlocked: false,
    failures: [],
  }
}

const memoryStorage = new Map<string, string>()

function readStorage(): string | null {
  if (typeof localStorage === 'undefined') return memoryStorage.get(STORAGE_KEY) ?? null
  return localStorage.getItem(STORAGE_KEY)
}

function writeStorage(value: string) {
  if (typeof localStorage === 'undefined') memoryStorage.set(STORAGE_KEY, value)
  else localStorage.setItem(STORAGE_KEY, value)
}

let state: DbState | null = null
let loading: Promise<DbState> | null = null

function parseStored(): DbState | null {
  const raw = readStorage()
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DbState
    return parsed.schemaVersion === SCHEMA_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function getDb(): Promise<DbState> {
  if (state) return Promise.resolve(state)
  loading ??= (async () => {
    state = parseStored() ?? { ...(await buildSeed()), scenario: defaultScenario() }
    persist()
    return state
  })()
  return loading
}

export function persist() {
  if (state) writeStorage(JSON.stringify(state))
}

export async function resetDb(scenario?: Partial<ScenarioState>) {
  state = { ...(await buildSeed()), scenario: { ...defaultScenario(), ...scenario } }
  loading = Promise.resolve(state)
  persist()
  return state
}

export function nextId(db: DbState, prefix: string) {
  db.sequence += 1
  return `${prefix}_${db.sequence}`
}

// Gerador determinístico (mulberry32) para a latência variável ser reproduzível.
export function nextRandom(db: DbState) {
  db.rngSeed = (db.rngSeed + 0x6d2b79f5) | 0
  let t = Math.imul(db.rngSeed ^ (db.rngSeed >>> 15), 1 | db.rngSeed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nowIso() {
  return new Date().toISOString()
}
