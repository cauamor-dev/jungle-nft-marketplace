import { login } from '@/api/endpoints'
import { setSessionToken } from '@/api/session-storage'

export const DEMO_PASSWORD = 'Demo@1234'

export async function loginAs(email: string) {
  const result = await login({ email, password: DEMO_PASSWORD })
  setSessionToken(result.token)
  return result
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function demoScenario(name: string, params: Record<string, unknown> = {}) {
  const response = await fetch('http://localhost/__demo/scenario', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, params }),
  })
  if (!response.ok) throw new Error(`Cenário ${name} falhou: ${response.status}`)
}
