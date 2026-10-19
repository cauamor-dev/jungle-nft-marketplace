import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { lazy } from 'react'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { parseSearch, stringifySearch, validateCatalogSearch } from '@/features/catalog/search'
import { NotFoundPage, RootLayout, RouteFallback } from './layout'

// Só catálogo e layout entram no bundle inicial; as demais telas são carregadas na primeira visita.
const ActivityPage = lazy(() => import('@/features/account/activity-page').then((m) => ({ default: m.ActivityPage })))
const FavoritesPage = lazy(() => import('@/features/account/favorites-page').then((m) => ({ default: m.FavoritesPage })))
const ProfilePage = lazy(() => import('@/features/account/profile-page').then((m) => ({ default: m.ProfilePage })))
const WalletsPage = lazy(() => import('@/features/account/wallets-page').then((m) => ({ default: m.WalletsPage })))
const CartPage = lazy(() => import('@/features/cart/cart-page').then((m) => ({ default: m.CartPage })))
const PaymentPage = lazy(() => import('@/features/checkout/payment-page').then((m) => ({ default: m.PaymentPage })))
const NftDetailPage = lazy(() => import('@/features/nft/nft-detail-page').then((m) => ({ default: m.NftDetailPage })))
const OrderReceiptPage = lazy(() => import('@/features/orders/order-receipt-page').then((m) => ({ default: m.OrderReceiptPage })))
const MockPanelPage = lazy(() => import('@/features/dev/mock-panel-page').then((m) => ({ default: m.MockPanelPage })))

const rootRoute = createRootRoute({ component: RootLayout, notFoundComponent: NotFoundPage })

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  validateSearch: validateCatalogSearch,
  component: function HomeRoute() {
    const search = indexRoute.useSearch()
    const navigate = indexRoute.useNavigate()
    return <CatalogPage variant="home" search={search} onSearchChange={(next) => void navigate({ search: next })} />
  },
})

const marketRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/mercado',
  validateSearch: validateCatalogSearch,
  component: function MarketRoute() {
    const search = marketRoute.useSearch()
    const navigate = marketRoute.useNavigate()
    return <CatalogPage variant="market" search={search} onSearchChange={(next) => void navigate({ search: next })} />
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

const cartRoute = createRoute({ getParentRoute: () => rootRoute, path: '/carrinho', component: CartPage })
const paymentRoute = createRoute({ getParentRoute: () => rootRoute, path: '/pagamento', component: PaymentPage })

const orderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pedido/$orderId',
  component: function OrderRoute() {
    const { orderId } = orderRoute.useParams()
    return <OrderReceiptPage orderId={orderId} />
  },
})

const profileRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil', component: ProfilePage })
const walletsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil/carteiras', component: WalletsPage })
const activityRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil/atividade', component: ActivityPage })
const favoritesRoute = createRoute({ getParentRoute: () => rootRoute, path: '/perfil/favoritos', component: FavoritesPage })

const routeTree = rootRoute.addChildren([
  indexRoute,
  marketRoute,
  nftRoute,
  cartRoute,
  paymentRoute,
  orderRoute,
  profileRoute,
  walletsRoute,
  activityRoute,
  favoritesRoute,
  mocksRoute,
])

export const router = createRouter({
  routeTree,
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
}
