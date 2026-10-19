import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { listNfts } from '@/api/endpoints'
import { queryKeys } from '@/api/query-keys'
import { Skeleton } from '@/components/ui/skeleton'

const featuredParams = { featured: true, pageSize: 1, sort: 'price-desc' } as const

export function FeaturedBanner() {
  const { data, isPending } = useQuery({
    queryKey: queryKeys.nfts.list(featuredParams),
    queryFn: ({ signal }) => listNfts(featuredParams, { signal }),
  })
  const nft = data?.items[0]

  return (
    <aside aria-label="NFT em destaque" className="relative flex h-[470px] flex-col gap-4 overflow-hidden bg-gradient-to-b from-primary/10 to-primary/[0.03] pb-1 pt-6">
      <div className="flex flex-col items-center gap-4 px-5 text-center">
        <p className="w-full text-2xl font-bold leading-8 text-text-accent">NFT EM DESTAQUE</p>
        <p className="w-full text-[22px] font-bold leading-4">OFERTA LIMITADA</p>
      </div>
      {isPending && <Skeleton className="h-[368px] w-full rounded-[22px]" />}
      {nft?.images[0] && (
        <Link to="/nft/$id" params={{ id: nft.id }} className="block" aria-label={`Ver ${nft.title}`}>
          <img src={nft.images[0].thumbSrc} alt="" width={400} height={400} loading="lazy" className="h-[368px] w-full rounded-[22px] object-cover" />
        </Link>
      )}
    </aside>
  )
}
