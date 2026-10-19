import { MockHttpError } from '../http-error'
import { persist, type DbState } from '../db'
import { requireSession } from '../services/auth'
import { listNfts, parseCatalogQuery } from '../services/catalog'
import { route } from './route'

function requireNft(db: DbState, id: string) {
  const nft = db.nfts.find((candidate) => candidate.id === id)
  if (!nft) throw new MockHttpError(404, 'NFT_NOT_FOUND', 'NFT não encontrado.')
  return nft
}

function favoriteIds(db: DbState, userId: string) {
  db.favorites[userId] ??= []
  return db.favorites[userId]
}

export const catalogHandlers = [
  route('get', '/api/nfts', async ({ db, url }) => ({ ...listNfts(db, parseCatalogQuery(url.searchParams)) })),

  route('get', '/api/nfts/:id', async ({ db, params }) => ({ ...requireNft(db, params.id) })),

  route('get', '/api/favorites', async ({ db, request }) => {
    const { user } = requireSession(db, request)
    return { nftIds: favoriteIds(db, user.id) }
  }),

  route('post', '/api/favorites/:id', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    const nft = requireNft(db, params.id)
    const ids = favoriteIds(db, user.id)
    if (!ids.includes(nft.id)) ids.push(nft.id)
    persist()
    return { nftIds: ids }
  }),

  route('delete', '/api/favorites/:id', async ({ db, request, params }) => {
    const { user } = requireSession(db, request)
    db.favorites[user.id] = favoriteIds(db, user.id).filter((id) => id !== params.id)
    persist()
    return { nftIds: db.favorites[user.id] }
  }),
]
