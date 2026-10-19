import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { CatalogPage } from '@/features/catalog/catalog-page'
import { parseSearch, stringifySearch, validateCatalogSearch } from '@/features/catalog/search'
import { ActivityPage } from '@/features/account/activity-page'
import { FavoritesPage } from '@/features/account/favorites-page'
import { ProfilePage } from '@/features/account/profile-page'
import { WalletsPage } from '@/features/account/wallets-page'
import { CartPage } from '@/features/cart/cart-page'
import { PaymentPage } from '@/features/checkout/payment-page'
import { NftDetailPage } from '@/features/nft/nft-detail-page'
import { OrderReceiptPage } from '@/features/orders/order-receipt-page'
import { MockPanelPage } from '@/features/dev/mock-panel-page'
import { NotFoundPage, RootLayout } from './layout'

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

export const router = createRouter({ routeTree, parseSearch, stringifySearch, defaultPreload: 'intent' })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
