import { delay, http, HttpResponse, type HttpHandler } from 'msw'
import type { z } from 'zod'
import { getDb, nextRandom, type DbState } from '../db'
import { MockHttpError } from '../http-error'

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete'

export type RouteContext = {
  db: DbState
  request: Request
  url: URL
  params: Record<string, string>
}

export function errorResponse(error: MockHttpError) {
  return HttpResponse.json(
    { code: error.code, message: error.message, ...error.extra },
    { status: error.status },
  )
}

function matchesRule(match: string | null, method: string, url: URL) {
  if (!match) return true
  const [maybeMethod, ...rest] = match.split(' ')
  const hasMethod = rest.length > 0
  const path = hasMethod ? rest.join(' ') : maybeMethod
  if (hasMethod && maybeMethod.toUpperCase() !== method) return false
  return url.pathname.startsWith(path)
}

async function applyFailure(db: DbState, method: string, url: URL) {
  const rule = db.scenario.failures.find((candidate) => matchesRule(candidate.match, method, url))
  if (!rule) return null
  if (rule.remaining !== null) {
    rule.remaining -= 1
    if (rule.remaining <= 0) db.scenario.failures = db.scenario.failures.filter((candidate) => candidate !== rule)
  }
  if (rule.kind === 'network') return HttpResponse.error()
  if (rule.kind === 'timeout') {
    await delay('infinite')
    return HttpResponse.error()
  }
  return HttpResponse.json(
    { code: 'SCENARIO_FAILURE', message: 'Falha simulada pelo cenário ativo.' },
    { status: rule.status },
  )
}

function latencyFor(db: DbState, method: string, url: URL) {
  const { latency } = db.scenario
  switch (latency.kind) {
    case 'none':
      return 0
    case 'fixed':
      return latency.ms
    case 'variable':
      return Math.round(latency.min + nextRandom(db) * (latency.max - latency.min))
    case 'out-of-order': {
      if (method !== 'GET' || url.pathname !== '/api/nfts') return latency.fastMs
      db.catalogRequests += 1
      return db.catalogRequests % 2 === 1 ? latency.slowMs : latency.fastMs
    }
  }
}

export function parseBody<T extends z.ZodType>(schema: T, body: unknown): z.infer<T> {
  const result = schema.safeParse(body)
  if (result.success) return result.data
  const fieldErrors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || 'body'
    fieldErrors[field] ??= issue.message
  }
  throw new MockHttpError(422, 'VALIDATION_ERROR', 'Verifique os campos informados.', { fieldErrors })
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    throw new MockHttpError(400, 'INVALID_JSON', 'Corpo da requisição inválido.')
  }
}

type Resolver = (context: RouteContext) => Promise<Response | Record<string, unknown> | null>

export function route(method: Method, path: string, resolver: Resolver): HttpHandler {
  return http[method](`*${path}`, async ({ request, params }) => {
    const db = await getDb()
    const url = new URL(request.url)
    const failure = await applyFailure(db, request.method, url)
    if (failure) return failure
    await delay(latencyFor(db, request.method, url))
    try {
      const result = await resolver({ db, request, url, params: params as Record<string, string> })
      if (result instanceof Response) return result
      return result === null ? new HttpResponse(null, { status: 204 }) : HttpResponse.json(result)
    } catch (error) {
      if (error instanceof MockHttpError) return errorResponse(error)
      throw error
    }
  })
}
