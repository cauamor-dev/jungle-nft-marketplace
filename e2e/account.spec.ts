import { expect, test } from '@playwright/test'
import { api, demoScenario, demoUser, expectNoHorizontalOverflow, goToPaymentLoggedIn, loginThroughDialog, signIn, signOut } from './helpers'

const savedFavorites = (page: import('@playwright/test').Page) =>
  expect.poll(async () => (await api<{ nftIds: string[] }>(page, 'GET', '/api/favorites')).body.nftIds)

async function openAccount(page: import('@playwright/test').Page, path = '/perfil') {
  await page.goto(path)
  await loginThroughDialog(page)
  await expect(page.getByRole('dialog')).toBeHidden()
}

test.describe('favoritos', () => {
  test('favoritar como visitante pede login; depois de entrar, o favorito é salvo e aparece na lista', async ({ page }) => {
    await page.goto('/nft/nft_12')
    await page.getByRole('button', { name: /favoritar/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await loginThroughDialog(page)
    await expect(page.getByRole('dialog')).toBeHidden()
    // Sem segundo clique: a ação pedida antes do login é concluída sozinha
    await expect(page.getByTestId('nft-detail').locator('button[aria-pressed]').first()).toHaveAttribute('aria-pressed', 'true')
    await savedFavorites(page).toContain('nft_12')

    await page.goto('/perfil/favoritos')
    await expect(page.getByTestId('favorites-list').locator('[data-testid="nft-card"]:visible')).toHaveCount(1)
  })

  test('falha ao favoritar desfaz a atualização otimista e avisa o usuário', async ({ page }) => {
    await signIn(page)
    await page.goto('/nft/nft_12')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await demoScenario(page, 'http-5xx', { match: 'POST /api/favorites' })
    const button = page.getByRole('button', { name: /favoritar/i }).first()
    await button.click()
    await expect(page.getByText(/não foi possível atualizar seus favoritos/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /favorit/i }).first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('remover da lista de interesse atualiza a página', async ({ page }) => {
    await signIn(page)
    await page.goto('/nft/nft_12')
    await page.getByRole('button', { name: /favoritar/i }).first().click()
    await expect(page.getByRole('button', { name: /favorit/i }).first()).toHaveAttribute('aria-pressed', 'true')
    await savedFavorites(page).toContain('nft_12')
    await page.goto('/perfil/favoritos')
    await page.locator('[data-testid="nft-card"]:visible').first().getByRole('button', { name: /^Remover .* dos favoritos/ }).first().click()
    await expect(page.getByTestId('favorites-empty')).toBeVisible()
  })
})

test.describe('perfil', () => {
  test('edita dados, valida campos e persiste após refresh', async ({ page }) => {
    await openAccount(page)
    const name = page.getByLabel('Nome de exibição')
    await expect(name).toHaveValue('Marina Duarte')

    await name.fill('')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByTestId('profile-form').locator('[aria-invalid="true"]').first()).toBeVisible()

    await name.fill('Marina D. Duarte')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()
    await page.reload()
    await expect(page.getByLabel('Nome de exibição')).toHaveValue('Marina D. Duarte')
  })

  test('e-mail de outro usuário é recusado pelo servidor', async ({ page }) => {
    await openAccount(page)
    await page.getByTestId('profile-form').getByLabel(/^E-mail/).fill('demo2@example.test')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Este e-mail já está em uso.')).toBeVisible()
  })

  test('avatar aceita imagem válida, recusa arquivo inválido e pode ser removido', async ({ page }) => {
    await openAccount(page)
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const input = page.getByLabel('Escolher imagem do avatar')
    await input.setInputFiles({ name: 'texto.txt', mimeType: 'text/plain', buffer: Buffer.from('não é imagem') })
    await expect(page.getByTestId('avatar-field').getByRole('alert')).toBeVisible()

    await input.setInputFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: png })
    await expect(page.getByText('Avatar atualizado.')).toBeVisible()
    await page.getByTestId('avatar-field').getByRole('button', { name: 'Remover' }).click()
    await expect(page.getByText('Avatar removido.')).toBeVisible()
  })

  test('troca de senha exige a atual e permite entrar com a nova', async ({ page }) => {
    await openAccount(page)
    await page.getByLabel('Senha atual').fill('errada')
    await page.getByLabel('Nova senha', { exact: true }).fill('Outra@12345')
    await page.getByLabel('Confirmar nova senha').fill('Outra@12345')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('A senha atual não confere.')).toBeVisible()

    await page.getByLabel('Senha atual').fill(demoUser.password)
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText('Perfil atualizado.')).toBeVisible()

    await signOut(page)
    await page.goto('/perfil')
    await loginThroughDialog(page, demoUser)
    await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible()
    await expect(page.getByTestId('profile-form')).toHaveCount(0)
    await page.getByRole('dialog').getByPlaceholder('Senha').fill('Outra@12345')
    await page.getByRole('dialog').getByRole('button', { name: 'Entrar', exact: true }).last().click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByTestId('profile-form')).toBeVisible()
  })

  test('perfil e senha salvos juntos: se só a senha falha, a tela diz que o perfil foi salvo', async ({ page }) => {
    await openAccount(page)
    await page.getByLabel('Nome de exibição').fill('Marina Nova')
    await page.getByLabel('Senha atual').fill('Errada@123')
    await page.getByLabel('Nova senha', { exact: true }).fill('Outra@12345')
    await page.getByLabel('Confirmar nova senha').fill('Outra@12345')
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/Os dados do perfil foram salvos, mas a senha não foi alterada/)).toBeVisible()
    expect((await api<{ user: { name: string } }>(page, 'GET', '/api/auth/session')).body.user.name).toBe('Marina Nova')
  })
})

