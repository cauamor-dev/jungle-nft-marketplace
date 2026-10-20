import { expect, test, type Page } from '@playwright/test'
import { addFromDetail, api, signIn, signOut } from './helpers'

test.setTimeout(90_000)

type Account = { username: string; email: string; password: string }

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

async function register(page: Page, account: Account) {
  await page.goto('/perfil')
  const dialog = page.getByRole('dialog')
  if (isMobile(page)) await dialog.getByRole('button', { name: 'Crie uma conta' }).click()
  else await dialog.getByRole('tab', { name: 'Criar conta' }).click()
  await dialog.getByPlaceholder('Nome de usuário').fill(account.username)
  await dialog.getByPlaceholder('Digite seu e-mail').fill(account.email)
  await dialog.getByPlaceholder('Senha', { exact: true }).fill(account.password)
  await dialog.getByPlaceholder('Confirmar senha').fill(account.password)
  await dialog.getByRole('button', { name: /^Criar (conta|perfil)$/ }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('profile-form')).toBeVisible()
}

const field = (page: Page, name: string) => page.getByTestId('profile-form').locator(`[name="${name}"]`)

// Conta recém-criada não tem carteira: o endereço digitado no pagamento é cadastrado e conectado antes do pedido.
async function buyWithNewWallet(page: Page, nftId: string, address: string) {
  await addFromDetail(page, nftId)
  await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await page.waitForURL('**/pagamento')
  if (isMobile(page)) await page.locator('summary', { hasText: 'Dados do colecionador' }).click()
  const form = page.getByTestId('collector-form')
  await form.locator('[name="network"]').selectOption('ethereum')
  await form.locator('[name="profileName"]').fill('perfil-de-teste')
  await form.locator('[name="walletAddress"]').fill(address)
  // Código de indicação fica em branco: é opcional
  await expect(form.locator('[name="referralCode"]')).toHaveValue('')
  const confirm = page.getByRole('button', { name: 'Confirmar compra' })
  await expect(confirm).toBeEnabled({ timeout: 15_000 })
  await confirm.click()
  await page.waitForURL('**/pedido/**')
  await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed', { timeout: 20_000 })
  return new URL(page.url()).pathname.split('/').pop()!
}

async function favorite(page: Page) {
  // O primeiro é o da obra; os seguintes são dos cards relacionados
  const button = page.getByTestId('nft-detail').locator('button[aria-pressed]').first()
  const saved = page.waitForResponse((response) => response.url().includes('/api/favorites') && response.request().method() !== 'GET')
  await button.click()
  expect((await saved).ok()).toBe(true)
  await expect(button).toHaveAttribute('aria-pressed', 'true')
}

async function orderIds(page: Page) {
  await page.goto('/perfil/atividade')
  await expect(page.getByTestId('order-row').or(page.getByTestId('orders-empty')).first()).toBeVisible()
  return (await page.getByTestId('order-row').allInnerTexts()).map((text) => /Pedido (\S+)/.exec(text)?.[1])
}

test.describe('jornada de uma conta nova', () => {
  test('cadastro, perfil, favorito, compra e histórico persistem após reload, logout e novo login', async ({ page }) => {
    const account = { username: 'novo.colecionador', email: 'novo@example.test', password: 'Forte@1234' }
    const wallet = '0x1111111111111111111111111111111111111111'
    await register(page, account)

    // Conta nova salva o perfil na primeira tentativa, com acento no nome de usuário
    await field(page, 'name').fill('Cauã Moreira')
    await field(page, 'username').fill('Cauã.Moreira')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    if (!isMobile(page)) await expect(page.getByRole('link', { name: 'Cauã' })).toBeVisible()
    await page.reload()
    await expect(field(page, 'username')).toHaveValue('Cauã.Moreira')
    await expect(field(page, 'name')).toHaveValue('Cauã Moreira')

    await page.goto('/nft/nft_05')
    await favorite(page)

    const orderId = await buyWithNewWallet(page, 'nft_12', wallet)
    expect(await orderIds(page)).toEqual([orderId])
    await expect(page.getByTestId('order-status')).toHaveText('Confirmado')

    // Um item fica no carrinho para conferir depois do novo login
    await addFromDetail(page, 'nft_05')
    await signOut(page)
    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"]:visible')).toHaveCount(0)

    await signIn(page, account)
    await expect(field(page, 'username')).toHaveValue('Cauã.Moreira')
    expect(await orderIds(page)).toEqual([orderId])
    await page.goto('/perfil/favoritos')
    await expect(page.locator('[data-testid="nft-card"][data-nft-id="nft_05"]:visible')).toBeVisible()
    await page.goto('/perfil/carteiras')
    await expect(page.getByTestId('wallet-primary').locator('[name="address"]')).toHaveValue(wallet)
    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"][data-nft-id="nft_05"]:visible')).toBeVisible()

    // A sessão continua depois de recarregar
    await page.goto('/perfil')
    await page.reload()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(field(page, 'username')).toHaveValue('Cauã.Moreira')
  })
})

test.describe('isolamento entre contas', () => {
  test('pedido, favoritos, carteira e carrinho de uma conta não aparecem para outra', async ({ page }) => {
    const account = { username: 'conta.a', email: 'conta.a@example.test', password: 'Forte@1234' }
    const demo2 = { email: 'demo2@example.test', password: 'Demo@1234' }
    const wallet = '0x2222222222222222222222222222222222222222'
    await register(page, account)
    await page.goto('/nft/nft_07')
    await favorite(page)
    const orderId = await buyWithNewWallet(page, 'nft_12', wallet)
    await addFromDetail(page, 'nft_07')
    await signOut(page)

    await signIn(page, demo2)
    const demo2Orders = await orderIds(page)
    expect(demo2Orders).not.toContain(orderId)
    expect(demo2Orders.length).toBeGreaterThan(0)
    expect((await api(page, 'GET', `/api/orders/${orderId}`)).status).toBe(403)
    await page.goto('/perfil/favoritos')
    await expect(page.locator('[data-testid="nft-card"][data-nft-id="nft_07"]:visible')).toHaveCount(0)
    await page.goto('/perfil/carteiras')
    for (const input of await page.locator('[name="address"]').all()) await expect(input).not.toHaveValue(wallet)
    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"][data-nft-id="nft_07"]:visible')).toHaveCount(0)
    await signOut(page)

    await signIn(page, account)
    expect(await orderIds(page)).toEqual([orderId])
    await page.goto('/perfil/favoritos')
    await expect(page.locator('[data-testid="nft-card"][data-nft-id="nft_07"]:visible')).toBeVisible()
    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"][data-nft-id="nft_07"]:visible')).toBeVisible()
  })
})
