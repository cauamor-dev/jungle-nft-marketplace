import { z } from 'zod'

export const decimalString = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor decimal inválido')

export const networks = ['ethereum', 'polygon', 'arbitrum'] as const
export const networkSchema = z.enum(networks)
export type Network = z.infer<typeof networkSchema>

export const categories = ['art', 'music', 'collectibles', 'photography', 'gaming'] as const
export const categorySchema = z.enum(categories)
export type Category = z.infer<typeof categorySchema>

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

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  bio: z.string(),
  avatarUrl: z.string().nullable(),
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
export type RegisterInput = { name: string; email: string; password: string }

// Catálogo

export const editionSchema = z.object({
  id: z.string(),
  label: z.string(),
  stock: z.number().int().nonnegative(),
  maxPerBuyer: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  creator: z.string(),
  category: categorySchema,
  chain: networkSchema,
  images: z.array(z.object({ src: z.string(), alt: z.string() })),
  priceEth: decimalString,
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
  image: z.object({ src: z.string(), alt: z.string() }).nullable(),
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

export const collectorSchema = z.object({
  fullName: z.string().min(3, 'Informe o nome completo'),
  email: z.email('E-mail inválido'),
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

export type UpdateProfileInput = { name: string; email: string; bio: string }
export type ChangePasswordInput = { currentPassword: string; newPassword: string }

export const walletSchema = z.object({
  id: z.string(),
  label: z.string(),
  address: z.string(),
  network: networkSchema,
  kind: z.enum(['primary', 'secondary']),
  connection: z.enum(['connected', 'disconnected']),
})
export type Wallet = z.infer<typeof walletSchema>

export const walletListSchema = z.object({ items: z.array(walletSchema) })

export type WalletInput = {
  label: string
  address: string
  network: Network
  kind: 'primary' | 'secondary'
}

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
