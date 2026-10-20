import { expect, test, type Page } from '@playwright/test'
import { addFromDetail, expectNoHorizontalOverflow, goToPaymentLoggedIn, signIn } from './helpers'

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

test.describe('acessibilidade', () => {
  test('o foco do teclado é visível nos controles principais', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'Teclado físico: verificado no desktop')
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

// Screenshots dependem do sistema e da versão do Chromium (rasterização e largura dos glifos).
// As baselines versionadas foram geradas em Linux com o Chromium abaixo; em outro ambiente a
// comparação daria falso negativo, então o teste é pulado com o motivo e o comando para gerar baselines locais.
const BASELINE_PLATFORM = 'linux'
const BASELINE_CHROMIUM_MAJOR = '141'

test.describe('regressão visual', () => {
  const shot = { animations: 'disabled' as const, maxDiffPixelRatio: 0.005 }

  test.beforeEach(({ browser }) => {
    const major = browser.version().split('.')[0]
    test.skip(
      process.platform !== BASELINE_PLATFORM || major !== BASELINE_CHROMIUM_MAJOR,
      `baselines de ${BASELINE_PLATFORM}/Chromium ${BASELINE_CHROMIUM_MAJOR}; este ambiente é ${process.platform}/Chromium ${major}. ` +
        'Gere baselines locais com: pnpm test:e2e -g "regressão visual" --update-snapshots',
    )
  })

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
