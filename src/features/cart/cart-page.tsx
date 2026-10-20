import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { listNfts } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { Cart, CartItem } from '@/api/contracts'
import trashIcon from '@/assets/icons/trash.svg'
import { NftCard } from '@/components/nft/nft-card'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselItem } from '@/components/ui/carousel'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { compareEth, displayEth } from '@/domain/money'
import { useAuthDialog } from '@/features/auth/auth-context'
import { useSession } from '@/features/auth/session'
import { useIsDesktop } from '@/lib/use-media-query'
import { cn } from '@/lib/cn'
import { OrderTotals } from './order-summary'
import { useApplyCoupon, useCart, useRemoveCartItem, useRemoveCoupon, useUpdateCartItem } from './queries'

const couponMessages = {
  expired: 'Este cupom expirou.',
  invalid: 'Cupom inválido.',
} as const

function issueMessage(item: CartItem) {
  if (item.issue === 'SOLD_OUT') return 'Esgotado: remova este item para continuar.'
  if (item.issue === 'QUANTITY_EXCEEDS_AVAILABLE') return `Só restam ${item.availableQuantity} unidades: reduza a quantidade.`
  if (compareEth(item.unitPriceEth, item.addedPriceEth) !== 0) {
    return `O preço mudou de ${displayEth(item.addedPriceEth)} para ${displayEth(item.unitPriceEth)} ETH.`
  }
  return null
}

export function CartPage() {
  const cart = useCart()
  const desktop = useIsDesktop()
  const checkout = useCheckoutIntent()

  if (cart.isPending) return <CartSkeleton />
  if (cart.error || !cart.data) {
    return (
      <div role="alert" className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="cart-error">
        <h1 className="text-2xl font-bold">Não foi possível carregar o carrinho</h1>
        <Button onClick={() => void cart.refetch()}>Tentar de novo</Button>
      </div>
    )
  }
  return desktop ? <DesktopCart cart={cart.data} checkout={checkout} /> : <MobileCart cart={cart.data} checkout={checkout} />
}

// Ao tocar em "Conectar e finalizar" sem sessão, abre o login e segue para o pagamento assim que a sessão existir.
// A intenção fica fora das telas de desktop/mobile porque o carrinho é recarregado (e a tela remontada) no login.
function useCheckoutIntent() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const { open, mode } = useAuthDialog()
  const [wanted, setWanted] = useState(false)
  const dialogShown = useRef(false)

  useEffect(() => {
    if (!wanted) return
    if (session) void navigate({ to: '/pagamento' })
    else if (mode) dialogShown.current = true
    else if (dialogShown.current) {
      dialogShown.current = false
      setWanted(false)
    }
  }, [wanted, session, mode, navigate])

  return () => {
    if (session) void navigate({ to: '/pagamento' })
    else {
      setWanted(true)
      open('login')
    }
  }
}

function CartSkeleton() {
  return (
    <div role="status" aria-label="Carregando carrinho" className="mx-auto flex max-w-[1200px] flex-col gap-3 px-6 pt-10 md:pt-8">
      {Array.from({ length: 3 }, (_, index) => (
        <Skeleton key={index} className="h-[70px] w-full rounded-none" />
      ))}
    </div>
  )
}

// Fluxo compartilhado entre desktop e mobile: cupom, remoção, quantidade e ida ao pagamento.
function useCartActions(cart: Cart, checkout: () => void) {
  const { notify } = useToast()
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const applyCoupon = useApplyCoupon()
  const removeCoupon = useRemoveCoupon()

  const blocked = cart.items.some((item) => item.issue !== null)
  const empty = cart.items.length === 0

  const onError = (error: Error) => notify(error.message, 'error')

  return {
    blocked,
    empty,
    busy: update.isPending || remove.isPending || applyCoupon.isPending || removeCoupon.isPending,
    setQuantity: (item: CartItem, quantity: number) => update.mutate({ key: item.key, quantity }, { onError }),
    remove: (item: CartItem) =>
      remove.mutate(item.key, { onSuccess: () => notify(`${item.title} saiu do carrinho.`, 'info'), onError }),
    applyCoupon: (code: string, handlers: { onSuccess: () => void; onFail: (message: string) => void }) =>
      applyCoupon.mutate(code, { onSuccess: handlers.onSuccess, onError: (error) => handlers.onFail(error.message) }),
    removeCoupon: () => removeCoupon.mutate(undefined, { onError }),
    checkout,
    couponPending: applyCoupon.isPending,
  }
}

