import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { createWallet, findOrderByKey } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import {
  collectorSchema,
  networkSchema,
  quoteSchema,
  type Cart,
  type Network,
  type User,
  type Wallet,
} from '@/api/contracts'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { isApiError, isUnknownOutcome } from '@/domain/errors'
import { useConnectWallet, useWallets } from '@/features/account/queries'
import { RequireAuth } from '@/features/auth/require-auth'
import { useOwner, useSession } from '@/features/auth/session'
import { useCart } from '@/features/cart/queries'
import { apiFieldErrors, validate, type FieldErrors } from '@/lib/form'
import { useIsDesktop } from '@/lib/use-media-query'
import { clearAttempt, getAttemptKey, getPendingAttemptKey } from './checkout-attempt'
import { clearDrafts, loadDraft, saveDraft } from './checkout-draft'
import { CollectorForm, type CollectorValues } from './collector-form'
import { PaymentSummary } from './payment-summary'
import { quoteSignature } from './quote-signature'
import { useQuote } from './queries'
import { submitOrder } from './place-order'
import { WalletPicker } from './wallet-picker'
import { ProviderChoice } from './provider-choice'

export function PaymentPage() {
  return (
    <RequireAuth title="Entre para finalizar a compra" description="O pagamento fica disponível para colecionadores com sessão ativa. Seu carrinho continua guardado.">
      <PaymentGate />
    </RequireAuth>
  )
}

function PaymentGate() {
  const { data: session } = useSession()
  const wallets = useWallets()
  const cart = useCart()
  const navigate = useNavigate()
  const userId = session?.user.id ?? ''

  // Se um envio anterior ficou sem resposta, o pedido pode já existir no servidor.
  useEffect(() => {
    const key = getPendingAttemptKey(userId)
    if (!key) return
    void findOrderByKey(key)
      .then((order) => order && navigate({ to: '/pedido/$orderId', params: { orderId: order.id }, replace: true }))
      .catch(() => undefined)
  }, [userId, navigate])

  if (!session || wallets.isPending || cart.isPending) return <PaymentSkeleton />
  if (wallets.error || cart.error || !wallets.data || !cart.data) {
    return (
      <div role="alert" className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="payment-error">
        <h1 className="text-2xl font-bold">Não foi possível carregar o pagamento</h1>
        <Button onClick={() => void Promise.all([wallets.refetch(), cart.refetch()])}>Tentar de novo</Button>
      </div>
    )
  }
  if (cart.data.items.length === 0) {
    return (
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid="payment-empty">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="max-w-md text-sm text-text-secondary">Adicione obras ao carrinho antes de seguir para o pagamento.</p>
        <Button asChild>
          <Link to="/mercado">Explorar o mercado</Link>
        </Button>
      </div>
    )
  }
  return <PaymentForm key={session.user.id} user={session.user} wallets={wallets.data.items} cart={cart.data} />
}

function PaymentSkeleton() {
  return (
    <div role="status" aria-label="Carregando pagamento" className="mx-auto flex max-w-[1200px] gap-8 px-6 pt-10">
      <Skeleton className="h-[480px] flex-1 rounded-none" />
      <Skeleton className="hidden h-[480px] w-[405px] rounded-none md:block" />
    </div>
  )
}

function initialValues(user: User, wallet: Wallet | undefined): CollectorValues {
  return {
    displayName: wallet?.displayName ?? user.name,
    username: user.username,
    profileName: wallet?.profileName ?? '',
    email: wallet?.email ?? user.email,
    ensName: wallet?.ensName ?? user.ensName,
    ensSuffix: wallet?.ensSuffix ?? user.ensSuffix,
    referralCode: wallet?.referralCode ?? '',
    walletType: wallet?.walletType ?? 'metamask',
    walletAddress: wallet?.address ?? '',
    secondaryAddress: wallet?.secondaryAddress ?? '',
    note: '',
    network: wallet?.network ?? '',
  }
}

type PaymentFormProps = { user: User; wallets: Wallet[]; cart: Cart }

