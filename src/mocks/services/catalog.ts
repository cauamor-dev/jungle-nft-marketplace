import {
  categories,
  listings,
  networks,
  sortOptions,
  type Category,
  type Listing,
  type Network,
  type Nft,
  type NftList,
  type Sort,
} from '@/api/contracts'
import { compareEth, isDecimalString } from '@/domain/money'
import type { DbState } from '../db'

export type CatalogQuery = {
  q: string
  categories: Category[]
  chains: Network[]
  sort: Sort
  page: number
  pageSize: number
  featured: boolean
  listing: Listing
  minPrice: string | null
  maxPrice: string | null
}

export const DEFAULT_PAGE_SIZE = 9
export const MAX_PAGE_SIZE = 48

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function priceParam(value: string | null) {
  return value && isDecimalString(value) ? value : null
}

export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
  const sort = params.get('sort')
  return {
    q: params.get('q')?.trim() ?? '',
    categories: params.getAll('category').filter((value): value is Category => categories.includes(value as Category)),
    chains: params.getAll('chain').filter((value): value is Network => networks.includes(value as Network)),
    sort: sortOptions.includes(sort as Sort) ? (sort as Sort) : 'recent',
    page: positiveInt(params.get('page'), 1),
    pageSize: Math.min(positiveInt(params.get('pageSize'), DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE),
    featured: params.get('featured') === 'true',
    listing: listings.includes(params.get('listing') as Listing) ? (params.get('listing') as Listing) : 'all',
    minPrice: priceParam(params.get('minPrice')),
    maxPrice: priceParam(params.get('maxPrice')),
  }
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matches(nft: Nft, query: CatalogQuery, ignore?: 'category' | 'chain') {
  if (query.featured && !nft.featured) return false
  if (query.listing === 'new' && !nft.isNew) return false
  if (query.listing === 'trending' && !nft.trending) return false
  if (query.minPrice && compareEth(nft.priceEth, query.minPrice) < 0) return false
  if (query.maxPrice && compareEth(nft.priceEth, query.maxPrice) > 0) return false
  if (ignore !== 'category' && query.categories.length > 0 && !query.categories.includes(nft.category)) return false
  if (ignore !== 'chain' && query.chains.length > 0 && !query.chains.includes(nft.chain)) return false
  if (query.q) {
    const haystack = normalize(`${nft.title} ${nft.collection} ${nft.attributes.join(' ')}`)
    return haystack.includes(normalize(query.q))
  }
  return true
}

const comparators: Record<Sort, (a: Nft, b: Nft) => number> = {
  recent: (a, b) => b.createdAt.localeCompare(a.createdAt),
  'price-asc': (a, b) => compareEth(a.priceEth, b.priceEth) || a.id.localeCompare(b.id),
  'price-desc': (a, b) => compareEth(b.priceEth, a.priceEth) || a.id.localeCompare(b.id),
  name: (a, b) => a.title.localeCompare(b.title, 'pt-BR'),
}

function countBy<T extends string>(items: Nft[], pick: (nft: Nft) => T) {
  const counts = new Map<T, number>()
  for (const item of items) counts.set(pick(item), (counts.get(pick(item)) ?? 0) + 1)
  return [...counts].map(([value, count]) => ({ value, count })).sort((a, b) => a.value.localeCompare(b.value))
}

export function listNfts(db: DbState, query: CatalogQuery): NftList {
  const source = db.scenario.catalogEmpty ? [] : db.nfts
  const filtered = source.filter((nft) => matches(nft, query))
  const sorted = [...filtered].sort(comparators[query.sort])
  const totalPages = Math.max(1, Math.ceil(sorted.length / query.pageSize))
  const start = (query.page - 1) * query.pageSize
  return {
    items: sorted.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: sorted.length,
    totalPages,
    facets: {
      // Cada faceta ignora o próprio filtro, para o usuário ver quanto cada opção acrescentaria.
      categories: countBy(source.filter((nft) => matches(nft, query, 'category')), (nft) => nft.category),
      chains: countBy(source.filter((nft) => matches(nft, query, 'chain')), (nft) => nft.chain),
    },
  }
}
