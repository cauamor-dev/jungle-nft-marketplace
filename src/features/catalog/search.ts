import {
  categories,
  listings,
  networks,
  sortOptions,
  type Category,
  type Listing,
  type Network,
  type NftListParams,
  type Sort,
} from '@/api/contracts'
import { isDecimalString } from '@/domain/money'

export const PAGE_SIZE = 9

export type CatalogSearch = {
  q?: string
  category?: Category[]
  chain?: Network[]
  sort?: Sort
  listing?: Listing
  page?: number
  minPrice?: string
  maxPrice?: string
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  return value === undefined ? [] : [value]
}

function pick<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  return [...new Set(asArray(value).map(String).filter((item): item is T => allowed.includes(item as T)))]
}

// A URL é entrada do usuário: tudo o que não for válido é descartado em vez de quebrar a página.
export function validateCatalogSearch(raw: Record<string, unknown>): CatalogSearch {
  const category = pick(raw.category, categories)
  const chain = pick(raw.chain, networks)
  const page = Number(raw.page)
  const q = typeof raw.q === 'string' ? raw.q.trim() : ''
  const price = (value: unknown) => (typeof value === 'string' && isDecimalString(value) ? value : undefined)
  return {
    q: q || undefined,
    category: category.length ? category : undefined,
    chain: chain.length ? chain : undefined,
    sort: sortOptions.includes(raw.sort as Sort) && raw.sort !== 'recent' ? (raw.sort as Sort) : undefined,
    listing: listings.includes(raw.listing as Listing) && raw.listing !== 'all' ? (raw.listing as Listing) : undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
    minPrice: price(raw.minPrice),
    maxPrice: price(raw.maxPrice),
  }
}

export function searchToParams(search: CatalogSearch): NftListParams {
  return {
    q: search.q,
    category: search.category,
    chain: search.chain,
    sort: search.sort ?? 'recent',
    listing: search.listing ?? 'all',
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
    minPrice: search.minPrice,
    maxPrice: search.maxPrice,
  }
}

// URLs legíveis: category=art&category=music em vez de JSON na query string.
const ARRAY_KEYS = new Set(['category', 'chain'])

export function parseSearch(searchString: string): Record<string, unknown> {
  const params = new URLSearchParams(searchString)
  const result: Record<string, unknown> = {}
  for (const key of new Set(params.keys())) {
    result[key] = ARRAY_KEYS.has(key) ? params.getAll(key) : params.get(key)
  }
  return result
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((item) => params.append(key, String(item)))
    else params.set(key, String(value))
  }
  const text = params.toString()
  return text ? `?${text}` : ''
}
