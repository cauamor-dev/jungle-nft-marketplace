import { expect, test, type Page } from '@playwright/test'
import { addFromDetail, demoScenario, expectNoHorizontalOverflow, goToPaymentLoggedIn, signIn } from './helpers'

const widths = [390, 768, 1440]

async function settle(page: Page) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('[role="status"][aria-label^="Carregando"]')).toHaveCount(0)
  await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
  await page.evaluate(() => document.fonts.ready)
}

for (const width of widths) {
  test.describe(`largura ${width}px`, () => {
    test.use({ viewport: { width, height: width === 1440 ? 900 : 844 } })

    test('páginas públicas não geram rolagem lateral', async ({ page }) => {
      for (const path of ['/', '/mercado', '/nft/nft_12', '/nft/nao-existe', '/carrinho', '/rota-que-nao-existe']) {
        await page.goto(path)
        await settle(page)
        await expectNoHorizontalOverflow(page)
      }
    })

    test('fluxo autenticado não gera rolagem lateral', async ({ page }) => {
      await signIn(page)
      for (const path of ['/perfil', '/perfil/carteiras', '/perfil/atividade', '/perfil/favoritos']) {
        await page.goto(path)
        await settle(page)
        await expectNoHorizontalOverflow(page)
      }
      await goToPaymentLoggedIn(page)
      await settle(page)
      await expectNoHorizontalOverflow(page)
      await page.getByRole('button', { name: 'Confirmar compra' }).click()
      await page.waitForURL('**/pedido/**')
      await settle(page)
      await expectNoHorizontalOverflow(page)
    })

    test('login e filtros cabem na tela', async ({ page }) => {
      await page.goto('/perfil')
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      const box = await dialog.boundingBox()
      expect(box!.x).toBeGreaterThanOrEqual(0)
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1)
      await expectNoHorizontalOverflow(page)
    })
  })
}

// Regressão: os botões dos estados de erro estouravam a largura entre 320 e 390 px.
for (const width of [320, 375, 390]) {
  test.describe(`estados de erro em ${width}px`, () => {
    test.use({ viewport: { width, height: 800 } })

    test('erro do catálogo e do detalhe, com o banner do cenário, cabem na tela', async ({ page }) => {
      await page.goto('/mercado')
      await settle(page)
      await demoScenario(page, 'http-5xx', { match: 'GET /api/nfts' })
      for (const [path, testId] of [['/mercado?q=golden', 'catalog-error'], ['/nft/nft_12', 'nft-error']]) {
        await page.goto(path)
        const error = page.getByTestId(testId)
        await expect(error).toBeVisible({ timeout: 15_000 })
        await expect(page.getByTestId('scenario-banner')).toBeVisible()
        await expectNoHorizontalOverflow(page)
        for (const control of await error.locator('a, button').all()) {
          const box = (await control.boundingBox())!
          expect(box.x, `${testId}: início do controle`).toBeGreaterThanOrEqual(0)
          expect(box.x + box.width, `${testId}: fim do controle`).toBeLessThanOrEqual(width)
        }
      }
    })
  })
}

test.describe('acessibilidade', () => {
  test('o foco do teclado é visível nos controles principais', async ({ page }) => {
    await page.goto('/mercado')
    await settle(page)
    await page.locator('body').click({ position: { x: 5, y: 5 } })
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Tab')
      const visible = await page.evaluate(() => {
        const element = document.activeElement
        if (!element || element === document.body) return 'sem foco'
        const style = getComputedStyle(element)
        const ok = (style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0) || style.boxShadow !== 'none'
        return ok ? 'ok' : `${element.tagName} ${element.textContent?.slice(0, 30)}`
      })
      expect(visible).toBe('ok')
    }
  })

  test('landmarks e títulos existem nas páginas principais', async ({ page }) => {
    for (const path of ['/', '/mercado', '/nft/nft_12', '/carrinho']) {
      await page.goto(path)
      await settle(page)
      await expect(page.getByRole('main')).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1 }).first(), `h1 em ${path}`).toBeAttached()
    }
  })

  test('com reduced motion as animações do app são desativadas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/mercado')
    const durations = await page.evaluate(() =>
      [...document.querySelectorAll('*')]
        .map((element) => getComputedStyle(element))
        .filter((style) => style.animationName !== 'none')
        .map((style) => parseFloat(style.animationDuration)),
    )
    for (const duration of durations) expect(duration).toBeLessThan(0.01)
  })

  test('o formulário de lançamentos não confirma um cadastro inexistente', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    const email = page.getByLabel('E-mail para receber lançamentos')
    await email.fill('nao-e-email')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Informe um e-mail válido.')).toBeVisible()
    await email.fill('pessoa@example.test')
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.getByText('Nenhum e-mail foi cadastrado.')).toBeVisible()
  })

  test('imagens têm texto alternativo ou são decorativas', async ({ page }) => {
    await page.goto('/')
    await settle(page)
    const missing = await page.evaluate(() => [...document.images].filter((image) => !image.hasAttribute('alt')).length)
    expect(missing).toBe(0)
  })
})

// Baselines geradas em Linux com o Chromium do Playwright fixado no lockfile (1.56.1 -> Chromium 141).
// Em macOS ou Windows a rasterização de texto é outra: rode pela imagem Docker oficial (ver README).
test.describe('regressão visual', () => {
  const shot = { animations: 'disabled' as const, maxDiffPixelRatio: 0.005 }

  test('início', async ({ page }, info) => {
    await page.goto('/')
    await settle(page)
    await expect(page).toHaveScreenshot(`inicio-${info.project.name}.png`, shot)
  })

  test('detalhe', async ({ page }, info) => {
    await page.goto('/nft/nft_12')
    await settle(page)
    await expect(page).toHaveScreenshot(`detalhe-${info.project.name}.png`, shot)
  })

  test('carrinho', async ({ page }, info) => {
    await addFromDetail(page, 'nft_12')
    await settle(page)
    await expect(page).toHaveScreenshot(`carrinho-${info.project.name}.png`, shot)
  })

  test('pagamento', async ({ page }, info) => {
    await goToPaymentLoggedIn(page)
    await settle(page)
    await expect(page).toHaveScreenshot(`pagamento-${info.project.name}.png`, shot)
  })
})
