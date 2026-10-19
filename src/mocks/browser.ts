import { setupWorker } from 'msw/browser'
import { getDb } from './db'
import { scheduleSettlement } from './services/orders'
import { handlers } from './handlers'

export async function startMocks() {
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  })
  // Pedidos pendentes de antes de um refresh continuam seguindo o relógio.
  scheduleSettlement(await getDb())
}
