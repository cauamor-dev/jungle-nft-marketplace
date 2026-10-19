import { z } from 'zod'
import { addEth } from '@/domain/money'
import { defaultScenario, persist, type DbState, type FailureRule } from './db'
import { publishNftUpdated, replayEvent, replayOlderEvent } from './events'
import { MockHttpError } from './http-error'
import { disconnectAll } from './socket-hub'
import { expireAllSessions } from './services/auth'
import { scenarioNames, type ScenarioName } from './scenario-names'

export { scenarioNames, type ScenarioName }

export const scenarioRequestSchema = z.object({
  name: z.enum(scenarioNames),
  params: z
    .object({
      match: z.string().optional(),
      status: z.number().int().min(400).max(599).optional(),
      remaining: z.number().int().positive().optional(),
      ms: z.number().int().nonnegative().optional(),
      nftId: z.string().optional(),
      editionId: z.string().optional(),
      priceEth: z.string().optional(),
      eventResource: z.object({ type: z.enum(['nft', 'order']), id: z.string() }).optional(),
    })
    .default({}),
})

type Params = z.infer<typeof scenarioRequestSchema>['params']

function addFailure(db: DbState, kind: FailureRule['kind'], status: number, params: Params) {
  db.scenario.failures.push({
    match: params.match ?? null,
    kind,
    status,
    remaining: params.remaining ?? null,
  })
}

function requireNft(db: DbState, nftId: string | undefined) {
  const nft = db.nfts.find((candidate) => candidate.id === (nftId ?? 'nft_01'))
  if (!nft) throw new MockHttpError(404, 'NFT_NOT_FOUND', 'NFT do cenário não existe.')
  return nft
}

function lastEvent(db: DbState, resource: Params['eventResource']) {
  const matching = resource
    ? db.events.filter((event) => event.resource.type === resource.type && event.resource.id === resource.id)
    : db.events
  return matching.at(-1)
}

export function applyScenario(db: DbState, name: ScenarioName, params: Params) {
  const scenario = db.scenario
  scenario.label = name

  switch (name) {
    case 'happy-path':
      db.scenario = { ...defaultScenario() }
      break
    case 'empty-results':
      scenario.catalogEmpty = true
      break
    case 'slow-network':
      scenario.latency = { kind: 'fixed', ms: params.ms ?? 2500 }
      break
    case 'variable-latency':
      scenario.latency = { kind: 'variable', min: 100, max: 1500 }
      break
    case 'out-of-order-results':
      scenario.latency = { kind: 'out-of-order', slowMs: params.ms ?? 900, fastMs: 50 }
      break
    case 'offline':
      addFailure(db, 'network', 0, params)
      break
    case 'timeout':
      addFailure(db, 'timeout', 0, params)
      break
    case 'http-4xx':
      addFailure(db, 'status', params.status ?? 400, params)
      break
    case 'http-5xx':
      addFailure(db, 'status', params.status ?? 503, params)
      break
    case 'expired-session':
      expireAllSessions(db)
      break
    case 'registration-conflict':
      scenario.registrationConflict = true
      break
    case 'wallet-refused':
      scenario.walletRefusal = true
      break
    case 'expired-coupon': {
      const coupon = db.coupons.find((candidate) => candidate.code === 'JUNGLE10')
      if (coupon) coupon.expiresAt = new Date(Date.now() - 1000).toISOString()
      break
    }
    case 'price-changed': {
      const nft = requireNft(db, params.nftId)
      nft.priceEth = params.priceEth ?? addEth(nft.priceEth, '0.01')
      nft.version += 1
      publishNftUpdated(db, nft)
      break
    }
    case 'edition-sold-out': {
      const nft = requireNft(db, params.nftId)
      for (const edition of nft.editions) {
        if (!params.editionId || edition.id === params.editionId) edition.stock = 0
      }
      nft.available = nft.editions.some((edition) => edition.stock > 0)
      nft.version += 1
      publishNftUpdated(db, nft)
      break
    }
    case 'post-create-order-timeout':
      scenario.hangNextOrderCreate = true
      break
    case 'payment-rejected':
      scenario.payment = 'rejected'
      break
    case 'payment-confirmed':
      scenario.payment = 'confirmed'
      break
    case 'duplicate-events': {
      const event = lastEvent(db, params.eventResource)
      if (!event) throw new MockHttpError(409, 'NO_EVENT', 'Ainda não há evento para repetir.')
      replayEvent(event)
      break
    }
    case 'stale-events': {
      const resource = params.eventResource ?? db.events.at(-1)?.resource
      if (!resource || !replayOlderEvent(db, resource)) {
        throw new MockHttpError(409, 'NO_OLDER_EVENT', 'Não há versão anterior do recurso para reenviar.')
      }
      break
    }
    case 'disconnect-pending-order':
      scenario.socketBlocked = true
      disconnectAll()
      break
    case 'reconnect-pending-order':
      scenario.socketBlocked = false
      break
  }
  persist()
  return db.scenario
}
