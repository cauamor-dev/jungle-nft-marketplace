import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import type { Edition, Nft } from '@/api/contracts'
import cartIcon from '@/assets/icons/card-cart.svg'
import heartLight from '@/assets/icons/heart-light.svg'
import heart from '@/assets/icons/heart.svg'
import shareLinkedin from '@/assets/icons/share-linkedin.svg'
import shareMail from '@/assets/icons/share-mail.svg'
import shareTwitter from '@/assets/icons/share-twitter.svg'
import star from '@/assets/icons/star.svg'
import starEmpty from '@/assets/icons/star-empty.svg'
import { pickDefaultEdition } from '@/components/nft/editions'
import { Button } from '@/components/ui/button'
import { QuantityStepper } from '@/components/ui/quantity-stepper'
import { ErrorActions } from '@/components/ui/error-actions'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { displayEth } from '@/domain/money'
import { isApiError } from '@/domain/errors'
import { useRequireAuth } from '@/features/auth/auth-context'
import { useAddToCart } from '@/features/cart/queries'
import { useFavorites, useToggleFavorite } from '@/features/favorites/queries'
import { cn } from '@/lib/cn'
import { useIsDesktop } from '@/lib/use-media-query'
import { EditionPicker } from './edition-picker'
import { Gallery } from './gallery'
import { useNftDetail } from './queries'
import { RelatedNfts } from './related-nfts'

export function NftDetailPage({ id }: { id: string }) {
  const { data: nft, error, isPending, refetch } = useNftDetail(id)

  if (isPending) return <DetailSkeleton />
  if (error || !nft) {
    const notFound = isApiError(error) && error.status === 404
    return <DetailError notFound={notFound} onRetry={() => void refetch()} />
  }
  return <NftDetail nft={nft} />
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="Carregando NFT" className="mx-auto flex w-full max-w-[1200px] items-start gap-8 px-6 pt-8 md:min-h-[1500px] xl:px-0">
      <Skeleton className="size-[444px] max-md:size-full max-md:h-[360px]" />
      <div className="hidden flex-1 flex-col gap-4 md:flex">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  )
}

function DetailError({ notFound, onRetry }: { notFound: boolean; onRetry: () => void }) {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-4 px-6 py-24 text-center" data-testid={notFound ? 'nft-not-found' : 'nft-error'}>
      <h1 className="text-2xl font-bold">{notFound ? 'NFT não encontrado' : 'Não foi possível carregar este NFT'}</h1>
      <p className="max-w-md text-sm text-text-secondary">
        {notFound ? 'Esta obra não existe ou foi removida do mercado.' : 'Verifique a conexão e tente de novo.'}
      </p>
      <ErrorActions>
        {!notFound && <Button onClick={onRetry}>Tentar de novo</Button>}
        <Button variant={notFound ? 'primary' : 'outline'} asChild>
          <Link to="/mercado">Voltar ao mercado</Link>
        </Button>
      </ErrorActions>
    </div>
  )
}

function Stars({ average }: { average: string }) {
  const filled = Math.round(Number(average))
  return (
    <span className="flex gap-1" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => (
        <img key={index} src={index < filled ? star : starEmpty} alt="" className="size-[15px]" />
      ))}
    </span>
  )
}

