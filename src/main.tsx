import { enableMocks } from './mocks'
import heroImage from './assets/nfts/esmeralda-800.webp'

// A imagem do hero é o LCP da home no desktop, mas só seria descoberta depois do MSW e da montagem.
// O preload começa o download já, em paralelo; no mobile o LCP é o fundo do hero (SVG embutido) e nada é baixado.
function preloadHomeHero() {
  if (window.location.pathname !== '/' || !window.matchMedia('(min-width: 768px)').matches) return
  const link = document.createElement('link')
  link.rel = 'preload'
  link.as = 'image'
  link.href = heroImage
  link.fetchPriority = 'high'
  document.head.append(link)
}

// O socket.io-client guarda a referência de WebSocket quando é importado. Por isso o MSW precisa
// estar ativo antes de qualquer módulo da aplicação ser carregado.
async function bootstrap() {
  await enableMocks()
  const { mount } = await import('./app/mount')
  mount(document.getElementById('root')!)
}

// Nunca deixa a tela em branco: sem React carregado, monta o aviso com DOM puro e estilos inline.
function renderFatal(error: unknown) {
  console.error(error)
  const root = document.getElementById('root')
  if (!root) return
  const box = document.createElement('div')
  box.setAttribute('role', 'alert')
  box.style.cssText =
    'max-width:520px;margin:15vh auto 0;padding:24px;font:15px/1.6 ui-monospace,Menlo,monospace;color:#f5f1eb;background:#241612;border-bottom:6px solid #d28a4c'
  const title = document.createElement('h1')
  title.style.cssText = 'margin:0 0 12px;font-size:20px'
  title.textContent = 'Não foi possível iniciar a demonstração'
  const text = document.createElement('p')
  text.style.cssText = 'margin:0 0 16px;color:#cfb28c'
  text.textContent = 'Recarregue a página. Se o erro continuar, restaure os dados da demonstração.'
  const link = document.createElement('a')
  link.href = '/?mock-reset=1'
  link.textContent = 'Restaurar a demonstração'
  link.style.cssText = 'color:#e89b55;font-weight:700'
  box.append(title, text, link)
  document.documentElement.style.background = '#140d0a'
  root.replaceChildren(box)
}

preloadHomeHero()
bootstrap().catch(renderFatal)
