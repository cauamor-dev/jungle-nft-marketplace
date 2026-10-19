import { expect, test } from '@playwright/test'
import { api, demoScenario, openMockPanel } from './helpers'

const log = (page: import('@playwright/test').Page) => page.getByTestId('activity-log')

test.describe('transporte Socket.IO via MSW', () => {
  test('conecta pelo socket.io-client e aplica nft.updated sem refetch', async ({ page }) => {
    const realSockets: string[] = []
    page.on('websocket', (socket) => realSockets.push(socket.url()))
    const detailRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().endsWith('/api/nfts/nft_01')) detailRequests.push(request.url())
    })

    await openMockPanel(page)
    await expect(page.getByTestId('nft-state')).toContainText('1.19 ETH, versão 1')
    const requestsBefore = detailRequests.length

    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.0999' })

    await expect(page.getByTestId('nft-state')).toContainText('0.0999 ETH, versão 2')
    await expect(log(page)).toContainText('applied nft.updated nft:nft_01 v2')
    expect(detailRequests.length).toBe(requestsBefore)
    // O WebSocket é interceptado pelo MSW: nada abre conexão de rede real.
    expect(realSockets).toEqual([])
  })

  test('ignora evento duplicado e evento antigo sem regredir o estado', async ({ page }) => {
    await openMockPanel(page)
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.02' })
    await expect(page.getByTestId('nft-state')).toContainText('0.02 ETH, versão 2')
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.03' })
    await expect(page.getByTestId('nft-state')).toContainText('0.03 ETH, versão 3')

    await demoScenario(page, 'duplicate-events', { eventResource: { type: 'nft', id: 'nft_01' } })
    await expect(log(page).locator('[data-kind="duplicate"]')).toHaveCount(1)

    await demoScenario(page, 'stale-events', { eventResource: { type: 'nft', id: 'nft_01' } })
    await expect(log(page).locator('[data-kind="stale"]')).toHaveCount(1)
    await expect(page.getByTestId('nft-state')).toContainText('0.03 ETH, versão 3')
  })

  test('entrega order.updated só ao dono do pedido', async ({ page }) => {
    await openMockPanel(page)
    await page.getByRole('button', { name: 'Entrar como demo1' }).click()
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')
    await expect(log(page).locator('[data-kind="connected"]')).toHaveCount(1)

    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_03', editionId: 'nft_03_std', quantity: 1 })
    await api(page, 'POST', '/api/wallets/wallet_1/connect')
    const quote = await api<{ id: string }>(page, 'POST', '/api/quotes', { network: 'ethereum' })
    const order = await api<{ id: string }>(
      page,
      'POST',
      '/api/orders',
      {
        quoteId: quote.body.id,
        walletId: 'wallet_1',
        network: 'ethereum',
        collector: { fullName: 'Marina Duarte', email: 'demo1@example.test' },
      },
      { 'Idempotency-Key': 'e2e-spike-order' },
    )
    expect(order.status).toBe(201)

    await expect(log(page)).toContainText(`applied order.updated order:${order.body.id} v1`)
    await expect(log(page)).toContainText(`applied order.updated order:${order.body.id} v2`)
  })

  test('troca de usuário libera o socket anterior e não vaza eventos do pedido', async ({ page }) => {
    await openMockPanel(page)
    await page.getByRole('button', { name: 'Entrar como demo1' }).click()
    await expect(page.getByTestId('session-user')).toHaveText('demo1@example.test')
    await expect(log(page).locator('[data-kind="connected"]')).toHaveCount(1)

    await api(page, 'POST', '/api/cart/items', { nftId: 'nft_03', editionId: 'nft_03_std', quantity: 1 })
    await api(page, 'POST', '/api/wallets/wallet_1/connect')
    const quote = await api<{ id: string }>(page, 'POST', '/api/quotes', { network: 'ethereum' })
    const order = await api<{ id: string }>(
      page,
      'POST',
      '/api/orders',
      {
        quoteId: quote.body.id,
        walletId: 'wallet_1',
        network: 'ethereum',
        collector: { fullName: 'Marina Duarte', email: 'demo1@example.test' },
      },
      { 'Idempotency-Key': 'e2e-switch-user' },
    )
    await expect(log(page)).toContainText(`applied order.updated order:${order.body.id} v1`)

    await page.getByRole('button', { name: 'Entrar como demo2' }).click()
    await expect(page.getByTestId('session-user')).toHaveText('demo2@example.test')
    await expect(log(page).locator('[data-kind="connected"]')).toHaveCount(1)

    // A confirmação do pedido do demo1 acontece depois da troca de sessão.
    await expect
      .poll(async () => (await api<{ pendingOrders: number }>(page, 'GET', '/__demo/state')).body.pendingOrders)
      .toBe(0)
    // Um evento público enviado depois chega na mesma conexão, em ordem: serve de marcador.
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.4' })
    await expect(log(page)).toContainText('applied nft.updated nft:nft_01 v2')
    await expect(log(page).locator('li', { hasText: 'order.updated' })).toHaveCount(0)

    const state = await api<{ socketConnections: number }>(page, 'GET', '/__demo/state')
    expect(state.body.socketConnections).toBe(1)
  })

  test('reconecta depois de uma queda e reconcilia pela REST', async ({ page }) => {
    await openMockPanel(page)
    await demoScenario(page, 'disconnect-pending-order')
    await expect(log(page).locator('[data-kind="disconnected"]')).not.toHaveCount(0)

    // Este evento é emitido sem nenhum socket conectado e se perde.
    await demoScenario(page, 'price-changed', { nftId: 'nft_01', priceEth: '0.5' })
    await expect(page.getByTestId('nft-state')).toContainText('1.19 ETH')

    await demoScenario(page, 'reconnect-pending-order')
    await expect(log(page).locator('[data-kind="reconnected"]')).toHaveCount(1, { timeout: 15_000 })
    await expect(page.getByTestId('nft-state')).toContainText('0.5 ETH, versão 2')
  })
})
