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

      await page.goto('/mercado')
      await settle(page)
      // Abaixo de 1024 px os filtros abrem numa folha (botão "Abrir filtros" no mobile, "Filtros" no tablet)
      const sheet = width < 1024
      if (sheet) await page.getByRole('button', { name: width < 768 ? 'Abrir filtros' : 'Filtros', exact: true }).click()
      const filters = sheet ? page.getByRole('dialog', { name: 'Filtros' }) : page.getByRole('complementary', { name: 'Filtros' })
      await expect(filters).toBeVisible()
      const filtersBox = await filters.boundingBox()
      expect(filtersBox!.x).toBeGreaterThanOrEqual(0)
      expect(filtersBox!.x + filtersBox!.width).toBeLessThanOrEqual(width + 1)
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

// Alvos de toque de pelo menos 44 x 44 px no mobile (WCAG 2.5.5). Rádio e checkbox valem pela área do
// <label>; ficam de fora o link "pular para o conteúdo" (oculto até receber foco) e links dentro de texto corrido.
for (const width of [320, 390]) test.describe(`alvos de toque em ${width}px`, () => {
  test.use({ viewport: { width, height: 844 } })

  test('todo controle visível tem pelo menos 44 x 44 px', async ({ page }) => {
    const pages: string[] = ['/', '/mercado', '/nft/nft_12']
    await page.goto('/')
    await settle(page)
    await addFromDetail(page, 'nft_12')
    pages.push('/carrinho')
    await signIn(page)
    pages.push('/pagamento', '/perfil', '/perfil/carteiras')

    const small: string[] = []
    for (const path of pages) {
      await page.goto(path)
      await settle(page)
      const found = await page.evaluate(() => {
        const selector = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="tab"], [role="radio"], [role="checkbox"]'
        const out: string[] = []
        // Área de toque = caixa do elemento + ::after posicionado (utilitário touch-target), recortada por
        // qualquer ancestral (ou o próprio elemento) com overflow, que esconderia a parte expandida.
        const hitArea = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect()
          let [left, top, right, bottom] = [rect.left, rect.top, rect.right, rect.bottom]
          const after = getComputedStyle(element, '::after')
          if (after.content !== 'none' && after.position === 'absolute') {
            const own = getComputedStyle(element)
            const px = (value: string) => parseFloat(value) || 0
            left = Math.min(left, rect.left + px(own.borderLeftWidth) + px(after.left))
            right = Math.max(right, rect.right - px(own.borderRightWidth) - px(after.right))
            top = Math.min(top, rect.top + px(own.borderTopWidth) + px(after.top))
            bottom = Math.max(bottom, rect.bottom - px(own.borderBottomWidth) - px(after.bottom))
          }
          // Só corta em eixo que não rola; dentro de uma faixa rolável o controle é alcançado rolando,
          // então os ancestrais acima dela também deixam de cortar nesse eixo.
          let scrollsX = false
          let scrollsY = false
          for (let node: HTMLElement | null = element; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            const clip = node.getBoundingClientRect()
            const cuts = (overflow: string) => overflow === 'hidden' || overflow === 'clip'
            const scrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll'
            if (!scrollsX && cuts(style.overflowX)) {
              left = Math.max(left, clip.left)
              right = Math.min(right, clip.right)
            }
            if (!scrollsY && cuts(style.overflowY)) {
              top = Math.max(top, clip.top)
              bottom = Math.min(bottom, clip.bottom)
            }
            scrollsX ||= scrolls(style.overflowX)
            scrollsY ||= scrolls(style.overflowY)
          }
          return { width: right - left, height: bottom - top }
        }
        for (const element of document.querySelectorAll<HTMLElement>(selector)) {
          if (element.closest('[aria-hidden="true"], [inert]')) continue
          if (element.matches('a') && element.closest('p')) continue
          if (element.getAttribute('href') === '#conteudo') continue
          const isChoice = element instanceof HTMLInputElement && ['radio', 'checkbox'].includes(element.type)
          const target = (isChoice && element.labels?.[0]) || element
          const rect = target.getBoundingClientRect()
          if (!target.checkVisibility({ visibilityProperty: true, contentVisibilityAuto: true })) continue
          // Visualmente oculto (sr-only): o link de pular conteúdo e o input de arquivo acionado pelo botão "Alterar"
          if (rect.width <= 1 && rect.height <= 1) continue
          const box = hitArea(target)
          if (box.width < 43.5 || box.height < 43.5) {
            const name = (element.getAttribute('aria-label') ?? element.textContent ?? element.getAttribute('placeholder') ?? '').trim().slice(0, 30)
            out.push(`${element.tagName.toLowerCase()} "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`)
          }
        }
        return out
      })
      small.push(...found.map((item) => `${path}: ${item}`))
    }
    expect(small).toEqual([])
  })
})

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

// Baselines geradas na imagem oficial mcr.microsoft.com/playwright:v1.56.1-noble (Chromium 141, o do lockfile).
// Com hinting e antialiasing fixados no playwright.config.ts, outra máquina Linux renderiza pixel a pixel igual.
// Tolerância medida: 1 px de padding num único card muda de 0,065% (carrinho desktop) a 0,7% (início mobile) dos
// pixels, então o limite fica em 0,05%. Valores como 2% deixariam esse tipo de mudança passar. A troca de poucos
// caracteres pode ficar abaixo do limite; texto é coberto pelos testes funcionais.
test.describe('regressão visual', () => {
  const shot = { animations: 'disabled' as const, maxDiffPixelRatio: 0.0005 }

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
