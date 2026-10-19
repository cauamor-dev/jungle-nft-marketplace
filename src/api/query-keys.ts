import type { Network, NftListParams } from './contracts'

// Dado privado vive sempre sob ['private', dono, ...], onde o dono é o userId ou o visitante.
// Assim a troca de sessão remove tudo com um único prefixo.
export type Owner = string

export const guestOwner = (guestId: string): Owner => `guest:${guestId}`
export const userOwner = (userId: string): Owner => `user:${userId}`

function cleanParams(params: NftListParams) {
  return {
    q: params.q || undefined,
    category: params.category?.length ? [...params.category].sort() : undefined,
    chain: params.chain?.length ? [...params.chain].sort() : undefined,
    sort: params.sort,
    page: params.page ?? 1,
    pageSize: params.pageSize,
    featured: params.featured || undefined,
    listing: params.listing && params.listing !== 'all' ? params.listing : undefined,
    minPrice: params.minPrice || undefined,
    maxPrice: params.maxPrice || undefined,
  }
}

export const queryKeys = {
  session: ['session'] as const,
  nfts: {
    all: ['nfts'] as const,
    lists: ['nfts', 'list'] as const,
    list: (params: NftListParams) => ['nfts', 'list', cleanParams(params)] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
  },
  privateRoot: ['private'] as const,
  private: (owner: Owner) => ({
    root: ['private', owner] as const,
    favorites: ['private', owner, 'favorites'] as const,
    cart: (network?: Network) => ['private', owner, 'cart', network ?? 'default'] as const,
    cartRoot: ['private', owner, 'cart'] as const,
    quote: ['private', owner, 'quote'] as const,
    orders: ['private', owner, 'orders'] as const,
    order: (id: string) => ['private', owner, 'orders', id] as const,
    profile: ['private', owner, 'profile'] as const,
    wallets: ['private', owner, 'wallets'] as const,
  }),
}
