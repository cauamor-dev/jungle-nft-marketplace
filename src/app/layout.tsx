import { Link, Outlet, useLocation, useMatches } from '@tanstack/react-router'
import { BottomNav } from '@/components/layout/bottom-nav'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { RequireAuth } from '@/features/auth/require-auth'

const marketSections = ['/mercado', '/nft', '/carrinho', '/pagamento']
// No mobile estas telas ocupam a tela inteira, sem rodapé nem barra de abas.
const immersiveMobile = ['/nft', '/carrinho', '/pagamento']

export function RootLayout() {
  const { pathname } = useLocation()
  const isReceipt = pathname.startsWith('/pedido')
  const isMarket = marketSections.some((section) => pathname.startsWith(section))
  const isImmersive = immersiveMobile.some((section) => pathname.startsWith(section))
  const showDivider = pathname === '/' || pathname.startsWith('/perfil')

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-ink"
      >
        Pular para o conteúdo
      </a>
      {!isReceipt && <Header active={isMarket ? 'market' : 'home'} divider={showDivider} />}
      <main id="conteudo" className={isImmersive ? 'md:pb-0' : 'pb-[110px] md:pb-0'}>
        <Outlet />
      </main>
      {!isReceipt && (
        <div className={isImmersive ? 'mt-16 pb-6 max-md:hidden md:mt-24' : 'mt-16 pb-6 md:mt-24'}>
          <Footer />
        </div>
      )}
      {!isReceipt && !isImmersive && <BottomNav />}
      <AuthDialog />
    </>
  )
}

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="not-found">
      <p className="text-5xl font-bold text-text-accent">404</p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-sm text-text-secondary">O endereço que você abriu não existe ou foi movido.</p>
      <Link to="/" className="rounded-md bg-primary px-5 py-2.5 font-bold text-ink hover:bg-text-accent">
        Voltar ao início
      </Link>
    </div>
  )
}

export function RouteFallback() {
  return <div role="status" aria-label="Carregando página" className="min-h-[70dvh]" />
}

// Layout das rotas privadas: o texto do aviso de login vem do staticData da rota aberta.
export function PrivateLayout() {
  const auth = useMatches({ select: (matches) => matches.findLast((match) => match.staticData.auth)?.staticData.auth })
  return (
    <RequireAuth
      title={auth?.title ?? 'Entre para continuar'}
      description={auth?.description ?? 'Esta área fica disponível depois do login.'}
    >
      <Outlet />
    </RequireAuth>
  )
}
