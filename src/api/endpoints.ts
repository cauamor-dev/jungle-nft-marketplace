import type { z } from 'zod'
import {
  cartSchema,
  favoritesSchema,
  loginResponseSchema,
  nftListSchema,
  nftSchema,
  orderListSchema,
  orderSchema,
  quoteSchema,
  sessionSchema,
  userSchema,
  walletListSchema,
  walletSchema,
  type AddCartItemInput,
  type ChangePasswordInput,
  type CreateOrderInput,
  type LoginInput,
  type Network,
  type NftListParams,
  type RegisterInput,
  type UpdateProfileInput,
  type WalletType,
  type WalletInput,
} from './contracts'
import { http } from './http'

type Options = { signal?: AbortSignal }

async function parse<T extends z.ZodType>(schema: T, request: Promise<{ data: unknown }>): Promise<z.infer<T>> {
  const { data } = await request
  return schema.parse(data)
}

// Sessão e conta

export const register = (input: RegisterInput) => http.post('/api/auth/register', input).then(({ data }) => userSchema.parse(data.user))
export const login = (input: LoginInput) => parse(loginResponseSchema, http.post('/api/auth/login', input))
export const fetchSession = (options?: Options) => parse(sessionSchema, http.get('/api/auth/session', options))
export const logout = () => http.post('/api/auth/logout').then(() => undefined)

// Catálogo

export function listNfts(params: NftListParams, options?: Options) {
  return parse(nftListSchema, http.get('/api/nfts', { params, ...options }))
}

export const getNft = (id: string, options?: Options) => parse(nftSchema, http.get(`/api/nfts/${id}`, options))

// Favoritos

export const getFavorites = (options?: Options) => parse(favoritesSchema, http.get('/api/favorites', options))
export const addFavorite = (nftId: string) => parse(favoritesSchema, http.post(`/api/favorites/${nftId}`))
export const removeFavorite = (nftId: string) => parse(favoritesSchema, http.delete(`/api/favorites/${nftId}`))

// Carrinho

export const getCart = (network?: Network, options?: Options) =>
  parse(cartSchema, http.get('/api/cart', { params: { network }, ...options }))
export const addCartItem = (input: AddCartItemInput) => parse(cartSchema, http.post('/api/cart/items', input))
export const updateCartItem = (key: string, quantity: number) =>
  parse(cartSchema, http.patch(`/api/cart/items/${encodeURIComponent(key)}`, { quantity }))
export const removeCartItem = (key: string) =>
  parse(cartSchema, http.delete(`/api/cart/items/${encodeURIComponent(key)}`))
export const applyCoupon = (code: string) => parse(cartSchema, http.put('/api/cart/coupon', { code }))
export const removeCoupon = () => parse(cartSchema, http.delete('/api/cart/coupon'))

// Cotação e pedidos

export const createQuote = (network: Network) => parse(quoteSchema, http.post('/api/quotes', { network }))

export const createOrder = (input: CreateOrderInput, idempotencyKey: string, options?: { timeoutMs?: number }) =>
  parse(
    orderSchema,
    http.post('/api/orders', input, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: options?.timeoutMs,
    }),
  )

export const getOrder = (id: string, options?: Options) => parse(orderSchema, http.get(`/api/orders/${id}`, options))
export const listOrders = (options?: Options) => parse(orderListSchema, http.get('/api/orders', options))
export const findOrderByKey = async (idempotencyKey: string) => {
  const { items } = await parse(orderListSchema, http.get('/api/orders', { params: { idempotencyKey } }))
  return items[0] ?? null
}

// Perfil

export const getProfile = (options?: Options) => parse(userSchema, http.get('/api/profile', options))
export const updateProfile = (input: UpdateProfileInput) => parse(userSchema, http.patch('/api/profile', input))
export const uploadAvatar = (file: File) => {
  const form = new FormData()
  form.set('avatar', file)
  return parse(userSchema, http.post('/api/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }))
}
export const removeAvatar = () => parse(userSchema, http.delete('/api/profile/avatar'))
export const changePassword = (input: ChangePasswordInput) => http.put('/api/profile/password', input).then(() => undefined)

// Carteiras

export const listWallets = (options?: Options) => parse(walletListSchema, http.get('/api/wallets', options))
export const createWallet = (input: WalletInput) => parse(walletSchema, http.post('/api/wallets', input))
export const updateWallet = (id: string, input: WalletInput) => parse(walletSchema, http.patch(`/api/wallets/${id}`, input))
export const connectWallet = (id: string, provider?: WalletType) =>
  parse(walletSchema, http.post(`/api/wallets/${id}/connect`, provider ? { provider } : {}))
export const disconnectWallet = (id: string) => parse(walletSchema, http.post(`/api/wallets/${id}/disconnect`))
