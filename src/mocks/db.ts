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
import { DEFAULT_WALLET_NICKNAME, defaultEnsName } from './services/user-defaults'
import { scenarioEvent } from './scenario-names'

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
// O cenário (falhas, latência, socket bloqueado...) vale só para a aba atual: sobrevive a reload e
// navegação, mas uma aba ou sessão nova sempre começa no caminho feliz. Os dados ficam no localStorage.
const SCENARIO_KEY = 'jg-mock-scenario'
export const SCHEMA_VERSION = 2

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

function readStorage(storage: Storage | undefined, key: string): string | null {
  return storage ? storage.getItem(key) : (memoryStorage.get(key) ?? null)
}

function writeStorage(storage: Storage | undefined, key: string, value: string) {
  if (storage) storage.setItem(key, value)
  else memoryStorage.set(key, value)
}

const local = () => (typeof localStorage === 'undefined' ? undefined : localStorage)
const session = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage)

let state: DbState | null = null
let loading: Promise<DbState> | null = null

function parseData(): SeedData | null {
  const raw = readStorage(local(), STORAGE_KEY)
  if (!raw) return null
  try {
    // A versão 1 gravava o cenário junto dos dados; ele é descartado na migração.
    const data = JSON.parse(raw) as Partial<DbState> & SeedData
    delete data.scenario
    if (data.schemaVersion !== 1 && data.schemaVersion !== SCHEMA_VERSION) return null
    // Contas criadas antes desta correção ficaram sem nome ENS e apelido, que o perfil exige
    for (const user of data.users) {
      if (!user.ensName) user.ensName = defaultEnsName(user.username)
      if (!user.walletNickname) user.walletNickname = DEFAULT_WALLET_NICKNAME
    }
    return { ...data, schemaVersion: SCHEMA_VERSION }
  } catch {
    return null
  }
}

function parseScenario(): ScenarioState {
  const raw = readStorage(session(), SCENARIO_KEY)
  if (!raw) return defaultScenario()
  try {
    return { ...defaultScenario(), ...(JSON.parse(raw) as Partial<ScenarioState>) }
  } catch {
    return defaultScenario()
  }
}

export function getDb(): Promise<DbState> {
  if (state) return Promise.resolve(state)
  loading ??= (async () => {
    state = { ...(parseData() ?? (await buildSeed())), scenario: parseScenario() }
    persist()
    return state
  })()
  return loading
}

export function persist() {
  if (!state) return
  const { scenario, ...data } = state
  writeStorage(local(), STORAGE_KEY, JSON.stringify(data))
  writeStorage(session(), SCENARIO_KEY, JSON.stringify(scenario))
}

// Avisa a interface (banner de cenário ativo) sem que ela precise importar o mock.
export function announceScenario(scenario: ScenarioState) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(scenarioEvent, { detail: { label: scenario.label } }))
}

export async function resetDb(scenario?: Partial<ScenarioState>) {
  state = { ...(await buildSeed()), scenario: { ...defaultScenario(), ...scenario } }
  loading = Promise.resolve(state)
  persist()
  announceScenario(state.scenario)
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
