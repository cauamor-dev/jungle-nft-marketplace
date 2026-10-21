import { expect, test, type Page } from '@playwright/test'
import { addFromDetail, api, loginThroughDialog, signIn } from './helpers'

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768
const cards = (page: Page) => page.locator('[data-testid="nft-card"]:visible')
const savedFavorites = async (page: Page) => (await api<{ nftIds: string[] }>(page, 'GET', '/api/favorites')).body.nftIds

// O botão de favoritar do card fica visível no celular e aparece no hover no desktop
async function cardFavorite(page: Page, index = 0) {
  const card = cards(page).nth(index)
  await card.hover()
  return card.locator('button[aria-pressed]:visible').first()
}

test.describe('favoritar', () => {
  test('no card: clique real muda o ícone, salva na conta, aparece na lista e sobrevive ao reload', async ({ page }) => {
    await signIn(page)
    await page.goto('/mercado')
    const button = await cardFavorite(page, 1)
    const nftId = await cards(page).nth(1).getAttribute('data-nft-id')
    const outline = await button.locator('path').getAttribute('d')
    await button.click()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    await expect(button.locator('path')).not.toHaveAttribute('d', outline!)
    await expect(page.getByText(/foi para os favoritos/)).toBeVisible()
    await expect.poll(() => savedFavorites(page)).toContain(nftId)

    await page.reload()
    await expect(await cardFavorite(page, 1)).toHaveAttribute('aria-pressed', 'true')
    await page.goto('/perfil/favoritos')
    await expect(page.locator(`[data-testid="nft-card"][data-nft-id="${nftId}"]:visible`)).toBeVisible()

    // Remover pela própria lista de interesse
    const inList = page.locator(`[data-testid="nft-card"][data-nft-id="${nftId}"]:visible`)
    await inList.hover()
    await inList.getByRole('button', { name: /^Remover .* dos favoritos/ }).locator('visible=true').first().click()
    await expect(inList).toHaveCount(0)
    await expect.poll(() => savedFavorites(page)).not.toContain(nftId)
    await page.reload()
    await expect(page.getByTestId('favorites-list').or(page.getByTestId('favorites-empty')).first()).toBeVisible()
    await expect(inList).toHaveCount(0)
  })

  test('no detalhe, como visitante: o favorito é concluído logo depois do login, sem segundo clique', async ({ page }) => {
    await page.goto('/nft/nft_05')
    const button = page.getByTestId('nft-detail').locator('button[aria-pressed]').first()
    await button.click()
    await loginThroughDialog(page)
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(button).toHaveAttribute('aria-pressed', 'true')
    if (!isMobile(page)) await expect(button).toHaveText('Favoritado')
    await expect.poll(() => savedFavorites(page)).toEqual(['nft_05'])
    await page.reload()
    await expect(page.getByTestId('nft-detail').locator('button[aria-pressed]').first()).toHaveAttribute('aria-pressed', 'true')
  })

  test('fechar o login sem entrar descarta o favorito pedido', async ({ page }) => {
    await page.goto('/nft/nft_05')
    await page.getByTestId('nft-detail').locator('button[aria-pressed]').first().click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
    await signIn(page)
    expect(await savedFavorites(page)).toEqual([])
  })
})

