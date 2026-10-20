import { expect, test } from '@playwright/test'
import { addFromDetail, api, demoScenario, goToPaymentLoggedIn, signIn } from './helpers'

test.setTimeout(60_000)

test.describe('tempo real na interface', () => {
  test('item que esgota em outra sessão bloqueia o carrinho sem recarregar a página', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
    await demoScenario(page, 'edition-sold-out', { nftId: 'nft_12' })
    await expect(page.getByTestId('cart-item-issue').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('mudança de preço atualiza o total do carrinho em tempo real', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    const total = page.locator('[data-testid="total"]:visible').first()
    const before = await total.textContent()
    await demoScenario(page, 'price-changed', { nftId: 'nft_12', priceEth: '0.5' })
    await expect(total).not.toHaveText(before!)
    await expect(page.getByTestId('cart-item-issue').first()).toContainText('O preço mudou')
  })

  test('pedido pendente com socket derrubado conclui pela consulta REST', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await demoScenario(page, 'disconnect-pending-order')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed', { timeout: 30_000 })
    const orders = (await api<{ items: { status: string }[] }>(page, 'GET', '/api/orders')).body.items
    expect(orders.map((order) => order.status)).toEqual(['confirmed'])
  })

  test('recibo confirmado não é alterado por eventos antigos ou repetidos', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed', { timeout: 20_000 })
    const total = await page.getByTestId('receipt-total').first().textContent()

    const orderId = page.url().split('/').pop()!
    await demoScenario(page, 'duplicate-events', { eventResource: { type: 'order', id: orderId } })
    await demoScenario(page, 'stale-events', { eventResource: { type: 'order', id: orderId } })
    await demoScenario(page, 'price-changed', { nftId: 'nft_12', priceEth: '0.9' })
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed')
    await expect(page.getByTestId('receipt-total').first()).toHaveText(total!)
  })
})

test.describe('estados de carregamento e falha', () => {
  test('rede lenta mostra skeleton animado antes do catálogo', async ({ page }) => {
    await page.goto('/mercado')
    await expect(page.locator('[data-testid="nft-card"]:visible').first()).toBeVisible()
    await demoScenario(page, 'slow-network', { ms: 1500 })
    await page.goto('/mercado?q=golden')
    const skeleton = page.getByTestId('grid-skeleton')
    await expect(skeleton).toBeVisible()
    const animation = await skeleton.locator('.skeleton').first().evaluate((element) => getComputedStyle(element).animationName)
    expect(animation).not.toBe('none')
    await expect(page.locator('[data-testid="nft-card"]:visible').first()).toBeVisible({ timeout: 10_000 })
  })

  test('falha no detalhe oferece nova tentativa que recupera', async ({ page }) => {
    await page.goto('/mercado')
    await demoScenario(page, 'http-5xx', { match: 'GET /api/nfts/nft_12' })
    await page.goto('/nft/nft_12')
    await expect(page.getByTestId('nft-error')).toBeVisible()
    await demoScenario(page, 'happy-path')
    await page.getByTestId('nft-error').getByRole('button').click()
    await expect(page.getByTestId('nft-detail')).toBeVisible()
  })

  test('falha ao carregar o carrinho tem retry; offline em /api/cart não derruba a página', async ({ page }) => {
    await page.goto('/mercado')
    await demoScenario(page, 'offline', { match: 'GET /api/cart' })
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-error')).toBeVisible()
    await demoScenario(page, 'happy-path')
    await page.getByTestId('cart-error').getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('erro 5xx na cotação mostra mensagem e permite tentar de novo', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await demoScenario(page, 'http-5xx', { match: 'POST /api/quotes' })
    await page.reload()
    await expect(page.getByTestId('quote-error')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await demoScenario(page, 'happy-path')
    await page.getByTestId('quote-error').getByRole('button', { name: 'Tentar de novo' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
  })
})

test.describe('teclado e foco', () => {
  test('login pode ser feito só pelo teclado e o foco volta ao disparador ao fechar', async ({ page }) => {
    const mobile = (page.viewportSize()?.width ?? 0) < 768
    await page.goto('/mercado')
    // No mobile não há header: o login abre pelo favorito de um card, que exige conta
    const trigger = mobile
      ? page.getByRole('button', { name: /^Favoritar / }).first()
      : page.getByRole('button', { name: 'Entrar', exact: true })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.locator(':focus')).toHaveCount(1)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()

    await page.keyboard.press('Enter')
    await expect(dialog.getByPlaceholder('contato@email.com')).toBeFocused()
    await page.keyboard.type('demo1@example.test')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Demo@1234')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect.poll(() => page.evaluate(() => localStorage.getItem('jg-session-token'))).toBeTruthy()
    if (!mobile) await expect(page.getByRole('link', { name: 'Marina' })).toBeVisible()
  })

  test('campos do formulário de pagamento têm rótulo e erro anunciado', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    const isMobile = (page.viewportSize()?.width ?? 0) < 768
    if (isMobile) await page.getByText('Dados do colecionador').click()
    const email = page.getByLabel(/^E-mail/).first()
    await email.fill('invalido')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('payment-form-error')).toBeVisible()
  })

  test('diálogo de login prende o foco e rótulos existem em todos os campos', async ({ page }) => {
    await page.goto('/perfil')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    const unlabeled = await dialog.locator('input').evaluateAll((inputs) =>
      inputs.filter((input) => !(input as HTMLInputElement).labels?.length && !input.getAttribute('aria-label')).length,
    )
    expect(unlabeled).toBe(0)
    for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab')
    expect(await dialog.locator(':focus').count()).toBe(1)
  })

  test('perfil: sessão iniciada leva ao formulário acessível por rótulo', async ({ page }) => {
    await signIn(page)
    await expect(page.getByLabel('Nome de exibição')).toBeVisible()
  })
})
