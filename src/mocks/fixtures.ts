import { categories, networks, type Category, type Network, type Nft } from '@/api/contracts'
import type { CouponRecord, SeedData, WalletRecord } from './db'
import { hashPassword, sha256 } from './services/passwords'

export const DEMO_PASSWORD = 'Demo@1234'

export const demoUsers = [
  { id: 'user_1', email: 'demo1@example.test', name: 'Marina Duarte', bio: 'Colecionadora de arte generativa.' },
  { id: 'user_2', email: 'demo2@example.test', name: 'Rafael Torres', bio: 'Fotografia e música eletrônica.' },
]

const catalog: Array<{ title: string; creator: string }> = [
  { title: 'Aurora Cinética', creator: 'Lia Montenegro' },
  { title: 'Maré de Neon', creator: 'Studio Pardal' },
  { title: 'Fragmento Solar', creator: 'Caio Ventura' },
  { title: 'Eco do Vale', creator: 'Nara Quintela' },
  { title: 'Cidade Submersa', creator: 'Lia Montenegro' },
  { title: 'Pulso Lunar', creator: 'Studio Pardal' },
  { title: 'Rastro de Cometa', creator: 'Otávio Reis' },
  { title: 'Jardim Binário', creator: 'Caio Ventura' },
  { title: 'Horizonte Quebrado', creator: 'Nara Quintela' },
  { title: 'Memória de Vidro', creator: 'Bruna Falcão' },
  { title: 'Sinfonia Mecânica', creator: 'Otávio Reis' },
  { title: 'Nuvem Elétrica', creator: 'Studio Pardal' },
  { title: 'Relicário Digital', creator: 'Bruna Falcão' },
  { title: 'Véu de Cristal', creator: 'Lia Montenegro' },
  { title: 'Oásis Sintético', creator: 'Caio Ventura' },
  { title: 'Batida Fantasma', creator: 'Otávio Reis' },
  { title: 'Tempestade Rosa', creator: 'Nara Quintela' },
  { title: 'Guardião do Farol', creator: 'Bruna Falcão' },
  { title: 'Labirinto de Luz', creator: 'Lia Montenegro' },
  { title: 'Cartografia Estelar', creator: 'Studio Pardal' },
  { title: 'Raiz Cósmica', creator: 'Caio Ventura' },
  { title: 'Canto das Dunas', creator: 'Nara Quintela' },
  { title: 'Reflexo Líquido', creator: 'Otávio Reis' },
  { title: 'Máscara de Ouro', creator: 'Bruna Falcão' },
  { title: 'Ruído Branco', creator: 'Studio Pardal' },
  { title: 'Floresta Pixel', creator: 'Caio Ventura' },
  { title: 'Ponte de Neblina', creator: 'Lia Montenegro' },
  { title: 'Cápsula do Tempo', creator: 'Nara Quintela' },
  { title: 'Vórtice Violeta', creator: 'Otávio Reis' },
  { title: 'Santuário Digital', creator: 'Bruna Falcão' },
  { title: 'Deriva Magnética', creator: 'Studio Pardal' },
  { title: 'Lente Noturna', creator: 'Caio Ventura' },
  { title: 'Mosaico Vivo', creator: 'Lia Montenegro' },
  { title: 'Fio de Prata', creator: 'Nara Quintela' },
  { title: 'Orquestra de Vidro', creator: 'Otávio Reis' },
  { title: 'Última Estação', creator: 'Bruna Falcão' },
]

const prices = ['0.0125', '0.025', '0.0425', '0.08', '0.15', '0.2', '0.35', '0.5', '0.75', '1.2', '2.5', '0.0069']

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export const unavailableNftId = 'nft_18'
export const soldOutEditionNftId = 'nft_11'

function buildNfts(): Nft[] {
  return catalog.map((entry, index) => {
    const number = index + 1
    const id = `nft_${String(number).padStart(2, '0')}`
    const slug = slugify(entry.title)
    const category: Category = categories[index % categories.length]
    const chain: Network = networks[(index * 2 + Math.floor(index / 3)) % networks.length]
    const fullySoldOut = id === unavailableNftId
    const limitedSoldOut = id === soldOutEditionNftId
    const editions = [
      { id: `${id}_std`, label: 'Edição padrão', stock: fullySoldOut ? 0 : 5 + (index % 6), maxPerBuyer: 3 },
      { id: `${id}_ltd`, label: 'Edição limitada', stock: fullySoldOut || limitedSoldOut ? 0 : 2, maxPerBuyer: 1 },
    ]
    return {
      id,
      slug,
      title: entry.title,
      description: `${entry.title}, obra digital de ${entry.creator}. Coleção fictícia usada nos mocks do desafio.`,
      creator: entry.creator,
      category,
      chain,
      images: [1, 2, 3].map((n) => ({
        src: `/assets/nfts/${slug}-${n}.webp`,
        alt: `${entry.title}, imagem ${n}`,
      })),
      priceEth: prices[index % prices.length],
      editions,
      version: 1,
      featured: index % 7 === 0,
      available: editions.some((edition) => edition.stock > 0),
      createdAt: new Date(Date.UTC(2026, 8, 30) - index * 86_400_000).toISOString(),
    }
  })
}

