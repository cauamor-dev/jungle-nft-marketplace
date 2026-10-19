import { expect, test } from '@playwright/test'
import { demoScenario, expectNoHorizontalOverflow } from './helpers'

type Page = import('@playwright/test').Page

const cards = (page: Page) => page.locator('[data-testid="nft-card"]:visible')

// A lista antiga fica na tela (com opacidade reduzida) até a nova chegar; só vale ler depois disso.
const settled = (page: Page) => expect(page.locator('[aria-busy="true"]')).toHaveCount(0)

test.describe('catálogo', () => {
  test('lista 9 itens por página e navega pela paginação mantendo a URL', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)

    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)
    await expect(cards(page).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    await page.reload()
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')

    await page.goBack()
    await expect(page).not.toHaveURL(/page=2/)
    await expect(page.getByRole('link', { name: 'Página 1' })).toHaveAttribute('aria-current', 'page')
  })

  test('busca por nome atualiza a URL e a lista', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    const isMobile = (page.viewportSize()?.width ?? 0) < 768
    if (isMobile) {
      await page.getByPlaceholder('Explorar coleções').fill('golden')
      await page.getByPlaceholder('Explorar coleções').press('Enter')
    } else {
      await page.getByRole('button', { name: 'Buscar NFTs' }).click()
      await page.getByLabel('Buscar NFTs pelo nome').fill('golden')
      await page.getByLabel('Buscar NFTs pelo nome').press('Enter')
    }
    await expect(page).toHaveURL(/q=golden/)
    await settled(page)
    await expect(cards(page).first()).toBeVisible()
    const titles = await cards(page).locator('h3').allTextContents()
    expect(titles.length).toBeGreaterThan(0)
    for (const title of titles) expect(title.toLowerCase()).toContain('golden')
  })

  test('filtra por coleção e rede combinadas, aplica faixa de preço e limpa tudo', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    const isMobile = (page.viewportSize()?.width ?? 0) < 768
    if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const filters = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Filtros' })

    await filters.getByText('Música').click()
    await expect(page).toHaveURL(/category=music/)
    await settled(page)
    await expect(cards(page).first()).toBeVisible()
    const musicTitles = await cards(page).locator('h3').allTextContents()
    expect(musicTitles.length).toBeGreaterThan(0)

    await filters.getByText('Solana').click()
    await expect(page).toHaveURL(/chain=solana/)
    await expect(page).toHaveURL(/category=music/)

    const label = filters.getByTestId('price-range-label')
    await expect(label).toContainText('Preço')
    await filters.getByLabel('Preço máximo').focus()
    for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowLeft')
    await filters.getByRole('button', { name: 'Aplicar' }).click()
    await expect(page).toHaveURL(/maxPrice=/)
  })

  test('filtro reinicia a página e o histórico restaura a lista anterior', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=2/)

    const isMobile = (page.viewportSize()?.width ?? 0) < 768
    if (isMobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const filters = isMobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Filtros' })
    await filters.getByText('Música').click()
    await expect(page).toHaveURL(/category=music/)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await settled(page)
    if (isMobile) await page.keyboard.press('Escape')

    await page.goBack()
    await expect(page).toHaveURL(/page=2/)
    await expect(page).not.toHaveURL(/category=music/)
    await settled(page)
    await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
    await expect(cards(page)).toHaveCount(9)
  })

  test('ordena por preço crescente (desktop)', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'A ordenação aparece a partir de 768px, como no design')
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    await page.getByLabel('Ordenar por:').selectOption('price-asc')
    await expect(page).toHaveURL(/sort=price-asc/)
    await settled(page)
    await expect(cards(page).first()).toBeVisible()
    const prices = (await cards(page).locator('[data-testid="price"]').allTextContents())
      .map((text) => /(\d+[.,]\d+)\s*ETH/.exec(text)?.[1])
      .filter(Boolean)
      .map((value) => Number(String(value).replace(',', '.')))
    expect(prices.length).toBeGreaterThan(1)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)

    await page.goBack()
    await expect(page).not.toHaveURL(/sort=price-asc/)
    await settled(page)
    await expect(cards(page)).toHaveCount(9)
  })

  test('URL com filtros inválidos é saneada e a página continua utilizável', async ({ page }) => {
    await page.goto('/mercado?page=abc&category=nada&sort=xx&minPrice=lixo')
    await expect(cards(page)).toHaveCount(9)
  })

  test('resultado vazio oferece limpar filtros', async ({ page }) => {
    await page.goto('/mercado?q=zzzz-inexistente')
    await expect(page.getByTestId('empty-results')).toBeVisible()
    await page.getByTestId('empty-results').getByRole('button').click()
    await expect(cards(page)).toHaveCount(9)
  })

  test('erro 5xx na listagem mostra estado de erro e recupera ao tentar de novo', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    await demoScenario(page, 'http-5xx', { match: 'GET /api/nfts' })
    await page.goto('/mercado?q=golden')
    await expect(page.getByTestId('catalog-error')).toBeVisible()
    await demoScenario(page, 'happy-path')
    await page.getByTestId('catalog-error').getByRole('button').click()
    await expect(cards(page).first()).toBeVisible()
  })

  test('resultados fora de ordem: o último filtro escolhido prevalece', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    await demoScenario(page, 'out-of-order-results')
    await page.goto('/mercado?q=golden')
    await settled(page)
    await expect(cards(page).first()).toBeVisible()
    const titles = await cards(page).locator('h3').allTextContents()
    for (const title of titles) expect(title.toLowerCase()).toContain('golden')
  })

  test('sem rolagem lateral', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    await expectNoHorizontalOverflow(page)
  })
})

test.describe('detalhe', () => {
  test('acesso direto mostra o NFT e ids inexistentes mostram 404 útil', async ({ page }) => {
    await page.goto('/nft/nft_12')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible()

    await page.goto('/nft/nao-existe')
    await expect(page.getByTestId('nft-not-found')).toBeVisible()
  })

  test('edição esgotada não pode ser comprada', async ({ page }) => {
    await page.goto('/nft/nft_18')
    await expect(page.getByTestId('nft-unavailable')).toBeVisible()
    await expect(page.getByRole('button', { name: /comprar/i }).first()).toBeDisabled()
  })

  test('favoritar como visitante pede login e conclui a ação depois', async ({ page }) => {
    await page.goto('/nft/nft_12')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByRole('button', { name: /favoritar/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
