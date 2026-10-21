import { Link } from '@tanstack/react-router'
import type { Nft } from '@/api/contracts'
import cartIcon from '@/assets/icons/card-cart.svg'
import zoomIcon from '@/assets/icons/zoom.svg'
import { useRequireAuth } from '@/features/auth/auth-context'
import { useAddToCart } from '@/features/cart/queries'
import { useFavorites, useToggleFavorite } from '@/features/favorites/queries'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/cn'
import { HeartIcon } from './heart-icon'
import { Price } from './price'
import { pickDefaultEdition } from './editions'

type NftCardProps = {
  nft: Nft
  className?: string
  imageEager?: boolean
}

export function NftCard({ nft, className, imageEager }: NftCardProps) {
  const image = nft.images[0]
  const favorites = useFavorites()
  const toggleFavorite = useToggleFavorite()
  const addToCart = useAddToCart()
  const { notify } = useToast()
  const isFavorite = favorites.data?.nftIds.includes(nft.id) ?? false
  const edition = pickDefaultEdition(nft)

  const handleFavorite = useRequireAuth(() =>
    toggleFavorite.mutate(
      { nftId: nft.id, favorite: !isFavorite },
      {
        onSuccess: () => notify(isFavorite ? `${nft.title} saiu dos favoritos.` : `${nft.title} foi para os favoritos.`, 'success'),
        onError: () => notify('Não foi possível atualizar seus favoritos.', 'error'),
      },
    ),
  )

  function handleAdd() {
    if (!edition) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity: 1 },
      {
        onSuccess: () => notify(`${nft.title} foi para o carrinho.`, 'success'),
        onError: (error) => notify(error.message, 'error'),
      },
    )
  }

  const detailLink = { to: '/nft/$id', params: { id: nft.id } } as const

  return (
    <article className={cn('group relative flex flex-col gap-2 md:gap-3', className)} data-testid="nft-card" data-nft-id={nft.id}>
      <div className="relative grid aspect-[175/200] place-items-center overflow-hidden rounded-[20px] bg-gradient-to-br from-surface-card from-[12%] to-surface-raised md:aspect-[258/300] md:rounded-none md:bg-none md:bg-surface-card">
        <Link {...detailLink} tabIndex={-1} aria-hidden="true" className="grid size-full place-items-center">
          {image && (
            <img
              src={image.thumbSrc}
              alt=""
              width={400}
              height={400}
              loading={imageEager ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'aspect-square w-[96%] rounded-2xl object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] md:rounded-[15px]',
                !nft.available && 'opacity-50 grayscale',
              )}
            />
          )}
        </Link>
        {nft.badge && (
          <span className="pointer-events-none absolute left-0 top-4 bg-primary px-2 py-1 text-[13px] font-medium text-ink md:top-3 md:px-3 md:text-xs">
            {nft.badge}
          </span>
        )}
        {!nft.available && (
          <span className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-fit rounded-sm bg-ink/85 px-3 py-1 text-xs font-bold text-text-coral">
            Indisponível
          </span>
        )}

        <button
          type="button"
          onClick={handleFavorite}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
          className="absolute right-2 top-2 grid size-7 touch-target place-items-center rounded-full border border-line bg-surface-raised md:hidden"
        >
          <HeartIcon filled={isFavorite} className="size-3.5" />
        </button>

        <div className="absolute inset-x-0 bottom-3 hidden translate-y-1 items-center justify-center gap-2 opacity-0 transition-[opacity,transform] duration-200 focus-within:translate-y-0 focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!edition || addToCart.isPending}
            aria-label={`Adicionar ${nft.title} ao carrinho`}
            className="grid size-8 place-items-center rounded-sm bg-ink/90 transition-colors hover:bg-surface-raised active:scale-95 disabled:opacity-40"
          >
            <img src={cartIcon} alt="" className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleFavorite}
            aria-pressed={isFavorite}
            aria-label={isFavorite ? `Remover ${nft.title} dos favoritos` : `Favoritar ${nft.title}`}
            className="grid size-8 place-items-center rounded-sm bg-ink/90 hover:bg-surface-raised"
          >
            <HeartIcon filled={isFavorite} className="size-4" />
          </button>
          <Link
            {...detailLink}
            aria-label={`Ver detalhes de ${nft.title}`}
            className="grid size-8 place-items-center rounded-sm bg-ink/90 hover:bg-surface-raised"
          >
            <img src={zoomIcon} alt="" className="size-4" />
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pl-2 md:pl-0">
        <h3 className="text-[15px] font-normal leading-tight md:text-base">
          <Link {...detailLink} className="relative text-foreground touch-target hover:text-text-accent">
            {nft.title}
          </Link>
        </h3>
        <Price valueEth={nft.priceEth} compareEth={nft.compareAtPriceEth} />
      </div>
    </article>
  )
}
