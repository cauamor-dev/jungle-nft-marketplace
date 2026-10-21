import type { QueryClient } from '@tanstack/react-query'
import { createRootRouteWithContext, createRoute, createRouter } from '@tanstack/react-router'
import { lazy } from 'react'
import { sessionQueryOptions } from '@/features/auth/session'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { parseSearch, stringifySearch, validateCatalogSearch } from '@/features/catalog/search'
import { NotFoundPage, PrivateLayout, RootLayout, RouteFallback } from './layout'

// Só catálogo e layout entram no bundle inicial; as demais telas são carregadas na primeira visita.
const ActivityPage = lazy(() => import('@/features/account/activity-page').then((m) => ({ default: m.ActivityPage })))
const FavoritesPage = lazy(() => import('@/features/account/favorites-page').then((m) => ({ default: m.FavoritesPage })))
const ProfilePage = lazy(() => import('@/features/account/profile-page').then((m) => ({ default: m.ProfilePage })))
const WalletsPage = lazy(() => import('@/features/account/wallets-page').then((m) => ({ default: m.WalletsPage })))
const CartPage = lazy(() => import('@/features/cart/cart-page').then((m) => ({ default: m.CartPage })))
const PaymentPage = lazy(() => import('@/features/checkout/payment-page').then((m) => ({ default: m.PaymentPage })))
const NftDetailPage = lazy(() => import('@/features/nft/nft-detail-page').then((m) => ({ default: m.NftDetailPage })))
const OrderReceiptPage = lazy(() => import('@/features/orders/order-receipt-page').then((m) => ({ default: m.OrderReceiptPage })))
const ArticlePage = lazy(() => import('@/features/content/content-pages').then((m) => ({ default: m.ArticlePage })))
const HelpPage = lazy(() => import('@/features/content/content-pages').then((m) => ({ default: m.HelpPage })))
const MockPanelPage = lazy(() => import('@/features/dev/mock-panel-page').then((m) => ({ default: m.MockPanelPage })))

type RouterContext = { queryClient: QueryClient }

const rootRoute = createRootRouteWithContext<RouterContext>()({ component: RootLayout, notFoundComponent: NotFoundPage })

// Rotas privadas ficam sob este layout sem caminho: a sessão é resolvida antes de renderizar e,
// sem login, o guard abre o diálogo no próprio endereço para o usuário voltar ao mesmo ponto.
const privateRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'privado',
  beforeLoad: async ({ context }) => {
    // Uma falha de rede aqui não deve quebrar a navegação: o guard mostra o estado e tenta de novo.
    await context.queryClient.ensureQueryData(sessionQueryOptions).catch(() => null)
  },
  component: PrivateLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: function HomeRoute() {
    const search = indexRoute.useSearch()
    const navigate = indexRoute.useNavigate()
    return <CatalogPage variant="home" search={search} onSearchChange={(next, options) => void navigate({ search: next, resetScroll: false, replace: options?.replace })} />
  },
})

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mercado',
  validateSearch: validateCatalogSearch,
  component: function MarketRoute() {
    const search = marketRoute.useSearch()
    const navigate = marketRoute.useNavigate()
    return <CatalogPage variant="market" search={search} onSearchChange={(next, options) => void navigate({ search: next, resetScroll: false, replace: options?.replace })} />
  },
})

const mocksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dev/mocks',
  component: MockPanelPage,
})

const nftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/nft/$id',
  component: function NftRoute() {
    const { id } = nftRoute.useParams()
    return <NftDetailPage key={id} id={id} />
  },
})

const articleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/aprenda/$slug',
  component: function ArticleRoute() {
    const { slug } = articleRoute.useParams()
    return <ArticlePage slug={slug} />
  },
})

const helpRoute = createRoute({ getParentRoute: () => rootRoute, path: '/ajuda', component: HelpPage })

const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carrinho', component: CartPage })
const paymentRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: '/pagamento',
  staticData: {
    auth: {
      title: 'Entre para finalizar a compra',
      description: 'O pagamento fica disponível para colecionadores com sessão ativa. Seu carrinho continua guardado.',
    },
  },
  component: PaymentPage,
})

const orderRoute = createRoute({
  getParentRoute: () => privateRoute,
  path: '/pedido/$orderId',
  staticData: {
    auth: { title: 'Entre para ver seu pedido', description: 'Os pedidos ficam disponíveis apenas para a conta que os criou.' },
  },
  component: function OrderRoute() {
    const { orderId } = orderRoute.useParams()
    return <OrderReceiptPage orderId={orderId} />
  },
})

const accountAuth = {
  auth: {
    title: 'Entre para acessar sua conta',
    description: 'Perfil, carteiras, atividade e favoritos ficam disponíveis depois do login.',
  },
}

const profileRoute = createRoute({ getParentRoute: () => privateRoute, path: '/perfil', staticData: accountAuth, component: ProfilePage })
const walletsRoute = createRoute({ getParentRoute: () => privateRoute, path: '/perfil/carteiras', staticData: accountAuth, component: WalletsPage })
const activityRoute = createRoute({ getParentRoute: () => privateRoute, path: '/perfil/atividade', staticData: accountAuth, component: ActivityPage })
const favoritesRoute = createRoute({ getParentRoute: () => privateRoute, path: '/perfil/favoritos', staticData: accountAuth, component: FavoritesPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  marketRoute,
  nftRoute,
  cartRoute,
  articleRoute,
  helpRoute,
  privateRoute.addChildren([paymentRoute, orderRoute, profileRoute, walletsRoute, activityRoute, favoritesRoute]),
  mocksRoute,
])

export const router = createRouter({
  routeTree,
  // O queryClient real é passado pelo RouterProvider (ver mount.tsx)
  context: { queryClient: undefined! },
  parseSearch,
  stringifySearch,
  defaultPreload: 'intent',
  defaultPendingComponent: RouteFallback,
  defaultPendingMs: 0,
  defaultPendingMinMs: 0,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
  interface StaticDataRouteOption {
    auth?: { title: string; description: string }
  }
}
