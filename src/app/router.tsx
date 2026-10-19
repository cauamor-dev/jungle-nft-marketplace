import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router'
import { MockPanelPage } from '@/features/dev/mock-panel-page'

function NotFound() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <Link to="/" className="underline">
        Voltar ao início
      </Link>
    </main>
  )
}

const rootRoute = createRootRoute({ component: Outlet, notFoundComponent: NotFound })

// Telas do produto ficam bloqueadas até o Figma estar acessível (ver FIGMA_AUDIT.md).
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => (
    <main className="p-6">
      <h1 className="text-xl font-semibold">NFT Marketplace</h1>
      <p>Telas pendentes do acesso ao Figma. Painel dos mocks em <Link to="/dev/mocks" className="underline">/dev/mocks</Link>.</p>
    </main>
  ),
})

const mocksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/mocks',
  component: MockPanelPage,
})

const routeTree = rootRoute.addChildren([indexRoute, mocksRoute])

export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
