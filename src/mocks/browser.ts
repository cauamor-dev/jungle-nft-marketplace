import { setupWorker } from 'msw/browser'
import { getDb, resetDb } from './db'
import { scheduleSettlement } from './services/orders'
import { handlers } from './handlers'

export async function startMocks() {
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // ?mock-reset=1 restaura dados e cenário antes de a aplicação montar; o parâmetro sai da URL.
  const url = new URL(window.location.href)
  if (url.searchParams.has('mock-reset')) {
    await resetDb()
    url.searchParams.delete('mock-reset')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }
  // Pedidos pendentes de antes de um refresh continuam seguindo o relógio.
  scheduleSettlement(await getDb())
  await recoverFromWorkerRestart()
}

// O Chrome encerra o service worker parado e, ao religar, ele esquece quais abas ativaram o mock: as chamadas
// à API vão para o servidor e voltam com o index.html. Nesse caso a aba se registra de novo e repete a chamada.
async function recoverFromWorkerRestart() {
  const { http } = await import('@/api/http')
  http.interceptors.response.use(async (response) => {
    const config = response.config as typeof response.config & { mockRetried?: boolean }
    const html = String(response.headers['content-type'] ?? '').includes('text/html')
    if (!html || config.mockRetried || !/^\/(api|__demo)\//.test(config.url ?? '')) return response
    await reactivateWorker()
    return http.request({ ...config, mockRetried: true } as typeof config)
  })
}

function reactivateWorker() {
  const controller = navigator.serviceWorker.controller
  if (!controller) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const done = () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve()
    }
    const onMessage = (event: MessageEvent) => {
      if ((event.data as { type?: string } | null)?.type === 'MOCKING_ENABLED') done()
    }
    const timer = setTimeout(done, 1000)
    navigator.serviceWorker.addEventListener('message', onMessage)
    controller.postMessage('MOCK_ACTIVATE')
  })
}
