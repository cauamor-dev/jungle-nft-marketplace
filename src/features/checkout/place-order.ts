import { createOrder, findOrderByKey } from '@/api/endpoints'
import type { CreateOrderInput, Order } from '@/api/contracts'
import { isUnknownOutcome } from '@/domain/errors'

type SubmitOptions = { timeoutMs?: number; maxAttempts?: number }

const inFlight = new Map<string, Promise<Order>>()

async function attempt(input: CreateOrderInput, idempotencyKey: string, options: SubmitOptions) {
  const maxAttempts = options.maxAttempts ?? 3
  let lastError: unknown

  for (let tries = 0; tries < maxAttempts; tries += 1) {
    try {
      return await createOrder(input, idempotencyKey, { timeoutMs: options.timeoutMs })
    } catch (error) {
      if (!isUnknownOutcome(error)) throw error
      lastError = error
      // O servidor pode ter criado o pedido antes da falha de rede: consulta antes de reenviar.
      const existing = await findOrderByKey(idempotencyKey).catch(() => null)
      if (existing) return existing
    }
  }
  throw lastError
}

// Cliques repetidos com a mesma chave compartilham a mesma requisição em andamento.
export function submitOrder(input: CreateOrderInput, idempotencyKey: string, options: SubmitOptions = {}) {
  const running = inFlight.get(idempotencyKey)
  if (running) return running
  const promise = attempt(input, idempotencyKey, options).finally(() => inFlight.delete(idempotencyKey))
  inFlight.set(idempotencyKey, promise)
  return promise
}
