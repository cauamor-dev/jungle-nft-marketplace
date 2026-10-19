import { expect, test } from '@playwright/test'
import { api, demoReset, demoScenario, openMockPanel } from './helpers'

type Order = { id: string; status: string; txReference: string | null }

test.describe('persistência dos mocks após refresh', () => {
  test('sessão, carrinho e pedido pendente sobrevivem ao reload e o pedido conclui', async ({ page }) => {
    await openMockPanel(page)
    await page.getByRole('button', { name: 'Entrar como demo1' }).click()
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')

    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_03', editionId: 'nft_03_std', quantity: 2 })
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
        collector: { fullName: 'Marina Duarte', email: 'demo1@example.test' },
      },
      { 'Idempotency-Key': 'e2e-reload' },
    )
    expect(created.status).toBe(201)
    expect(created.body.status).toBe('pending')

    await page.reload()
    await expect(page.getByTestId('activity-log').locator('[data-kind="connected"]')).toHaveCount(1)
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')

    const recovered = await api<Order>(page, 'POST', '/api/orders', {
      quoteId: quote.body.id,
      walletId: 'wallet_1',
      network: 'ethereum',
      collector: { fullName: 'Marina Duarte', email: 'demo1@example.test' },
    }, { 'Idempotency-Key': 'e2e-reload' })
    expect(recovered.status).toBe(200)
    expect(recovered.body.id).toBe(created.body.id)

    await expect
      .poll(async () => (await api<Order>(page, 'GET', `/api/orders/${created.body.id}`)).body.status)
      .toBe('confirmed')
    const cart = await api<{ items: unknown[] }>(page, 'GET', '/api/cart')
    expect(cart.body.items).toEqual([])
  })

  test('reset restaura o cenário conhecido', async ({ page }) => {
    await openMockPanel(page)
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.9' })
    await expect(page.getByTestId('nft-state')).toContainText('0.9 ETH')

    await demoReset(page)
    await page.reload()
    await expect(page.getByTestId('nft-state')).toContainText('0.0125 ETH, versão 1')
  })
})
