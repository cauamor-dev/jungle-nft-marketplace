import { enableMocks } from './mocks'

// O socket.io-client guarda a referência de WebSocket quando é importado. Por isso o MSW precisa
// estar ativo antes de qualquer módulo da aplicação ser carregado.
async function bootstrap() {
  await enableMocks()
  const { mount } = await import('./app/mount')
  mount(document.getElementById('root')!)
}

void bootstrap()