test.describe('catálogo', () => {
  test('aplicar filtro ou trocar de aba mantém a posição da página em vez de voltar ao topo', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    const offset = isMobile(page) ? 40 : 250
    await page.mouse.wheel(0, offset)
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(offset)
    // Clique na posição em que o controle está na tela, como uma pessoa faria (sem o Playwright rolar até ele)
    const control = isMobile(page)
      ? page.getByRole('link', { name: 'Em alta' })
      : page.getByRole('complementary', { name: 'Filtros' }).getByText('Polygon')
    const box = (await control.boundingBox())!
    expect(box.y).toBeGreaterThan(0)
    await page.mouse.click(box.x + 10, box.y + box.height / 2)
    await expect(page).toHaveURL(isMobile(page) ? /listing=trending/ : /chain=polygon/)
    await page.waitForTimeout(300)
    expect(await page.evaluate(() => scrollY)).toBe(offset)
  })

  test('desktop: a paginação sobe suavemente até os resultados; celular: a lista cresce e continua igual ao voltar', async ({ page }) => {
    await page.goto('/mercado')
    await expect(cards(page)).toHaveCount(9)
    if (isMobile(page)) {
      await page.getByRole('button', { name: 'Carregar mais' }).click()
      await expect(cards(page)).toHaveCount(18)
      await cards(page).nth(14).locator('h3 a').click()
      await page.waitForURL('**/nft/**')
      await page.goBack()
      await expect(cards(page)).toHaveCount(18)
      return
    }
    await page.getByRole('link', { name: 'Página 2' }).scrollIntoViewIfNeeded()
    const start = await page.evaluate(() => scrollY)
    await page.getByRole('link', { name: 'Página 2' }).click()
    const positions: number[] = []
    for (let step = 0; step < 6; step += 1) {
      positions.push(await page.evaluate(() => Math.round(scrollY)))
      await page.waitForTimeout(60)
    }
    // Rolagem suave: passa por posições intermediárias, sem salto direto para o topo do site
    expect(positions.some((y) => y > 0 && y < start)).toBe(true)
    await expect.poll(() => page.evaluate(() => Math.round(document.getElementById('resultados')!.getBoundingClientRect().top))).toBeLessThan(40)
    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
  })

  test('busca mostra resultados enquanto digita e mantém o termo ao voltar', async ({ page }) => {
    await page.goto('/mercado')
    let field = page.getByPlaceholder('Explorar coleções')
    if (!isMobile(page)) {
      await page.getByRole('button', { name: 'Buscar NFTs' }).click()
      field = page.getByRole('searchbox', { name: 'Buscar NFTs pelo nome' })
    }
    await field.pressSequentially('golden', { delay: 40 })
    await expect(page).toHaveURL(/q=golden/)
    await expect(cards(page)).toHaveCount(3)
    for (const title of await cards(page).locator('h3').allTextContents()) expect(title.toLowerCase()).toContain('golden')

    await cards(page).first().locator('h3 a').click()
    await page.waitForURL('**/nft/**')
    await page.goBack()
    await expect(page).toHaveURL(/q=golden/)
    await expect(field).toHaveValue('golden')
  })

  test('coleções aparecem em ordem alfabética', async ({ page }) => {
    await page.goto('/mercado')
    if (isMobile(page)) await page.getByRole('button', { name: 'Abrir filtros' }).click()
    const panel = isMobile(page) ? page.getByRole('dialog', { name: 'Filtros' }) : page.getByRole('complementary', { name: 'Filtros' })
    const labels = panel.getByRole('group', { name: 'Coleções' }).locator('label > span:first-child')
    await expect(labels).toHaveCount(9)
    const names = await labels.allTextContents()
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'pt-BR')))
    expect(names.length).toBe(9)
  })

  test('card mostra só a imagem do NFT, sem moldura em volta', async ({ page }) => {
    await page.goto('/mercado')
    const card = cards(page).first()
    const frame = (await card.locator('img').first().evaluate((image) => {
      const own = image.getBoundingClientRect()
      const parent = image.closest('.relative')!.getBoundingClientRect()
      return [own.width - parent.width, own.height - parent.height].map(Math.round)
    }))
    expect(frame).toEqual([0, 0])
  })

  test('card indisponível: selo e botões de ação não se sobrepõem', async ({ page }) => {
    await page.goto('/mercado?page=2')
    const card = page.locator('[data-testid="nft-card"]:visible').filter({ hasText: 'Indisponível' }).first()
    await card.scrollIntoViewIfNeeded()
    await card.hover()
    const label = (await card.getByText('Indisponível').boundingBox())!
    const controls = await card.locator('button:visible').all()
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      const box = (await control.boundingBox())!
      const overlaps = box.x < label.x + label.width && label.x < box.x + box.width && box.y < label.y + label.height && label.y < box.y + box.height
      expect(overlaps).toBe(false)
    }
  })

})

