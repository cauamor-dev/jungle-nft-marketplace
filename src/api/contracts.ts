import { z } from 'zod'

export const decimalString = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor decimal inválido')

export const networks = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(networks)
export type Network = z.infer<typeof networkSchema>

export const categories = [
  'art',
  'photography',
  'music',
  'art3d',
  'collectibles',
  'generative',
  'games',
  'subscriptions',
  'utility',
] as const
export const categorySchema = z.enum(categories)
export type Category = z.infer<typeof categorySchema>

export const listings = ['all', 'new', 'trending'] as const
export type Listing = (typeof listings)[number]

export const sortOptions = ['recent', 'price-asc', 'price-desc', 'name'] as const
export const sortSchema = z.enum(sortOptions)
export type Sort = z.infer<typeof sortSchema>

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  fieldErrors: z.record(z.string(), z.string()).optional(),
  details: z.unknown().optional(),
  requestId: z.string().optional(),
})
export type ApiErrorBody = z.infer<typeof apiErrorSchema>

// Sessão e conta

export const ensSuffixes = ['eth', 'xyz', 'art'] as const
export const ensSuffixSchema = z.enum(ensSuffixes)
export type EnsSuffix = z.infer<typeof ensSuffixSchema>

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  username: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  walletNickname: z.string(),
  // Só imagem embutida: evita que um valor arbitrário vire src de <img> (ex.: URL externa de rastreio)
  avatarUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/).nullable(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  user: userSchema,
  expiresAt: z.string(),
})
export type Session = z.infer<typeof sessionSchema>

export const mergeConflictSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  requested: z.number(),
  applied: z.number(),
  reason: z.enum(['EDITION_SOLD_OUT', 'QUANTITY_LIMIT']),
})

export const loginResponseSchema = z.object({
  token: z.string(),
  session: sessionSchema,
  cartMerge: z.object({
    mergedItems: z.number(),
    conflicts: z.array(mergeConflictSchema),
  }),
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

export type LoginInput = { email: string; password: string }
export type RegisterInput = { username: string; email: string; password: string }

// Catálogo

export const editionSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number().int().nonnegative(),
  maxPerBuyer: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const imageSchema = z.object({ src: z.string(), thumbSrc: z.string(), alt: z.string() })
export type NftImage = z.infer<typeof imageSchema>

export const nftSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  creator: z.string(),
  category: categorySchema,
  chain: networkSchema,
  images: z.array(imageSchema),
  priceEth: decimalString,
  compareAtPriceEth: decimalString.nullable(),
  tokenId: z.string(),
  collection: z.string(),
  attributes: z.array(z.string()),
  rating: z.object({ average: z.string(), count: z.number().int().nonnegative() }),
  badge: z.string().nullable(),
  isNew: z.boolean(),
  trending: z.boolean(),
  details: z.object({
    overview: z.array(z.string()),
    sections: z.array(z.object({ label: z.string(), body: z.string() })),
  }),
  editions: z.array(editionSchema),
  version: z.number().int().positive(),
  featured: z.boolean(),
  available: z.boolean(),
  createdAt: z.string(),
})
export type Nft = z.infer<typeof nftSchema>

export type NftListParams = {
  q?: string
  category?: Category[]
  chain?: Network[]
  sort?: Sort
  page?: number
  pageSize?: number
  featured?: boolean
  listing?: Listing
  minPrice?: string
  maxPrice?: string
}

const facetSchema = z.array(z.object({ value: z.string(), count: z.number() }))

export const nftListSchema = z.object({
  items: z.array(nftSchema),
  page: z.number(),
  pageSize: z.number(),
  total: z.number(),
  totalPages: z.number(),
  facets: z.object({ categories: facetSchema, chains: facetSchema }),
})
export type NftList = z.infer<typeof nftListSchema>

export const favoritesSchema = z.object({ nftIds: z.array(z.string()) })

// Carrinho

