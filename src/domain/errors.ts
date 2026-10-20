import type { ApiErrorBody } from '@/api/contracts'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fieldErrors?: Record<string, string>
  readonly details?: unknown

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.fieldErrors = body.fieldErrors
    this.details = body.details
  }
}

// Falha sem resposta HTTP: rede indisponível ou timeout. O resultado da operação é desconhecido.
export class NetworkError extends Error {
  readonly timedOut: boolean

  constructor(timedOut: boolean) {
    super(timedOut ? 'A requisição demorou demais' : 'Sem conexão com o servidor')
    this.name = 'NetworkError'
    this.timedOut = timedOut
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isUnknownOutcome(error: unknown): error is NetworkError {
  return error instanceof NetworkError
}