function buildCoupons(): CouponRecord[] {
  return [
    { code: 'JUNGLE10', kind: 'percent', value: '10', expiresAt: '2030-12-31T23:59:59.000Z' },
    { code: 'BEMVINDO', kind: 'fixed', value: '0.01', expiresAt: '2030-12-31T23:59:59.000Z' },
    { code: 'EXPIRADO20', kind: 'percent', value: '20', expiresAt: '2025-01-01T00:00:00.000Z' },
  ]
}

function buildWallets(): WalletRecord[] {
  return [
    {
      id: 'wallet_1',
      userId: 'user_1',
      label: 'Carteira principal',
      address: '0x71c0a5d3e2b94f6a8c10d7e5b3a49f2c6d8e1b07',
      network: 'ethereum',
      kind: 'primary',
      connection: 'disconnected',
    },
    {
      id: 'wallet_2',
      userId: 'user_1',
      label: 'Carteira secundária',
      address: '0x3a9d41e8c7b05f26d1a84e93bc07f5d2e6a18c40',
      network: 'polygon',
      kind: 'secondary',
      connection: 'disconnected',
    },
    {
      id: 'wallet_3',
      userId: 'user_2',
      label: 'Carteira principal',
      address: '0x9e5b2c71a0d84f36e1b7c92d5a08f4e3b6d17a25',
      network: 'ethereum',
      kind: 'primary',
      connection: 'disconnected',
    },
  ]
}

export async function buildSeed(): Promise<SeedData> {
  const users = await Promise.all(
    demoUsers.map(async (user) => {
      const { salt, hash } = await hashPassword(DEMO_PASSWORD)
      return { ...user, avatarUrl: null, passwordSalt: salt, passwordHash: hash }
    }),
  )

  const seedOrderTx = await sha256('seed-order')
  const nfts = buildNfts()
  const owned = nfts[1]
  const receipt = {
    items: [
      {
        nftId: owned.id,
        editionId: owned.editions[0].id,
        title: owned.title,
        editionLabel: owned.editions[0].label,
        quantity: 1,
        unitPriceEth: owned.priceEth,
        lineTotalEth: owned.priceEth,
        nftVersion: 1,
      },
    ],
    couponCode: null,
    network: 'ethereum' as const,
    subtotalEth: owned.priceEth,
    discountEth: '0',
    networkFeeEth: '0.0021',
    totalEth: '0.0271',
    walletAddress: '0x9e5b2c71a0d84f36e1b7c92d5a08f4e3b6d17a25',
    collector: { fullName: 'Rafael Torres', email: 'demo2@example.test' },
  }

  return {
    schemaVersion: 1,
    sequence: 100,
    rngSeed: 20261019,
    catalogRequests: 0,
    users,
    sessions: [],
    nfts,
    favorites: { user_1: [], user_2: [] },
    carts: [],
    coupons: buildCoupons(),
    wallets: buildWallets(),
    quotes: [],
    orders: [
      {
        id: 'order_1',
        userId: 'user_2',
        status: 'confirmed',
        version: 2,
        quoteId: 'quote_seed',
        idempotencyKey: 'seed-order-1',
        createdAt: '2026-09-15T12:00:00.000Z',
        settledAt: '2026-09-15T12:00:02.000Z',
        txReference: `0x${seedOrderTx}`,
        explorerUrl: `https://explorer.mock.test/tx/0x${seedOrderTx}`,
        rejectionReason: null,
        receipt,
        payloadHash: 'seed',
        walletId: 'wallet_3',
        resolveAt: 0,
        outcome: 'confirmed',
      },
    ],
    idempotency: { 'user_2:seed-order-1': { payloadHash: 'seed', orderId: 'order_1' } },
    events: [],
  }
}