export const cartItemSchema = z.object({
  key: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  title: z.string(),
  editionLabel: z.string(),
  image: imageSchema.nullable(),
  quantity: z.number().int().positive(),
  unitPriceEth: decimalString,
  addedPriceEth: decimalString,
  lineTotalEth: decimalString,
  availableQuantity: z.number().int().nonnegative(),
  issue: z.enum(['SOLD_OUT', 'QUANTITY_EXCEEDS_AVAILABLE']).nullable(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const totalsSchema = z.object({
  subtotalEth: decimalString,
  discountEth: decimalString,
  networkFeeEth: decimalString,
  totalEth: decimalString,
})

export const cartSchema = z.object({
  id: z.string(),
  ownerUserId: z.string().nullable(),
  version: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  couponStatus: z.enum(['none', 'valid', 'expired', 'invalid']),
  network: networkSchema,
  items: z.array(cartItemSchema),
  summary: totalsSchema,
})
export type Cart = z.infer<typeof cartSchema>

export type AddCartItemInput = { nftId: string; editionId: string; quantity: number }

// Cotação e pedidos

export const quoteItemSchema = z.object({
  nftId: z.string(),
  editionId: z.string(),
  title: z.string(),
  editionLabel: z.string(),
  quantity: z.number().int().positive(),
  unitPriceEth: decimalString,
  lineTotalEth: decimalString,
  nftVersion: z.number().int().positive(),
})

export const quoteSchema = totalsSchema.extend({
  id: z.string(),
  cartVersion: z.number().int().nonnegative(),
  couponCode: z.string().nullable(),
  network: networkSchema,
  items: z.array(quoteItemSchema),
  createdAt: z.string(),
  expiresAt: z.string(),
})
export type Quote = z.infer<typeof quoteSchema>

export const orderStatusSchema = z.enum(['pending', 'confirmed', 'rejected'])
export type OrderStatus = z.infer<typeof orderStatusSchema>

export const walletTypes = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletTypeSchema = z.enum(walletTypes)
export type WalletType = z.infer<typeof walletTypeSchema>

export const evmAddressPattern = /^0x[0-9a-fA-F]{40}$/

// Mesma regra no cadastro e no perfil (cliente e mock). Aceita letras acentuadas.
export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Use ao menos 3 caracteres')
  .max(30, 'Use até 30 caracteres')
  .regex(/^[\p{L}\p{N}._-]+$/u, 'Use letras, números, ponto, hífen ou sublinhado')

// Opcional: vazio é aceito; preenchido, segue o formato.
export const referralCodePattern = /^(?:[A-Za-z0-9-]{4,20})?$/

export const collectorSchema = z.object({
  displayName: z.string().trim().min(2, 'Informe o nome de exibição'),
  username: z.string().trim().min(3, 'Use ao menos 3 caracteres'),
  profileName: z.string().trim().min(2, 'Informe o nome do perfil'),
  email: z.email('E-mail inválido'),
  ensName: z.string().trim().min(2, 'Informe o nome ENS'),
  ensSuffix: ensSuffixSchema,
  referralCode: z.string().regex(referralCodePattern, 'Use de 4 a 20 letras, números ou hífen'),
  walletType: walletTypeSchema,
  walletAddress: z.string().regex(evmAddressPattern, 'Endereço inválido: use 0x seguido de 40 caracteres hexadecimais'),
  secondaryAddress: z.string().trim().max(120).optional(),
  note: z.string().trim().max(280, 'Use até 280 caracteres').optional(),
})
export type Collector = z.infer<typeof collectorSchema>

export const receiptSnapshotSchema = z.object({
  items: z.array(quoteItemSchema),
  couponCode: z.string().nullable(),
  network: networkSchema,
  subtotalEth: decimalString,
  discountEth: decimalString,
  networkFeeEth: decimalString,
  totalEth: decimalString,
  walletAddress: z.string(),
  collector: collectorSchema,
})
export type ReceiptSnapshot = z.infer<typeof receiptSnapshotSchema>

export const orderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: orderStatusSchema,
  version: z.number().int().positive(),
  quoteId: z.string(),
  idempotencyKey: z.string(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
  txReference: z.string().nullable(),
  explorerUrl: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  receipt: receiptSnapshotSchema,
})
export type Order = z.infer<typeof orderSchema>

export const orderListSchema = z.object({ items: z.array(orderSchema) })

export type CreateOrderInput = {
  quoteId: string
  walletId: string
  network: Network
  collector: Collector
}

// Perfil e carteiras

export type UpdateProfileInput = {
  name: string
  username: string
  email: string
  ensName: string
  ensSuffix: EnsSuffix
  walletNickname: string
}
export type ChangePasswordInput = { currentPassword: string; newPassword: string }

export const walletSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  label: z.string(),
  profileName: z.string(),
  address: z.string(),
  secondaryAddress: z.string(),
  network: networkSchema,
  walletType: walletTypeSchema,
  referralCode: z.string(),
  email: z.string(),
  ensName: z.string(),
  ensSuffix: ensSuffixSchema,
  kind: z.enum(['primary', 'secondary']),
  connection: z.enum(['connected', 'disconnected']),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletListSchema = z.object({ items: z.array(walletSchema) })

export type WalletInput = Omit<Wallet, 'id' | 'connection'>

// Eventos Socket.IO

export const eventResourceSchema = z.object({
  type: z.enum(['nft', 'order']),
  id: z.string(),
})

const eventEnvelope = {
  eventId: z.string(),
  resource: eventResourceSchema,
  version: z.number().int().positive(),
  occurredAt: z.string(),
  userId: z.string().optional(),
}

export const nftUpdatedEventSchema = z.object({
  ...eventEnvelope,
  data: z.object({
    priceEth: decimalString,
    available: z.boolean(),
    editions: z.array(editionSchema),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  ...eventEnvelope,
  data: z.object({
    status: orderStatusSchema,
    txReference: z.string().nullable(),
    rejectionReason: z.string().nullable(),
  }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>

export const socketEvents = {
  nftUpdated: 'nft.updated',
  orderUpdated: 'order.updated',
  subscribe: 'session.subscribe',
} as const