test.describe('carteiras', () => {
  test('carteira principal conecta e desconecta; recusa mostra erro', async ({ page }) => {
    await openAccount(page, '/perfil/carteiras')
    const primary = page.getByTestId('wallet-primary')
    await expect(primary.getByTestId('wallet-connection')).toContainText(/desconectada/i)

    await demoScenario(page, 'wallet-refused')
    await primary.getByRole('button', { name: 'Conectar' }).click()
    await expect(page.getByText(/recusou a conexão/i)).toBeVisible()
    await expect(primary.getByTestId('wallet-connection')).toContainText(/desconectada/i)

    await demoScenario(page, 'happy-path')
    await primary.getByRole('button', { name: 'Conectar' }).click()
    await expect(primary.getByTestId('wallet-connection')).toContainText(/conectada/i)
    await expect(primary.getByTestId('wallet-connection')).not.toContainText(/desconectada/i)
    await primary.getByRole('button', { name: 'Desconectar' }).click()
    await expect(primary.getByTestId('wallet-connection')).toContainText(/desconectada/i)
  })

  test('endereço repetido entre carteiras é recusado', async ({ page }) => {
    await openAccount(page, '/perfil/carteiras')
    const primaryAddress = await page.getByTestId('wallet-primary').getByLabel('Endereço da carteira').inputValue()
    const secondary = page.getByTestId('wallet-secondary')
    await secondary.getByLabel('Endereço da carteira').fill(primaryAddress)
    await secondary.getByRole('button', { name: /salvar|cadastrar/i }).click()
    await expect(secondary.getByText('Você já cadastrou este endereço.')).toBeVisible()
  })

  test('pagamento com carteira já cadastrada abre pronto para confirmar e sem scroll lateral', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeEnabled()
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('atividade', () => {
  test('lista de pedidos mostra o status e o recibo abre pelo histórico', async ({ page }) => {
    await goToPaymentLoggedIn(page)
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await page.waitForURL('**/pedido/**')
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed', { timeout: 20_000 })
    const orderId = new URL(page.url()).pathname
    await page.goto('/perfil/atividade')
    await expect(page.getByTestId('order-row')).toHaveCount(1)
    await expect(page.getByTestId('order-status')).toContainText(/confirmad/i)
    await page.getByTestId('order-row').getByRole('link').first().click()
    await expect(page.getByTestId('order-receipt')).toHaveAttribute('data-status', 'confirmed')
    expect(new URL(page.url()).pathname).toBe(orderId)
  })
})
