import { categories, networks, sortOptions, type Category, type Network, type Nft, type NftList, type Sort } from '@/api/contracts'
import { compareEth } from '@/domain/money'
import type { DbState } from '../db'

export type CatalogQuery = {
  q: string
  categories: Category[]
  chains: Network[]
  sort: Sort
  page: number
  pageSize: number
  featured: boolean
}

export const DEFAULT_PAGE_SIZE = 12
export const MAX_PAGE_SIZE = 48

function positiveInt(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
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
  }
}

function normalize(text: string) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matches(nft: Nft, query: CatalogQuery) {
  if (query.featured && !nft.featured) return false
  if (query.categories.length > 0 && !query.categories.includes(nft.category)) return false
  if (query.chains.length > 0 && !query.chains.includes(nft.chain)) return false
  if (query.q) {
    const haystack = normalize(`${nft.title} ${nft.creator}`)
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
  const filtered = db.scenario.catalogEmpty ? [] : db.nfts.filter((nft) => matches(nft, query))
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
      categories: countBy(filtered, (nft) => nft.category),
      chains: countBy(filtered, (nft) => nft.chain),
    },
  }
}