function PaymentForm({ user, wallets, cart }: PaymentFormProps) {
  const desktop = useIsDesktop()
  const router = useRouter()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const owner = useOwner()
  const connect = useConnectWallet()

  const defaultWallet = wallets.find((wallet) => wallet.kind === 'primary') ?? wallets[0]
  const [values, setValues] = useState<CollectorValues>(() => {
    const draft = loadDraft(user.id)
    return draft ? ({ ...initialValues(user, defaultWallet), ...draft.values } as CollectorValues) : initialValues(user, defaultWallet)
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [outcomeUnknown, setOutcomeUnknown] = useState(false)
  const [accepted, setAccepted] = useState<{ network: Network; signature: string } | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [useOther, setUseOther] = useState(false)

  const network = networkSchema.safeParse(values.network).success ? (values.network as Network) : null
  const quoteQuery = useQuote(network)
  const quote = quoteQuery.data
  const signature = useMemo(() => (quote ? quoteSignature(quote) : null), [quote])

  const selectedWallet = wallets.find((wallet) => wallet.address.toLowerCase() === values.walletAddress.toLowerCase())
  const blockedByItems = cart.items.some((item) => item.issue !== null)

  // A primeira cotação exibida para a rede vale como aceita; qualquer mudança posterior pede confirmação.
  if (signature && network && accepted?.network !== network) setAccepted({ network, signature })

  useEffect(() => {
    saveDraft(user.id, { walletId: selectedWallet?.id ?? null, values })
  }, [user.id, values, selectedWallet?.id])

  // Cotação vence em 5 minutos: uma nova é buscada sozinha e, se mudou, o usuário precisa aceitar.
  useEffect(() => {
    if (!quote) return
    const wait = new Date(quote.expiresAt).getTime() - Date.now()
    const timer = setTimeout(() => void quoteQuery.refetch(), Math.max(wait, 0))
    return () => clearTimeout(timer)
  }, [quote, quoteQuery])

  const needsReconfirm = Boolean(signature && accepted && accepted.network === network && accepted.signature !== signature)

  function setField<K extends keyof CollectorValues>(field: K, value: CollectorValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: '' } : current))
  }

  function pickWallet(wallet: Wallet) {
    setValues((current) => ({
      ...current,
      displayName: wallet.displayName,
      profileName: wallet.profileName,
      email: wallet.email,
      ensName: wallet.ensName,
      ensSuffix: wallet.ensSuffix,
      referralCode: wallet.referralCode,
      walletType: wallet.walletType,
      walletAddress: wallet.address,
      secondaryAddress: wallet.secondaryAddress,
      network: wallet.network,
    }))
    setErrors({})
  }

  // O servidor exige uma carteira cadastrada: se o endereço digitado é novo, ele é cadastrado antes do pedido.
  async function resolveWallet(): Promise<Wallet> {
    if (selectedWallet) return selectedWallet
    const kind = wallets.some((wallet) => wallet.kind === 'primary') ? 'secondary' : 'primary'
    const created = await createWallet({
      displayName: values.displayName,
      label: kind === 'primary' ? 'Principal' : 'Reserva',
      profileName: values.profileName,
      address: values.walletAddress,
      secondaryAddress: values.secondaryAddress,
      network: networkSchema.parse(values.network),
      walletType: values.walletType,
      referralCode: values.referralCode,
      email: values.email,
      ensName: values.ensName,
      ensSuffix: values.ensSuffix,
      kind,
    })
    await queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).wallets })
    return created
  }

  async function confirm() {
    setFormError(null)
    setOutcomeUnknown(false)
    const parsed = validate(collectorSchema, values)
    const nextErrors: FieldErrors = 'errors' in parsed ? parsed.errors : {}
    if (!network) nextErrors.network = 'Selecione uma rede'
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setDetailsOpen(true)
      setFormError('Corrija os campos destacados para continuar.')
      return
    }
    if (!quote || !('data' in parsed) || !network) return

    setSubmitting(true)
    try {
      const wallet = await resolveWallet()
      if (wallet.connection !== 'connected' || wallet.walletType !== parsed.data.walletType) {
        await connect.mutateAsync({ id: wallet.id, provider: parsed.data.walletType })
      }
      const input = { quoteId: quote.id, walletId: wallet.id, network, collector: parsed.data }
      const order = await submitOrder(input, getAttemptKey(user.id, input))
      clearAttempt()
      clearDrafts(user.id)
      queryClient.setQueryData(queryKeys.private(owner).order(order.id), order)
      void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).cartRoot })
      void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).orders })
      await navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
    } catch (error) {
      handleFailure(error)
    } finally {
      setSubmitting(false)
    }
  }

  function handleFailure(error: unknown) {
    if (isUnknownOutcome(error)) {
      setOutcomeUnknown(true)
      setFormError('Não recebemos a resposta do servidor. Seu pedido pode ter sido criado: confira antes de tentar de novo.')
      return
    }
    if (!isApiError(error)) {
      setFormError('Não foi possível concluir a compra agora.')
      return
    }

    const fields = Object.fromEntries(Object.entries(apiFieldErrors(error)).map(([key, message]) => [key.replace(/^collector\./, ''), message]))
    if (Object.keys(fields).length > 0) {
      setErrors(fields)
      setDetailsOpen(true)
    }

    if (error.code === 'QUOTE_STALE') {
      const details = error.details as { currentQuote?: unknown } | undefined
      const current = quoteSchema.safeParse(details?.currentQuote)
      if (current.success) {
        queryClient.setQueryData([...queryKeys.private(owner).quote, current.data.network], current.data)
      } else void quoteQuery.refetch()
      void queryClient.invalidateQueries({ queryKey: queryKeys.private(owner).cartRoot })
      setFormError('Os valores mudaram desde a cotação. Confira o novo total e aceite para continuar.')
      return
    }
    if (error.code === 'QUOTE_EXPIRED') {
      void quoteQuery.refetch()
      setFormError('A cotação expirou. Conferimos os valores de novo: aceite o total para continuar.')
      return
    }
    setFormError(error.message)
  }

  async function checkExistingOrder() {
    const key = getPendingAttemptKey(user.id)
    const order = key ? await findOrderByKey(key).catch(() => null) : null
    if (order) {
      clearAttempt()
      await navigate({ to: '/pedido/$orderId', params: { orderId: order.id } })
    } else {
      setFormError('Nenhum pedido foi criado ainda. Você pode confirmar a compra de novo com segurança.')
      setOutcomeUnknown(false)
    }
  }

  const otherWallets = wallets.length > 1 && (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-[15px]">
        <input
          type="checkbox"
          checked={useOther}
          onChange={(event) => setUseOther(event.target.checked)}
          className="size-[15px] accent-primary"
        />
        Usar outra carteira?
      </label>
      {useOther && <WalletPicker wallets={wallets} selectedId={selectedWallet?.id ?? null} onSelect={pickWallet} />}
    </div>
  )

  const canConfirm =
    !submitting && !outcomeUnknown && Boolean(quote) && !needsReconfirm && !blockedByItems && !quoteQuery.isFetching

  const summary = quote ? (
    <PaymentSummary
      quote={quote}
      cart={cart}
      refreshing={quoteQuery.isFetching}
      reconfirm={needsReconfirm ? { previousTotal: previousTotal(accepted?.signature), onAccept: () => setAccepted({ network: quote.network, signature: signature as string }) } : null}
    />
  ) : null

  const confirmButton = (
    <Button
      size="lg"
      className="h-[45px] w-full rounded-lg text-[15px] max-md:h-[60px] max-md:rounded-full max-md:bg-gradient-to-br max-md:from-primary max-md:to-text-accent max-md:text-base"
      onClick={() => void confirm()}
      disabled={!canConfirm}
      aria-busy={submitting}
    >
      {submitting ? 'Confirmando…' : 'Confirmar compra'}
    </Button>
  )

  const status = (
    <div className="flex flex-col gap-2" aria-live="polite">
      {blockedByItems && (
        <p role="alert" className="text-sm text-text-coral" data-testid="payment-items-issue">
          Há itens indisponíveis no carrinho. <Link to="/carrinho" className="underline">Revisar carrinho</Link>
        </p>
      )}
      {quoteQuery.error && (
        <p role="alert" className="text-sm text-text-coral" data-testid="quote-error">
          {isApiError(quoteQuery.error) ? quoteQuery.error.message : 'Não foi possível calcular a cotação.'}{' '}
          <button type="button" onClick={() => void quoteQuery.refetch()} className="underline">
            Tentar de novo
          </button>
        </p>
      )}
      {formError && (
        <p role="alert" className="text-sm text-text-coral" data-testid="payment-form-error">
          {formError}
        </p>
      )}
      {outcomeUnknown && (
        <Button variant="outline" size="sm" onClick={() => void checkExistingOrder()}>
          Conferir se o pedido foi criado
        </Button>
      )}
    </div>
  )

  if (!desktop) {
    return (
      <div className="flex min-h-dvh flex-col gap-5 px-7 pb-6 pt-5" data-testid="payment-page">
        <header className="relative flex h-10 items-center justify-center">
          <button
            type="button"
            onClick={() => (router.history.length > 1 ? router.history.back() : void navigate({ to: '/carrinho' }))}
            aria-label="Voltar"
            className="absolute left-0 grid size-9 place-items-center rounded-full border border-line-soft bg-surface-card text-text-accent"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Pagamento com carteira</h1>
        </header>

        <section aria-labelledby="wallet-title" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 id="wallet-title" className="text-[17px] font-bold">Carteira conectada</h2>
            <Link to="/perfil/carteiras" className="text-sm font-bold text-text-accent">Trocar carteira</Link>
          </div>
          {wallets.length > 0 ? (
            <WalletPicker wallets={wallets} selectedId={selectedWallet?.id ?? null} onSelect={pickWallet} />
          ) : (
            <p className="rounded-lg bg-surface-card px-4 py-3 text-sm text-text-secondary">
              Nenhuma carteira cadastrada. Informe o endereço em Dados do colecionador para cadastrar uma agora.
            </p>
          )}
        </section>

        <section aria-labelledby="provider-title" className="flex flex-col gap-3">
          <h2 id="provider-title" className="text-[17px] font-bold">Carteira e rede</h2>
          <ProviderChoice value={values.walletType} onChange={(type) => setField('walletType', type)} variant="cards" />
        </section>

        <details
          open={detailsOpen}
          onToggle={(event) => setDetailsOpen(event.currentTarget.open)}
          className="rounded-lg bg-surface-card"
        >
          <summary className="cursor-pointer px-4 py-3 text-[17px] font-bold">Dados do colecionador</summary>
          <div className="px-4 pb-4">
            <CollectorForm values={values} errors={errors} onChange={setField} otherWallets={null} />
          </div>
        </details>

        {summary}
        {status}
        <div className="mt-auto">{confirmButton}</div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 pt-8 xl:px-0" data-testid="payment-page">
      <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
        <Link to="/" className="hover:text-text-accent">Início</Link> / <Link to="/mercado" className="hover:text-text-accent">Mercado</Link> / Pagamento
      </nav>
      <div className="flex items-start gap-8">
        <section aria-labelledby="collector-title" className="flex min-w-0 flex-1 flex-col gap-3">
          <h1 id="collector-title" className="text-[17px] font-bold leading-4">Perfil do colecionador</h1>
          <CollectorForm values={values} errors={errors} onChange={setField} otherWallets={otherWallets} />
        </section>

        <aside aria-label="Resumo do pedido" className="flex w-[405px] shrink-0 flex-col gap-5">
          {summary}
          <section aria-labelledby="provider-title" className="flex flex-col gap-5">
            <h2 id="provider-title" className="text-center text-[17px] font-bold leading-4">Carteira e rede</h2>
            <ProviderChoice value={values.walletType} onChange={(type) => setField('walletType', type)} variant="rows" />
            {confirmButton}
            {status}
          </section>
        </aside>
      </div>
    </div>
  )
}

function previousTotal(accepted: string | undefined) {
  if (!accepted) return null
  try {
    return (JSON.parse(accepted) as { totalEth: string }).totalEth
  } catch {
    return null
  }
}
