import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest'
import { setupServer } from 'msw/node'
import { http } from '@/api/http'
import { clearSessionToken } from '@/api/session-storage'
import { handlers } from '@/mocks/handlers'
import { resetDb, type ScenarioState } from '@/mocks/db'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() {
    return this.data.size
  }
  clear() {
    this.data.clear()
  }
  getItem(key: string) {
    return this.data.get(key) ?? null
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null
  }
  removeItem(key: string) {
    this.data.delete(key)
  }
  setItem(key: string, value: string) {
    this.data.set(key, value)
  }
}

Object.defineProperty(globalThis, 'localStorage', { value: new MemoryStorage(), configurable: true })
Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true })

http.defaults.baseURL = 'http://localhost'

const server = setupServer(...handlers)

export const fastScenario: Partial<ScenarioState> = { latency: { kind: 'none' }, paymentDelayMs: 40 }

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(async () => {
  localStorage.clear()
  sessionStorage.clear()
  clearSessionToken()
  await resetDb(fastScenario)
})
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