test.describe('detalhe e carrinho', () => {
  test('a edição escolhida muda preço, tiragem e disponibilidade, e o carrinho cobra esse preço', async ({ page }) => {
    await page.goto('/nft/nft_12')
    const detail = page.getByTestId('nft-detail')
    const price = detail.getByTestId('edition-price')
    const info = detail.getByTestId('edition-info')
    await expect(price).toHaveText('0.0425 ETH')
    await expect(info).toContainText('Edição aberta')

    await detail.getByRole('radio', { name: '1/10', exact: true }).click()
    await expect(price).toHaveText('0.085 ETH')
    await expect(info).toContainText('tiragem de 10 cópias')

    await detail.getByRole('radio', { name: '1/1', exact: true }).click()
    await expect(price).toHaveText('0.17 ETH')
    await expect(info).toContainText('peça única')

    await detail.getByRole('button', { name: /comprar/i }).first().click()
    await page.waitForURL('**/carrinho')
    const item = page.locator('[data-testid="cart-item"]:visible').first()
    await expect(item).toContainText('1/1')
    await expect(item.getByTestId('line-total')).toHaveText('0.17 ETH')
  })

  test('carrinho aberto sem login passa a mostrar "Finalizar compra" depois de entrar', async ({ page }) => {
    await addFromDetail(page, 'nft_12')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeVisible()
    if (isMobile(page)) {
      // No celular o carrinho ocupa a tela toda: o login abre pelo próprio botão e segue para o pagamento
      await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
      await loginThroughDialog(page)
      await page.waitForURL('**/pagamento')
      await page.goto('/carrinho')
    } else {
      await page.locator('header').getByRole('button', { name: 'Entrar' }).click()
      await loginThroughDialog(page)
      await expect(page.getByRole('dialog')).toBeHidden()
      await expect(page).toHaveURL(/\/carrinho$/)
    }
    await page.getByRole('button', { name: 'Finalizar compra' }).click()
    await page.waitForURL('**/pagamento')
  })

  test('sair da conta volta ao início sem abrir o login', async ({ page }) => {
    await signIn(page)
    await page.getByRole('button', { name: 'Sair' }).click()
    await page.waitForURL((url) => url.pathname === '/')
    await page.waitForTimeout(500)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})

test.describe('links e conteúdo', () => {
  test('redes sociais do rodapé abrem em nova aba com rel seguro', async ({ page, context }) => {
    await context.route(/facebook\.com/, (route) => route.fulfill({ status: 200, body: 'ok' }))
    await page.goto('/')
    const facebook = page.locator('footer').getByRole('link', { name: 'Facebook (abre em nova aba)' })
    await expect(facebook).toHaveAttribute('target', '_blank')
    await expect(facebook).toHaveAttribute('rel', 'noopener noreferrer')
    expect(await facebook.evaluate((link) => getComputedStyle(link).cursor)).toBe('pointer')
    const [popup] = await Promise.all([context.waitForEvent('page'), facebook.click()])
    expect(popup.url()).toContain('facebook.com')
    await popup.close()
  })

  test('cards do blog abrem o artigo e a ajuda do rodapé leva à seção certa', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /Como proteger sua carteira/ }).click()
    await page.waitForURL('**/aprenda/como-proteger-sua-carteira')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Como proteger sua carteira')

    await page.locator('footer').getByRole('link', { name: 'Política do mercado' }).click()
    await page.waitForURL('**/ajuda#politica-do-mercado')
    await expect.poll(() => page.locator('#politica-do-mercado').evaluate((section) => Math.round(section.getBoundingClientRect().top))).toBeLessThan(60)
  })

  test('arco dourado das promos fica por cima da imagem, como no layout', async ({ page }) => {
    await page.goto('/')
    const promos = page.getByRole('region', { name: 'Destaques' }).locator('article')
    await expect(promos).toHaveCount(2)
    for (const promo of await promos.all()) {
      const order = await promo.evaluate((article) => {
        const children = [...article.children]
        return { image: children.findIndex((child) => child.tagName === 'IMG'), arc: children.findIndex((child) => child.tagName === 'svg') }
      })
      expect(order.arc).toBeGreaterThan(order.image)
      await expect(promo.locator('svg circle')).toHaveCount(2)
    }
  })

  test('com movimento reduzido as animações de entrada ficam instantâneas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mercado')
    const duration = await cards(page).first().evaluate((card) => getComputedStyle(card.closest('li')!).animationDuration)
    expect(parseFloat(duration)).toBeLessThan(0.01)
  })
})
