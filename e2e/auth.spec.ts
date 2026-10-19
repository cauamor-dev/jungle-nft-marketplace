import { expect, test } from '@playwright/test'
import { api, demoScenario, demoUser, loginThroughDialog, signIn, signOut } from './helpers'

test.describe('autenticação', () => {
  test('área privada abre o login e volta ao destino original', async ({ page }) => {
    await page.goto('/perfil/carteiras')
    await expect(page.getByRole('dialog')).toBeVisible()
    await loginThroughDialog(page)
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page).toHaveURL(/\/perfil\/carteiras/)
    await expect(page.getByTestId('wallet-primary')).toBeVisible()
  })

  test('credenciais erradas mostram erro sem fechar o diálogo; campos vazios mostram validação', async ({ page }) => {
    await page.goto('/perfil')
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).last().click()
    await expect(dialog.getByText('Informe um e-mail válido')).toBeVisible()

    await loginThroughDialog(page, { email: demoUser.email, password: 'senha-errada' })
    await expect(dialog.getByRole('alert')).toBeVisible()
    await expect(dialog).toBeVisible()
  })

  test('cadastro valida a senha, rejeita e-mail repetido e entra após criar a conta', async ({ page }) => {
    await page.goto('/perfil')
    const dialog = page.getByRole('dialog')
    const mobile = (page.viewportSize()?.width ?? 0) < 768
    if (mobile) await dialog.getByRole('button', { name: 'Crie uma conta' }).click()
    else await dialog.getByRole('tab', { name: 'Criar conta' }).click()

    await dialog.getByPlaceholder('Nome de usuário').fill('novo.colecionador')
    await dialog.getByPlaceholder('Digite seu e-mail').fill('novo@example.test')
    await dialog.getByPlaceholder('Senha', { exact: true }).fill('fraca')
    await dialog.getByPlaceholder('Confirmar senha').fill('outra')
    await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(dialog.getByRole('alert').first()).toBeVisible()

    await dialog.getByPlaceholder('Senha', { exact: true }).fill('Forte@1234')
    await dialog.getByPlaceholder('Confirmar senha').fill('Forte@1234')
    await dialog.getByPlaceholder('Digite seu e-mail').fill(demoUser.email)
    await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(dialog).toContainText(/já existe|em uso/i)

    await dialog.getByPlaceholder('Digite seu e-mail').fill('novo@example.test')
    await dialog.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/\/perfil$/)
    await expect(page.getByTestId('profile-form')).toBeVisible()
  })

  test('sessão persiste após refresh e sair limpa dados privados', async ({ page }) => {
    await page.goto('/perfil')
    await loginThroughDialog(page)
    await expect(page.getByTestId('profile-form')).toBeVisible()
    await page.reload()
    await expect(page.getByTestId('profile-form')).toBeVisible()

    await page.getByRole('button', { name: 'Sair' }).first().click()
    await page.waitForURL((url) => url.pathname === '/')
    await page.goto('/perfil')
    await expect(page.getByTestId('profile-form')).toHaveCount(0)
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('trocar de usuário não vaza favoritos nem carrinho do anterior', async ({ page }) => {
    await signIn(page)
    await page.goto('/nft/nft_12')
    await page.getByRole('button', { name: /favoritar/i }).first().click()
    await expect(page.getByRole('button', { name: /favorit/i }).first()).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(async () => (await api<{ nftIds: string[] }>(page, 'GET', '/api/favorites')).body.nftIds).toContain('nft_12')
    await page.getByRole('button', { name: /comprar/i }).first().click()
    await page.waitForURL('**/carrinho')
    await expect(page.locator('[data-testid="cart-item"]:visible')).toHaveCount(1)

    await signOut(page)
    await signIn(page, { email: 'demo2@example.test', password: demoUser.password })
    await page.goto('/perfil/favoritos')
    await expect(page.getByTestId('favorites-empty')).toBeVisible()
    await page.goto('/carrinho')
    await expect(page.getByTestId('cart-empty')).toBeVisible()
  })

  test('sessão expirada com a página aberta pede novo login', async ({ page }) => {
    await page.goto('/perfil/atividade')
    await loginThroughDialog(page)
    await expect(page.getByTestId('orders-empty').or(page.getByTestId('orders-list'))).toBeVisible()
    await demoScenario(page, 'expired-session')
    await page.reload()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('carrinho de visitante é incorporado ao carrinho do usuário no login', async ({ page }) => {
    await page.goto('/nft/nft_12')
    await page.getByRole('button', { name: /comprar/i }).first().click()
    await page.waitForURL('**/carrinho')
    await page.goto('/perfil')
    await loginThroughDialog(page)
    await expect(page.getByTestId('profile-form')).toBeVisible()
    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"]:visible')).toHaveCount(1)
  })

  test('login avisa quando o carrinho do visitante não cabe inteiro na conta', async ({ page }) => {
    await signIn(page)
    const held = await api(page, 'POST', '/api/cart/items', { nftId: 'nft_01', editionId: 'nft_01_1of50', quantity: 8 })
    expect(held.status).toBe(201)
    await signOut(page)

    const guest = await api(page, 'POST', '/api/cart/items', { nftId: 'nft_01', editionId: 'nft_01_1of50', quantity: 3 })
    expect(guest.status).toBe(201)
    await page.goto('/perfil')
    await loginThroughDialog(page)
    await expect(page.getByText('Nem todos os itens do carrinho de visitante couberam na conta.')).toBeVisible()

    await page.goto('/carrinho')
    await expect(page.locator('[data-testid="cart-item"]:visible output')).toHaveText('10')
  })
})
