import { expect, test } from '@playwright/test'
import { api, demoScenario, expectNoHorizontalOverflow } from './helpers'

type Page = import('@playwright/test').Page

const cards = (page: Page) => page.locator('[data-testid="nft-card"]:visible')
const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

// Feed do celular: cada página carregada soma 9 cards (36 no total) e o número fica na URL
async function feedMatchesUrl(page: Page) {
  let expected = 0
  await expect
    .poll(async () => {
      const loadedPages = Number(new URL(page.url()).searchParams.get('page') ?? '1')
      expected = Math.min(36, loadedPages * 9)
      return loadedPages >= 2 && (await cards(page).count()) === expected
    })
    .toBe(true)
  return expected
}

// A lista antiga fica na tela (com opacidade reduzida) até a nova chegar; só vale ler depois disso.
const settled = (page: Page) => expect(page.locator('[aria-busy="true"]')).toHaveCount(0)

test.describe('catálogo', () => {
  test('lista 9 itens por página e navega pela paginação mantendo a URL (no celular, carrega mais no mesmo feed)', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)

    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Carregar mais' }).click()
      // Perto do fim da lista a página seguinte também carrega sozinha: a URL diz quantas páginas estão na tela
      const loaded = await feedMatchesUrl(page)
      await page.reload()
      await expect(cards(page)).toHaveCount(loaded)
      return
    }

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

  test('filtra por coleção e rede combinadas e aplica faixa de preço', async ({ page }) => {
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
    const mobile = isMobile(page)
    if (mobile) await page.getByRole('button', { name: 'Carregar mais' }).click()
    else await page.getByRole('link', { name: 'Página 2' }).click()
    await expect(page).toHaveURL(/page=\d/)
    const loaded = mobile ? await feedMatchesUrl(page) : 9

    if (mobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const filters = mobile ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Filtros' })
    await filters.getByText('Música').click()
    await expect(page).toHaveURL(/category=music/)
    await expect(page).not.toHaveURL(/[?&]page=/)
    await settled(page)
    if (mobile) await page.keyboard.press('Escape')

    await page.goBack()
    await expect(page).toHaveURL(/page=\d/)
    await expect(page).not.toHaveURL(/category=music/)
    await settled(page)
    if (mobile) expect(await feedMatchesUrl(page)).toBeGreaterThanOrEqual(loaded)
    else {
      await expect(page.getByRole('link', { name: 'Página 2' })).toHaveAttribute('aria-current', 'page')
      await expect(cards(page)).toHaveCount(9)
    }
  })

  test('ordena por preço crescente (barra no desktop, painel de filtros no mobile)', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    if ((page.viewportSize()?.width ?? 0) < 768) {
      await page.getByRole('button', { name: 'Abrir filtros' }).click()
      const sheet = page.getByRole('dialog', { name: 'Filtros' })
      await sheet.getByLabel('Ordenar por:').selectOption('price-asc')
      await page.keyboard.press('Escape')
      await expect(sheet).toBeHidden()
    } else {
      await page.getByLabel('Ordenar por:').selectOption('price-asc')
    }
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
    await expect(page).toHaveURL(/\/mercado$/)
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
    const mobile = (page.viewportSize()?.width ?? 0) < 768
    if (mobile) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const sort = (mobile ? page.getByRole('dialog', { name: 'Filtros' }) : page).getByLabel('Ordenar por:')
    for (const option of ['price-desc', 'price-asc', 'price-desc', 'price-asc']) await sort.selectOption(option)
    if (mobile) await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/sort=price-asc/)
    await page.waitForTimeout(1200) // a resposta lenta (900 ms) de uma ordenação anterior já chegou
    await settled(page)
    const prices = (await cards(page).locator('[data-testid="price"]').allTextContents())
      .map((text) => Number(/(\d+[.,]\d+)\s*ETH/.exec(text)?.[1]?.replace(',', '.')))
    expect(prices.length).toBeGreaterThan(1)
    expect([...prices].sort((a, b) => a - b)).toEqual(prices)
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

  test('edição escolhida que esgota em tempo real é trocada com aviso, e a compra usa a nova seleção', async ({ page }) => {
    await page.goto('/nft/nft_12')
    const detail = page.getByTestId('nft-detail')
    await detail.getByRole('radio', { name: '1/10', exact: true }).click()
    await expect(detail.getByRole('radio', { name: '1/10', exact: true })).toHaveAttribute('aria-checked', 'true')
    const nft = await api<{ editions: { id: string; label: string }[] }>(page, 'GET', '/api/nfts/nft_12')
    const chosen = nft.body.editions.find((edition) => edition.label === '1/10')!
    await demoScenario(page, 'edition-sold-out', { nftId: 'nft_12', editionId: chosen.id })

    await expect(detail.getByTestId('edition-sold-out')).toHaveText('A edição 1/10 esgotou. Selecionamos a edição ABERTA.')
    await expect(detail.getByRole('radio', { name: 'ABERTA', exact: true })).toHaveAttribute('aria-checked', 'true')
    await detail.getByRole('button', { name: /comprar/i }).first().click()
    await page.waitForURL('**/carrinho')
    const cart = await api<{ items: { editionId: string }[] }>(page, 'GET', '/api/cart')
    expect(cart.body.items.map((item) => item.editionId)).not.toContain(chosen.id)
  })

  test('favoritar como visitante abre o login', async ({ page }) => {
    await page.goto('/nft/nft_12')
    await expect(page.getByTestId('nft-detail')).toBeVisible()
    await page.getByRole('button', { name: /favoritar/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
