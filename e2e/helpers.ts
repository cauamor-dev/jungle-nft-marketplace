import { expect, type Page } from '@playwright/test'

export async function openMockPanel(page: Page) {
  await page.goto('/dev/mocks')
  await expect(page.getByTestId('activity-log').locator('[data-kind="connected"]')).toHaveCount(1)
  await expect(page.getByTestId('nft-state')).toContainText('versão 1')
}

// Chama as rotas /__demo pelo navegador, para a requisição passar pelo service worker do MSW.
export async function demoScenario(page: Page, name: string, params: Record<string, unknown> = {}) {
  // Logo depois do carregamento o MSW pode ainda não estar ativo e o preview devolveria o index.html no lugar do JSON.
  await expect
    .poll(async () => page.evaluate(() => fetch('/__demo/state').then((response) => response.headers.get('content-type') ?? '')), { timeout: 10_000 })
    .toContain('json')
  const status = await page.evaluate(
    async ({ name, params }) => {
      const response = await fetch('/__demo/scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, params }),
      })
      return response.status
    },
    { name, params },
  )
  expect(status).toBe(200)
}

// Faz chamadas autenticadas à API usando o token que a própria aplicação guardou no login.
export async function api<T = unknown>(page: Page, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return page.evaluate(
    async ({ method, path, body, headers }) => {
      const token = localStorage.getItem('jg-session-token')
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Guest-Id': localStorage.getItem('jg-guest-id') ?? 'e2e',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      })
      return { status: response.status, body: (await response.json().catch(() => null)) as unknown }
    },
    { method, path, body, headers },
  ) as Promise<{ status: number; body: T }>
}

export async function demoReset(page: Page) {
  const status = await page.evaluate(async () => (await fetch('/__demo/reset', { method: 'POST' })).status)
  expect(status).toBe(200)
}

export const demoUser = { email: 'demo1@example.test', password: 'Demo@1234' }

// Mantém o mesmo caminho do usuário: o login abre pelo carrinho, como em qualquer compra de visitante.
export async function loginThroughDialog(page: Page, credentials = demoUser) {
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('contato@email.com').fill(credentials.email)
  await dialog.getByPlaceholder('Senha').fill(credentials.password)
  await dialog.getByRole('button', { name: 'Entrar', exact: true }).last().click()
}

export async function addFromDetail(page: Page, nftId: string) {
  await page.goto(`/nft/${nftId}`)
  await expect(page.getByTestId('nft-detail')).toBeVisible()
  await page.getByRole('button', { name: /comprar/i }).first().click()
  await page.waitForURL('**/carrinho')
  await expect(page.getByTestId('cart-item').first()).toBeVisible()
}

export async function goToPaymentLoggedIn(page: Page, nftId = 'nft_12') {
  await addFromDetail(page, nftId)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.or(page.getByTestId('payment-page'))).toBeVisible()
  if (await dialog.isVisible()) await loginThroughDialog(page)
  await page.waitForURL('**/pagamento')
  await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

export async function signIn(page: Page, credentials = demoUser) {
  await page.goto('/perfil')
  await loginThroughDialog(page, credentials)
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByTestId('profile-form')).toBeVisible()
}

export async function signOut(page: Page) {
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Sair' }).first().click()
  await page.waitForURL((url) => url.pathname === '/')
}

// Deixa lenta uma única chamada (não GET) que contenha `pathPart`. 'send' atrasa a chegada ao servidor;
// 'response' deixa o servidor responder na hora e atrasa só a entrega da resposta à aplicação.
export async function slowRequest(page: Page, pathPart: string, mode: 'send' | 'response', ms: number) {
  await page.addInitScript(
    ({ pathPart, mode, ms }) => {
      type Tracked = XMLHttpRequest & { slow?: boolean }
      const open = XMLHttpRequest.prototype.open as (this: XMLHttpRequest, ...args: unknown[]) => void
      const send = XMLHttpRequest.prototype.send
      XMLHttpRequest.prototype.open = function (this: Tracked, method: string, url: string | URL, ...rest: unknown[]) {
        this.slow = method.toUpperCase() !== 'GET' && String(url).includes(pathPart)
        open.call(this, method, url, ...rest)
      }
      XMLHttpRequest.prototype.send = function (this: Tracked, body?: Document | XMLHttpRequestBodyInit | null) {
        if (!this.slow) return send.call(this, body)
        if (mode === 'send') {
          setTimeout(() => send.call(this, body), ms)
          return
        }
        const deliver = this.onloadend
        if (deliver) this.onloadend = (event) => setTimeout(() => deliver.call(this, event), ms)
        send.call(this, body)
      }
    },
    { pathPart, mode, ms },
  )
}
