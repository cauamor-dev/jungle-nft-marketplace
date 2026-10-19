import { http, HttpResponse } from 'msw'
import { z } from 'zod'
import { getDb, resetDb } from '../db'
import { MockHttpError } from '../http-error'
import { applyScenario, scenarioNames, scenarioRequestSchema } from '../scenarios'
import { connectionCount, disconnectAll } from '../socket-hub'
import { scheduleSettlement } from '../services/orders'
import { errorResponse, parseBody, readJson } from './route'

const resetSchema = z.object({ scenario: z.enum(scenarioNames).optional() }).default({})

function summary(db: Awaited<ReturnType<typeof getDb>>) {
  return {
    scenario: db.scenario,
    socketConnections: connectionCount(),
    events: db.events.length,
    availableScenarios: scenarioNames,
  }
}

async function guarded(run: () => Promise<Response>) {
  try {
    return await run()
  } catch (error) {
    if (error instanceof MockHttpError) return errorResponse(error)
    throw error
  }
}

// Rotas de apoio à demonstração e aos testes. Ficam fora de /api para não passarem pelas falhas simuladas.
export const demoHandlers = [
  http.post('*/__demo/reset', ({ request }) =>
    guarded(async () => {
      const body = request.headers.get('content-length') === '0' ? {} : await readJson(request).catch(() => ({}))
      const { scenario } = parseBody(resetSchema, body)
      disconnectAll()
      const db = await resetDb()
      if (scenario) applyScenario(db, scenario, {})
      scheduleSettlement(db)
      return HttpResponse.json(summary(db))
    }),
  ),

  http.post('*/__demo/scenario', ({ request }) =>
    guarded(async () => {
      const { name, params } = parseBody(scenarioRequestSchema, await readJson(request))
      const db = await getDb()
      applyScenario(db, name, params)
      return HttpResponse.json(summary(db))
    }),
  ),

  http.get('*/__demo/state', () =>
    guarded(async () => HttpResponse.json(summary(await getDb()))),
  ),
]
