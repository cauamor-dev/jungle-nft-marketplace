import { useQuery } from '@tanstack/react-query'
import { listNfts } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import type { Nft } from '@/api/contracts'
import { NftCard } from '@/components/nft/nft-card'
import { Carousel, CarouselItem } from '@/components/ui/carousel'
import { Skeleton } from '@/components/ui/skeleton'

export function RelatedNfts({ nft }: { nft: Nft }) {
  const params = { q: nft.collection, pageSize: 12 }
  const { data, isPending } = useQuery({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => listNfts(params, { signal }),
  })
  const items = data?.items.filter((item) => item.id !== nft.id) ?? []

  if (!isPending && items.length === 0) return null

  return (
    <section aria-labelledby="related-title" className="flex flex-col gap-8" data-testid="related-nfts">
      <div className="flex flex-col gap-3">
        <h2 id="related-title" className="text-[17px] font-bold leading-4 text-text-accent">
          Mais desta coleção
        </h2>
        <div className="h-px bg-primary/60" />
      </div>
      {isPending ? (
        <div className="flex gap-6 overflow-hidden" role="status" aria-label="Carregando coleção">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-[255px] w-[219px] shrink-0 rounded-none" />
          ))}
        </div>
      ) : (
        <Carousel label="Mais desta coleção">
          {items.map((item) => (
            <CarouselItem key={item.id}>
              <NftCard nft={item} />
            </CarouselItem>
          ))}
        </Carousel>
      )}
    </section>
  )
}
