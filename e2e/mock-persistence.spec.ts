import { expect, test } from '@playwright/test'
import { api, demoReset, demoScenario, openMockPanel } from './helpers'

const collector = {
          displayName: 'Marina Duarte', username: 'marina.duarte', profileName: 'marina-duarte', email: 'demo1@example.test',
          ensName: 'marina', ensSuffix: 'eth', referralCode: 'KURIO-2026', walletType: 'metamask',
          walletAddress: '0xA91F4c2b7D3e89aB10C5f6E72d048b9C13a5E82C',
        }

type Order = { id: string; status: string; txReference: string | null }

test.describe('persistência dos mocks após refresh', () => {
  test('sessão, carrinho e pedido pendente sobrevivem ao reload e o pedido conclui', async ({ page }) => {
    await openMockPanel(page)
    await page.getByRole('button', { name: 'Entrar como demo1' }).click()
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')

    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 2 })
    await api(page, 'POST', '/api/wallets/wallet_1/connect')
    const quote = await api<{ id: string }>(page, 'POST', '/api/quotes', { network: 'ethereum' })
    const created = await api<Order>(
      page,
      'POST',
      '/api/orders',
      {
        quoteId: quote.body.id,
        walletId: 'wallet_1',
        network: 'ethereum',
        collector: collector,
      },
      { 'Idempotency-Key': 'e2e-reload' },
    )
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')
    // Item adicionado depois da cotação: não entra no pedido e precisa continuar no carrinho
    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_03', editionId: 'nft_03_open', quantity: 1 })

    await page.reload()
    await expect(page.getByTestId('activity-log').locator('[data-kind="connected"]')).toHaveCount(1)
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')

    const recovered = await api<Order>(page, 'POST', '/api/orders', {
      quoteId: quote.body.id,
      walletId: 'wallet_1',
      network: 'ethereum',
      collector: collector,
    }, { 'Idempotency-Key': 'e2e-reload' })
    expect(recovered.status).toBe(200)
    expect(recovered.body.id).toBe(created.body.id)

    await expect
      .poll(async () => (await api<Order>(page, 'GET', `/api/orders/${created.body.id}`)).body.status)
      .toBe('confirmed')
    const cart = await api<{ items: { nftId: string }[] }>(page, 'GET', '/api/cart')
    expect(cart.body.items.map((item) => item.nftId)).toEqual(['nft_03'])
  })

  test('reset restaura o cenário conhecido', async ({ page }) => {
    await openMockPanel(page)
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.9' })
    await expect(page.getByTestId('nft-state')).toContainText('0.9 ETH')

    await demoReset(page)
    await page.reload()
    await expect(page.getByTestId('nft-state')).toContainText('1.19 ETH, versão 1')
  })
})

// Regressão: um cenário de falha ficava salvo no localStorage sem prazo e deixava o catálogo
// em "Algo deu errado" em qualquer aba, mesmo depois de recarregar ou tentar de novo.
test.describe('cenário simulado não fica preso', () => {
  const cards = (page: import('@playwright/test').Page) => page.locator('[data-testid="nft-card"]:visible')

  test('falha vale só para a aba, aparece no banner e é restaurada pela interface', async ({ page, context }) => {
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()
    await demoScenario(page, 'offline')

    await page.reload()
    const banner = page.getByTestId('scenario-banner')
    await expect(banner).toContainText('offline')
    await expect(page.getByTestId('catalog-error')).toContainText('Sem conexão com o servidor')

    // Outra aba do mesmo navegador começa no caminho feliz
    const other = await context.newPage()
    await other.goto('/')
    await expect(cards(other).first()).toBeVisible()
    await expect(other.getByTestId('scenario-banner')).toHaveCount(0)
    await other.close()

    await banner.getByRole('button', { name: 'Restaurar condições normais' }).click()
    await expect(banner).toBeHidden()
    await expect(cards(page).first()).toBeVisible()
    await page.reload()
    await expect(cards(page).first()).toBeVisible()
  })

  test('dados salvos no formato antigo, com falha embutida, não travam o catálogo', async ({ page }) => {
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('jg-mock-db')!)
      const legacy = {
        ...data,
        schemaVersion: 1,
        scenario: { label: 'offline', latency: { kind: 'none' }, failures: [{ match: null, kind: 'network', status: 0, remaining: null }] },
      }
      localStorage.setItem('jg-mock-db', JSON.stringify(legacy))
      sessionStorage.clear()
    })
    await page.reload()
    await expect(cards(page).first()).toBeVisible()
    await expect(page.getByTestId('scenario-banner')).toHaveCount(0)
  })

  test('?mock-reset=1 restaura dados e cenário antes de montar e limpa a URL', async ({ page }) => {
    await page.goto('/')
    await expect(cards(page).first()).toBeVisible()
    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    await demoScenario(page, 'http-5xx', { match: 'GET /api/nfts' })

    await page.goto('/mercado?mock-reset=1')
    await expect(page).toHaveURL(/\/mercado$/)
    await expect(cards(page).first()).toBeVisible()
    await expect(page.getByTestId('scenario-banner')).toHaveCount(0)
    const cart = await api<{ items: unknown[] }>(page, 'GET', '/api/cart')
    expect(cart.body.items).toHaveLength(0)
  })
})

test.describe('painel dos mocks', () => {
  test('repetir evento sem evento algum avisa no painel e não gera erro na página', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/?mock-reset=1')
    await page.goto('/dev/mocks')
    await page.getByRole('button', { name: 'duplicate-events', exact: true }).click()
    await expect(page.getByTestId('scenario-notice')).toHaveText('Ainda não há evento para repetir.')
    await page.getByRole('button', { name: 'stale-events', exact: true }).click()
    await expect(page.getByTestId('scenario-notice')).toHaveText('Não há versão anterior do recurso para reenviar.')
    await page.getByRole('button', { name: 'slow-network', exact: true }).click()
    await expect(page.getByTestId('scenario-notice')).toHaveText('Cenário slow-network aplicado.')
    expect(errors).toEqual([])
  })
})
