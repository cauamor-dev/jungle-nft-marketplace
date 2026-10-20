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
}