function NftDetail({ nft }: { nft: Nft }) {
  const desktop = useIsDesktop()
  const navigate = useNavigate()
  const router = useRouter()
  const { notify } = useToast()
  const requireAuth = useRequireAuth()
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const [chosenEditionId, setChosenEditionId] = useState<string | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [tab, setTab] = useState<'details' | 'reviews'>('details')

  const chosen = nft.editions.find((edition) => edition.id === chosenEditionId && edition.stock > 0)
  const edition: Edition | undefined = chosen ?? pickDefaultEdition(nft)
  const maxQuantity = edition ? Math.min(edition.maxPerBuyer, edition.stock) : 1
  const safeQuantity = Math.min(quantity, maxQuantity)
  const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false
  const unavailable = !nft.available || !edition

  function selectEdition(next: Edition) {
    setChosenEditionId(next.id)
    setQuantity((current) => Math.min(current, Math.min(next.maxPerBuyer, next.stock)))
  }

  function addAndThen(onDone: () => void) {
    if (!edition) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: safeQuantity },
      {
        onSuccess: onDone,
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }

  const buy = () => addAndThen(() => void navigate({ to: '/carrinho' }))
  const addOnly = () => addAndThen(() => notify(`${nft.title} foi para o carrinho.`, 'success'))
  const favorite = () =>
    requireAuth(() =>
      toggleFavorite.mutate(
        { nftId: nft.id, favorite: !isFavorite },
        { onError: () => notify('Não foi possível atualizar seus favoritos.', 'error') },
      ),
    )

  const shareUrl = encodeURIComponent(window.location.href)
  const shareText = encodeURIComponent(`${nft.title} no Kurio`)

  const stepper = (
    <QuantityStepper value={safeQuantity} max={maxQuantity} onChange={setQuantity} label="quantidade" disabled={unavailable} />
  )
  const price = <p className="text-[22px] font-bold leading-4 text-text-accent">{displayEth(nft.priceEth)} ETH</p>

  if (!desktop) {
    return (
      <div className="flex min-h-dvh flex-col" data-testid="nft-detail">
        <div className="relative px-7 pt-[66px]">
          <button
            type="button"
            onClick={() => (router.history.length > 1 ? router.history.back() : void navigate({ to: '/mercado' }))}
            aria-label="Voltar"
            className="absolute left-7 top-6 grid size-9 place-items-center rounded-full border border-line-soft bg-surface-card text-text-accent"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m14 6-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={favorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
            className="absolute right-7 top-6 grid size-9 place-items-center rounded-full border border-line-soft bg-surface-card"
          >
            <img src={isFavorite ? heartLight : heart} alt="" className="size-4" />
          </button>
          <div className="h-[330px] overflow-hidden rounded-t-[24px]">
            <img src={nft.images[0]?.src} alt={nft.images[0]?.alt} fetchPriority="high" className={cn('w-full rounded-[24px] object-cover', unavailable && 'opacity-60 grayscale')} />
          </div>
        </div>

        <div className="-mt-1 flex flex-1 flex-col gap-4 rounded-t-[32px] bg-surface-card px-6 pb-[200px] pt-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-xl font-bold leading-7">{nft.title}</h1>
            <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-primary px-2.5 py-1 text-sm font-bold text-text-accent" aria-label={`Nota ${nft.rating.average} de 5, ${nft.rating.count} avaliações`}>
              <img src={star} alt="" className="size-3.5" />
              {nft.rating.average}
              <span className="font-normal text-text-secondary">({nft.rating.count})</span>
            </span>
          </div>
          <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
          <div className="flex flex-col gap-2">
            <p className="text-[15px] font-bold">Edição:</p>
            <EditionPicker editions={nft.editions} selectedId={edition?.id ?? null} onSelect={selectEdition} />
          </div>
          <TokenFacts nft={nft} />
          {unavailable && <UnavailableNote />}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-4 rounded-t-[24px] bg-ink px-6 pb-6 pt-5 shadow-[0_-8px_24px_rgba(0,0,0,0.4)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-text-secondary">Qtd.</span>
              {stepper}
            </div>
            <p className="text-2xl font-bold text-text-accent">{displayEth(nft.priceEth)} ETH</p>
          </div>
          <div className="flex items-center gap-3">
            <Button size="lg" className="h-[60px] flex-1 rounded-full bg-gradient-to-br from-primary to-text-accent text-base" onClick={buy} disabled={unavailable || addToCart.isPending}>
              Comprar NFT
            </Button>
            <button
              type="button"
              onClick={addOnly}
              disabled={unavailable || addToCart.isPending}
              aria-label="Adicionar ao carrinho"
              className="grid size-[60px] place-items-center rounded-full border border-line bg-surface-card disabled:opacity-50"
            >
              <img src={cartIcon} alt="" className="size-5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-24 px-6 pt-8 xl:px-0" data-testid="nft-detail">
      <div className="flex flex-col gap-3">
        <nav aria-label="Trilha de navegação" className="text-[15px] font-bold leading-4">
          <Link to="/" className="hover:text-text-accent">Início</Link> / <Link to="/mercado" className="hover:text-text-accent">Mercado</Link>
        </nav>

        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="shrink-0 self-center lg:self-start">
            <Gallery images={nft.images} title={nft.title} unavailable={unavailable} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-between gap-5">
            <div className="flex flex-col gap-3">
              <h1 className="text-[28px] font-bold leading-tight">{nft.title}</h1>
              <div className="flex items-center justify-between gap-4 border-b-[0.3px] border-primary pb-3">
                {price}
                <div className="flex items-center gap-1">
                  <Stars average={nft.rating.average} />
                  <p className="ml-1 text-[15px]">{nft.rating.count} avaliações de colecionadores</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-bold leading-4">Sobre este NFT:</h2>
              <p className="text-sm leading-6 text-text-secondary">{nft.description}</p>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="text-[15px] font-bold leading-4">Edição:</h2>
              <EditionPicker editions={nft.editions} selectedId={edition?.id ?? null} onSelect={selectEdition} />
            </div>

            <div className="flex items-start justify-between">
              {stepper}
              <div className="flex gap-2">
                <Button className="h-10 w-[130px] text-sm" onClick={buy} disabled={unavailable || addToCart.isPending}>
                  COMPRAR
                </Button>
                <Button variant="outline" className="h-10 w-[130px] gap-2 text-sm font-medium" onClick={favorite} aria-pressed={isFavorite}>
                  <img src={isFavorite ? heartLight : heart} alt="" className="size-5" />
                  Favoritar
                </Button>
              </div>
            </div>
            {unavailable && <UnavailableNote />}

            <div className="flex flex-col gap-3">
              <TokenFacts nft={nft} />
              <p className="flex items-center gap-2 text-[15px] font-bold">
                Compartilhar este NFT:
                <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no LinkedIn">
                  <img src={shareLinkedin} alt="" className="size-4" />
                </a>
                <a href={`mailto:?subject=${shareText}&body=${shareUrl}`} aria-label="Compartilhar por e-mail">
                  <img src={shareMail} alt="" className="size-4" />
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noreferrer" aria-label="Compartilhar no X">
                  <img src={shareTwitter} alt="" className="size-4" />
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <section aria-label="Informações do NFT" className="flex flex-col gap-3">
        <div className="border-b-[0.3px] border-primary">
          <div role="tablist" aria-label="Informações do NFT" className="flex gap-8 text-[17px] leading-4">
            <TabButton active={tab === 'details'} id="details" onClick={() => setTab('details')}>
              Detalhes do NFT
            </TabButton>
            <TabButton active={tab === 'reviews'} id="reviews" onClick={() => setTab('reviews')}>
              Avaliações de colecionadores ({nft.rating.count})
            </TabButton>
          </div>
        </div>
        {tab === 'details' ? (
          <div role="tabpanel" id="panel-details" aria-labelledby="tab-details" className="flex flex-col gap-3 text-sm leading-6 text-text-secondary">
            {nft.details.overview.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {nft.details.sections.map((section) => (
              <div key={section.label}>
                <h3 className="font-bold text-foreground">{section.label}</h3>
                <p>{section.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div role="tabpanel" id="panel-reviews" aria-labelledby="tab-reviews" className="flex items-center gap-3 text-sm text-text-secondary">
            <Stars average={nft.rating.average} />
            <p>
              Nota média {nft.rating.average} de 5 em {nft.rating.count} avaliações de colecionadores.
            </p>
          </div>
        )}
      </section>

      <RelatedNfts nft={nft} />
    </div>
  )
}

function TabButton({ active, id, onClick, children }: { active: boolean; id: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={active}
      aria-controls={`panel-${id}`}
      onClick={onClick}
      className={cn('relative pb-3', active ? 'font-bold text-text-accent' : 'text-foreground hover:text-text-accent')}
    >
      {children}
      {active && <span aria-hidden="true" className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-primary" />}
    </button>
  )
}

function TokenFacts({ nft }: { nft: Nft }) {
  return (
    <ul className="flex flex-col gap-3 text-[15px] leading-5 text-secondary max-md:text-base">
      <li>ID do token: {nft.tokenId}</li>
      <li>Coleção: {nft.collection}</li>
      <li>Atributos: {nft.attributes.join(', ')}</li>
    </ul>
  )
}

function UnavailableNote() {
  return (
    <p role="status" className="rounded-md border border-text-coral px-3 py-2 text-sm text-text-coral" data-testid="nft-unavailable">
      Todas as edições deste NFT estão esgotadas no momento.
    </p>
  )
}