type Actions = ReturnType<typeof useCartActions>

function EmptyCart() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg bg-surface-card px-6 py-16 text-center" data-testid="cart-empty">
      <h2 className="text-lg font-bold">Seu carrinho está vazio</h2>
      <p className="max-w-sm text-sm text-text-secondary">Explore o mercado e adicione obras para continuar.</p>
      <Button asChild>
        <Link to="/mercado">Explorar o mercado</Link>
      </Button>
    </div>
  )
}

function CouponForm({ cart, actions, compact }: { cart: Cart; actions: Actions; compact?: boolean }) {
  const [code, setCode] = useState('')
  const [failure, setFailure] = useState<string | null>(null)
  const status = cart.couponStatus
  const message = failure ?? (status === 'expired' || status === 'invalid' ? couponMessages[status] : null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const value = code.trim()
    if (!value) return
    setFailure(null)
    actions.applyCoupon(value, { onSuccess: () => setCode(''), onFail: setFailure })
  }

  return (
    <div className="flex flex-col gap-2">
      {!compact && <label htmlFor="coupon" className="text-sm font-bold">Código promocional</label>}
      {cart.couponCode && status === 'valid' ? (
        <p className="flex h-10 items-center justify-between rounded-[3px] border border-primary px-3 text-sm" data-testid="coupon-applied">
          <span>
            Cupom <strong>{cart.couponCode}</strong> aplicado
          </span>
          <button type="button" onClick={actions.removeCoupon} className="relative text-text-accent underline touch-target">
            Remover
          </button>
        </p>
      ) : (
        <form onSubmit={submit} className={cn('flex h-10 items-center border border-primary pl-2', compact ? 'h-[50px] rounded-full pl-5' : 'rounded-[3px]')}>
          <input
            id="coupon"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Digite o código promocional..."
            aria-label="Código promocional"
            aria-invalid={Boolean(message)}
            aria-describedby="coupon-message"
            autoComplete="off"
            className="min-w-0 flex-1 self-stretch bg-transparent text-xs placeholder:text-secondary focus-visible:outline-offset-4"
          />
          <button
            type="submit"
            disabled={actions.couponPending}
            className={cn(
              'h-full w-[102px] bg-primary text-[15px] font-bold text-ink hover:bg-text-accent disabled:opacity-60',
              compact ? 'rounded-full bg-gradient-to-br from-secondary to-primary text-base' : 'rounded-r-[3px]',
            )}
          >
            Aplicar
          </button>
        </form>
      )}
      <p id="coupon-message" role="status" className="min-h-0 text-xs text-text-coral" data-testid="coupon-message">
        {message}
      </p>
    </div>
  )
}

