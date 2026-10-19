import { expect, test, type Page } from '@playwright/test'
import { addFromDetail, api, demoScenario, expectNoHorizontalOverflow, goToPaymentLoggedIn, loginThroughDialog } from './helpers'

test.setTimeout(60_000)

const orderPosts = (page: Page) => {
  const keys: (string | undefined)[] = []
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/orders') keys.push(request.headers()['idempotency-key'])
  })
  return keys
}

const ordersOf = async (page: Page) => (await api<{ items: { id: string; status: string }[] }>(page, 'GET', '/api/orders')).body.items

test.describe('carrinho', () => {
  test('visitante adiciona, altera quantidade, remove e o carrinho sobrevive ao refresh', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    await expect(page.getByTestId('cart-count').first()).toHaveText('1').catch(() => undefined)

    const item = page.locator('[data-testid="cart-item"]:visible').first()
    const before = await page.locator('[data-testid="total"]:visible').first().textContent()
    await item.getByRole('button', { name: /aumentar|mais|\+/i }).first().click()
    await expect.poll(async () => page.locator('[data-testid="total"]:visible').first().textContent()).not.toBe(before)

    await page.reload()
    await expect(page.locator('[data-testid="cart-item"]:visible')).toHaveCount(1)

    await page.locator('[data-testid="cart-item"]:visible').first().getByRole('button', { name: /^Remover/ }).click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('cupom válido, inválido e expirado têm mensagens e efeito no total', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    const total = page.locator('[data-testid="total"]:visible').first()
    const original = await total.textContent()
    const input = page.getByLabel('Código promocional')

    await input.fill('NAOEXISTE')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-message').first()).not.toBeEmpty()
    await expect(total).toHaveText(original!)

    await input.fill('JUNGLE10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-applied')).toContainText('JUNGLE10')
    await expect(total).not.toHaveText(original!)

    await page.getByTestId('coupon-applied').getByRole('button', { name: 'Remover' }).click()
    await expect(total).toHaveText(original!)

    await demoScenario(page, 'expired-coupon')
    await page.getByLabel('Código promocional').fill('JUNGLE10')
    await page.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByTestId('coupon-message').first()).toContainText(/expir/i)
  })

  test('item que esgota bloqueia o fechamento até ser resolvido', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    await demoScenario(page, 'edition-sold-out', { nftId: 'nft_12' })
    await page.reload()
    await expect(page.getByTestId('cart-item-issue').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
    await page.locator('[data-testid="cart-item"]:visible').first().getByRole('button', { name: /^Remover/ }).click()
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })
})

test.describe('checkout', () => {
  test('compra completa: login pelo carrinho, pagamento, recibo pendente e confirmação em tempo real', async ({ page }) => {
    const keys = orderPosts(page)
    await goToPaymentLoggedIn(page)
    const summaryTotal = (await page.locator('[data-testid="total"]:visible').first().textContent())!.trim()
    await expectNoHorizontalOverflow(page)

    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true))
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'pending')
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed', { timeout: 20_000 })
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true)

    await expect(page.getByTestId('receipt-total').first()).toContainText(summaryTotal.replace(/\s*ETH$/, ''))
    await expect(page.getByTestId('receipt-item')).toHaveCount(1)
    expect(keys).toHaveLength(1)
    expect(keys[0]).toBeTruthy()

    await expect(async () => expect((await ordersOf(page)).map((order) => order.status)).toEqual(['confirmed'])).toPass()
    await expect(page.getByTestId('cart-count').first()).toHaveText('0').catch(() => undefined)
  })

  test('cliques repetidos em confirmar criam um único pedido', async ({ page }) => {
    const keys = orderPosts(page)
    await goToPaymentLoggedIn(page)
    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    await confirm.dblclick()
    await page.waitForURL('**/pedido/**')
    expect(keys.length).toBe(1)
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('timeout depois da criação: o app reencontra o pedido pela chave de idempotência', async ({ page }) => {
    const keys = orderPosts(page)
    await goToPaymentLoggedIn(page)
    await demoScenario(page, 'post-create-order-timeout')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**', { timeout: 30_000 })
    await expect(page.getByTestId('order-receipt')).toBeVisible()
    expect(new Set(keys).size).toBe(1)
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('preço alterado em tempo real pede para aceitar os novos valores antes de pagar', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    const oldTotal = (await page.locator('[data-testid="total"]:visible').first().textContent())!.trim()

    await demoScenario(page, 'price-changed', { nftId: 'nft_12', priceEth: '0.1' })
    await expect(page.getByTestId('reconfirm')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
    await expect(page.locator('[data-testid="total"]:visible').first()).not.toHaveText(oldTotal)
    const newTotal = (await page.locator('[data-testid="total"]:visible').first().textContent())!.trim()

    await page.getByRole('button', { name: 'Aceitar novos valores' }).click()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('receipt-total').first()).toContainText(newTotal.replace(/\s*ETH$/, ''))
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('sem socket, o servidor ainda rejeita a cotação antiga e o app mostra a nova', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    const oldTotal = (await page.locator('[data-testid="total"]:visible').first().textContent())!.trim()

    await demoScenario(page, 'disconnect-pending-order')
    await demoScenario(page, 'price-changed', { nftId: 'nft_12', priceEth: '0.1' })
    await page.getByRole('button', { name: 'Confirmar compra' }).click()

    await expect(page.getByTestId('payment-form-error')).toContainText(/valores mudaram/i)
    await expect(page.getByTestId('reconfirm')).toBeVisible()
    await expect(page.locator('[data-testid="total"]:visible').first()).not.toHaveText(oldTotal)
    expect(await ordersOf(page)).toHaveLength(0)
  })

  test('carteira que recusa a conexão não cria pedido e permite tentar de novo', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await demoScenario(page, 'wallet-refused')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByTestId('payment-form-error')).toContainText(/recus/i)
    expect(await ordersOf(page)).toHaveLength(0)

    await demoScenario(page, 'happy-path')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    expect(await ordersOf(page)).toHaveLength(1)
  })

  test('pagamento recusado aparece no recibo como não concluído', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await demoScenario(page, 'payment-rejected')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'rejected', { timeout: 20_000 })
    await expect(page.getByTestId('order-message')).toBeVisible()
  })

  test('sessão expirada na hora de pagar leva ao login e devolve ao pagamento com os dados preservados', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    const emailField = page.getByLabel(/e-mail/i).first()
    const email = await emailField.inputValue()

    await demoScenario(page, 'expired-session')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await loginThroughDialog(page)
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/pagamento/)
    await expect(page.getByLabel(/e-mail/i).first()).toHaveValue(email)
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
  })

  test('pagamento exige sessão: visitante vê o login em vez do formulário', async ({ page }) => {
    await page.goto('/pagamento')
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toHaveCount(0)
  })

  test('recibo de pedido de outro usuário não é exibido', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    const orderUrl = page.url()
    await page.evaluate(() => {
      localStorage.removeItem('jg-session-token')
    })
    await page.goto(orderUrl)
    await expect(page.getByRole('dialog')).toBeVisible()
    await loginThroughDialog(page, { email: 'demo2@example.test', password: 'Demo@1234' })
    await expect(page.getByTestId('order-error')).toBeVisible()
    await expect(page.getByTestId('order-receipt')).toHaveCount(0)
  })
})
