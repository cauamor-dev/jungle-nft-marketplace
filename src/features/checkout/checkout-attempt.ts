import type { CreateOrderInput } from '@/api/contracts'

const STORAGE_KEY = 'jg-checkout-attempt'

type Attempt = { userId: string; signature: string; idempotencyKey: string }

function signatureOf(input: CreateOrderInput) {
  return JSON.stringify([input.quoteId, input.walletId, input.network, input.collector])
}

function load(): Attempt | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  return raw ? (JSON.parse(raw) as Attempt) : null
}

// A mesma tentativa (usuário + conteúdo) reaproveita a chave, inclusive depois de um refresh.
// Conteúdo diferente, como uma nova cotação, gera uma chave nova.
export function getAttemptKey(userId: string, input: CreateOrderInput) {
  const signature = signatureOf(input)
  const current = load()
  if (current && current.userId === userId && current.signature === signature) return current.idempotencyKey
  const attempt: Attempt = { userId, signature, idempotencyKey: crypto.randomUUID() }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attempt))
  return attempt.idempotencyKey
}

export function getPendingAttemptKey(userId: string) {
  const current = load()
  return current && current.userId === userId ? current.idempotencyKey : null
}

export function clearAttempt() {
  sessionStorage.removeItem(STORAGE_KEY)
}