function DesktopCart({ cart, checkout }: { cart: Cart; checkout: () => void }) {
  const actions = useCartActions(cart, checkout)

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-24 px-6 pt-8 xl:px-0" data-testid="cart-page">
      <div className="flex flex-col gap-3">
        <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
          <Link to="/" className="hover:text-text-accent">Início</Link> / <Link to="/mercado" className="hover:text-text-accent">Mercado</Link> / Carrinho
        </nav>
        <h1 className="sr-only">Carrinho</h1>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-start xl:gap-[86px]">
          <section aria-label="Itens do carrinho" className="min-w-0 flex-1">
            {actions.empty ? (
              <EmptyCart />
            ) : (
              <table className="-mt-3 w-full border-separate border-spacing-y-3 text-left">
                <thead>
                  <tr className="text-[15px] font-medium leading-4">
                    <th scope="col" className="font-medium">NFTs</th>
                    <th scope="col" className="w-[104px] font-medium xl:w-[138px]">Preço</th>
                    <th scope="col" className="w-[100px] font-medium xl:w-[136px]">Edições</th>
                    <th scope="col" className="w-[104px] font-medium xl:w-[145px]">Total</th>
                    <th scope="col" className="w-[48px] xl:w-[52px]"><span className="sr-only">Remover</span></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <DesktopRow key={item.key} item={item} actions={actions} />
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <aside aria-label="Resumo da carteira" className="flex w-full shrink-0 flex-col gap-6 lg:w-[332px]">
            <div className="flex flex-col gap-3">
              <h2 className="text-lg font-bold leading-4">Resumo da carteira</h2>
              <div className="h-px bg-line-soft" />
            </div>
            <CouponForm cart={cart} actions={actions} />
            <OrderTotals totals={cart.summary} />
            <div className="flex flex-col items-center gap-3">
              <Button className="h-10 w-full rounded-[3px] text-[15px]" onClick={actions.checkout} disabled={actions.empty || actions.blocked}>
                Conectar e finalizar
              </Button>
              {actions.blocked && (
                <p role="alert" className="text-xs text-text-coral">
                  Resolva os itens indisponíveis para continuar.
                </p>
              )}
              <Link to="/mercado" className="text-[15px] text-text-accent hover:underline">
                Continuar explorando
              </Link>
            </div>
          </aside>
        </div>
      </div>

      <AlsoViewed cartIds={cart.items.map((item) => item.nftId)} />
    </div>
  )
}

function DesktopRow({ item, actions }: { item: CartItem; actions: Actions }) {
  const message = issueMessage(item)
  return (
    <tr className="bg-surface-card" data-testid="cart-item" data-nft-id={item.nftId}>
      <td className="h-[70px] py-0 pl-0">
        <div className="flex items-center gap-4">
          <img src={item.image?.thumbSrc} alt={item.image?.alt ?? ''} width={70} height={70} className="size-[70px] rounded-md object-cover" />
          <div className="flex min-w-0 flex-col gap-1.5 leading-4">
            <Link to="/nft/$id" params={{ id: item.nftId }} title={item.title} className="line-clamp-2 break-words font-bold hover:text-text-accent">
              {item.title}
            </Link>
            <span className="text-sm text-secondary">Edição {item.editionLabel}</span>
            {message && (
              <span role="alert" className="text-xs text-text-coral" data-testid="cart-item-issue">
                {message}
              </span>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap font-bold text-text-secondary">{displayEth(item.unitPriceEth)} ETH</td>
      <td>
        <QuantityStepper
          value={item.quantity}
          max={Math.max(item.availableQuantity, 1)}
          onChange={(quantity) => actions.setQuantity(item, quantity)}
          label={`quantidade de ${item.title}`}
          className="gap-3 [&_button]:h-[30px] [&_button]:w-[20px] [&_img]:size-4 [&_output]:text-[17px]"
        />
      </td>
      <td className="whitespace-nowrap font-bold text-text-accent" data-testid="line-total">
        {displayEth(item.lineTotalEth)} ETH
      </td>
      <td>
        <button type="button" onClick={() => actions.remove(item)} aria-label={`Remover ${item.title}`} className="relative grid size-8 touch-target place-items-center rounded-md hover:bg-primary/15">
          <img src={trashIcon} alt="" className="size-5" />
        </button>
      </td>
    </tr>
  )
}

function MobileCart({ cart, checkout }: { cart: Cart; checkout: () => void }) {
  const actions = useCartActions(cart, checkout)
  const router = useRouter()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-dvh flex-col" data-testid="cart-page">
      <header className="relative flex h-[72px] items-center justify-center px-7 pt-4">
        <button
          type="button"
          onClick={() => (router.history.length > 1 ? router.history.back() : void navigate({ to: '/mercado' }))}
          aria-label="Voltar"
          className="absolute left-7 top-5 grid size-9 touch-target place-items-center rounded-full border border-line-soft bg-surface-card text-text-accent"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m14 6-6 6 6 6" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">Carrinho de NFTs</h1>
      </header>

      <section aria-label="Itens do carrinho" className="flex flex-1 flex-col gap-5 px-7 pb-8 pt-4">
        {actions.empty ? (
          <EmptyCart />
        ) : (
          <ul className="flex flex-col gap-5">
            {cart.items.map((item) => (
              <MobileRow key={item.key} item={item} actions={actions} />
            ))}
          </ul>
        )}
      </section>

      <aside aria-label="Resumo da carteira" className="flex flex-col gap-4 rounded-t-[32px] bg-surface-card px-6 pb-[120px] pt-6">
        <CouponForm cart={cart} actions={actions} compact />
        <OrderTotals totals={cart.summary} className="text-base" />
        {actions.blocked && (
          <p role="alert" className="text-xs text-text-coral">
            Resolva os itens indisponíveis para continuar.
          </p>
        )}
        <Button
          size="lg"
          className="h-[60px] rounded-full bg-gradient-to-br from-primary to-text-accent text-base"
          onClick={actions.checkout}
          disabled={actions.empty || actions.blocked}
        >
          Conectar e finalizar
        </Button>
      </aside>
    </div>
  )
}

function MobileRow({ item, actions }: { item: CartItem; actions: Actions }) {
  const message = issueMessage(item)
  return (
    <li className="flex overflow-hidden rounded-[18px] bg-surface-card" data-testid="cart-item" data-nft-id={item.nftId}>
      <img src={item.image?.thumbSrc} alt={item.image?.alt ?? ''} width={100} height={100} className="w-[100px] shrink-0 self-stretch object-cover" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link to="/nft/$id" params={{ id: item.nftId }} title={item.title} className="relative block font-bold touch-target">
              <span className="break-words">{item.title}</span>
            </Link>
            <p className="text-sm text-secondary">Edição: {item.editionLabel}</p>
          </div>
          <button type="button" onClick={() => actions.remove(item)} aria-label={`Remover ${item.title}`} className="relative grid size-6 shrink-0 touch-target place-items-center">
            <img src={trashIcon} alt="" className="size-4" />
          </button>
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-xl font-bold text-text-accent" data-testid="line-total">
            {displayEth(item.lineTotalEth)} ETH
          </p>
          <QuantityStepper
            value={item.quantity}
            max={Math.max(item.availableQuantity, 1)}
            onChange={(quantity) => actions.setQuantity(item, quantity)}
            label={`quantidade de ${item.title}`}
            className="gap-2 [&_button]:h-6 [&_button]:w-6 [&_img]:size-4"
          />
        </div>
        {message && (
          <p role="alert" className="text-xs text-text-coral" data-testid="cart-item-issue">
            {message}
          </p>
        )}
      </div>
    </li>
  )
}

function AlsoViewed({ cartIds }: { cartIds: string[] }) {
  const params = { sort: 'price-desc' as const, pageSize: 12 }
  const { data } = useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, { signal }),
  })
  const items = data?.items.filter((nft) => nft.available && !cartIds.includes(nft.id)).slice(0, 10) ?? []
  if (items.length === 0) return null

  return (
    <section aria-labelledby="also-title" className="flex flex-col gap-8" data-testid="also-viewed">
      <div className="flex flex-col gap-3">
        <h2 id="also-title" className="text-[17px] font-bold leading-4 text-text-accent">
          Colecionadores também viram
        </h2>
        <div className="h-px bg-primary/60" />
      </div>
      <Carousel label="Colecionadores também viram">
        {items.map((nft) => (
          <CarouselItem key={nft.id}>
            <NftCard nft={nft} />
          </CarouselItem>
        ))}
      </Carousel>
    </section>
  )
}
