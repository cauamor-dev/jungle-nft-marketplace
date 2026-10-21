import type { Edition, Nft, NftImage } from '@/api/contracts'
import dourado400 from '@/assets/nfts/dourado-400.webp'
import dourado800 from '@/assets/nfts/dourado-800.webp'
import esmeralda400 from '@/assets/nfts/esmeralda-400.webp'
import esmeralda800 from '@/assets/nfts/esmeralda-800.webp'
import ivory400 from '@/assets/nfts/ivory-400.webp'
import ivory800 from '@/assets/nfts/ivory-800.webp'
import violeta400 from '@/assets/nfts/violeta-400.webp'
import violeta800 from '@/assets/nfts/violeta-800.webp'
import { categories, networks, type Category, type Network } from '@/api/contracts'
import { editionPriceEth } from '@/domain/editions'
import { addEth } from '@/domain/money'
import { SCHEMA_VERSION, type CouponRecord, type SeedData, type WalletRecord } from './db'
import { hashPassword, sha256 } from './services/passwords'

export const DEMO_PASSWORD = 'Demo@1234'

export const demoUsers = [
  {
    id: 'user_1',
    email: 'demo1@example.test',
    name: 'Marina Duarte',
    username: 'marina.duarte',
    ensName: 'marina',
    ensSuffix: 'eth' as const,
    walletNickname: 'Principal',
  },
  {
    id: 'user_2',
    email: 'demo2@example.test',
    name: 'Rafael Torres',
    username: 'rafael.torres',
    ensName: 'rafael',
    ensSuffix: 'eth' as const,
    walletNickname: 'Principal',
  },
]

type Artwork = 'esmeralda' | 'violeta' | 'ivory' | 'dourado'

const artworks: Record<Artwork, { src: string; thumbSrc: string; alt: string }> = {
  esmeralda: { src: esmeralda800, thumbSrc: esmeralda400, alt: 'Macaco de óculos redondos e jaqueta verde de time' },
  violeta: { src: violeta800, thumbSrc: violeta400, alt: 'Gorila de chapéu verde e moletom roxo' },
  ivory: { src: ivory800, thumbSrc: ivory400, alt: 'Chimpanzé de terno marfim e gola alta verde' },
  dourado: { src: dourado800, thumbSrc: dourado400, alt: 'Orangotango dourado com fones de ouvido verdes' },
}

type CatalogEntry = {
  title: string
  tokenNumber: string
  artwork: Artwork
  priceEth: string
  compareAtPriceEth?: string
  badge?: string
  category: Category
  chain: Network
  collection: string
  attributes: string[]
}

const catalog: CatalogEntry[] = [
  { title: 'Emerald Ape', tokenNumber: '0042', artwork: 'esmeralda', priceEth: '1.19', category: 'art', chain: 'ethereum', collection: 'Kurio Apes', attributes: ['Óculos', 'Esmeralda', 'Raro'] },
  { title: 'Sage Nomad', tokenNumber: '0009', artwork: 'violeta', priceEth: '1.69', category: 'photography', chain: 'polygon', collection: 'Kurio Nomads', attributes: ['Chapéu', 'Sálvia', 'Comum'] },
  { title: 'Neon Vessel', tokenNumber: '0552', artwork: 'ivory', priceEth: '1.99', compareAtPriceEth: '2.29', badge: 'RARO', category: 'generative', chain: 'solana', collection: 'Kurio Vessels', attributes: ['Gola alta', 'Neon', 'Raro'] },
  { title: 'Cosmic Bloom', tokenNumber: '0118', artwork: 'violeta', priceEth: '1.29', category: 'art3d', chain: 'ethereum', collection: 'Kurio Blooms', attributes: ['Moletom', 'Cósmico', 'Comum'] },
  { title: 'Violet Nomad', tokenNumber: '0314', artwork: 'violeta', priceEth: '1.39', category: 'collectibles', chain: 'polygon', collection: 'Kurio Nomads', attributes: ['Chapéu', 'Violeta', 'Comum'] },
  { title: 'Ivory Baron', tokenNumber: '0088', artwork: 'ivory', priceEth: '1.79', category: 'art', chain: 'ethereum', collection: 'Kurio Barons', attributes: ['Terno', 'Marfim', 'Épico'] },
  { title: 'Golden Beat', tokenNumber: '0207', artwork: 'dourado', priceEth: '0.99', category: 'music', chain: 'solana', collection: 'Kurio Beats', attributes: ['Fones', 'Dourado', 'Comum'] },
  { title: 'Golden Frequency', tokenNumber: '0071', artwork: 'dourado', priceEth: '0.59', category: 'music', chain: 'ethereum', collection: 'Kurio Beats', attributes: ['Fones', 'Frequência', 'Comum'] },
  { title: 'Golden Signal', tokenNumber: '0160', artwork: 'dourado', priceEth: '0.39', category: 'utility', chain: 'polygon', collection: 'Kurio Beats', attributes: ['Fones', 'Sinal', 'Comum'] },
]

const extraTitles = [
  'Amber Echo', 'Jade Courier', 'Onyx Scribe', 'Lilac Drifter', 'Copper Oracle', 'Mint Sentinel',
  'Dusk Cartographer', 'Solar Mason', 'Velvet Pilot', 'Opal Warden', 'Cinder Poet', 'Moss Alchemist',
  'Rune Sailor', 'Pearl Tinker', 'Ember Scholar', 'Slate Voyager', 'Coral Herald', 'Basalt Dancer',
  'Saffron Scout', 'Indigo Weaver', 'Cedar Minstrel', 'Quartz Ranger', 'Willow Smith', 'Marble Jester',
  'Topaz Archivist', 'Fennel Rover', 'Garnet Chorister',
]

const extraArtworks: Artwork[] = ['esmeralda', 'dourado', 'violeta', 'ivory']
const extraPrices = ['0.02', '0.025', '0.0425', '0.08', '0.15', '0.2', '0.35', '0.5', '0.75', '1.2', '2.5', '12.3']
const collections = ['Kurio Apes', 'Kurio Nomads', 'Kurio Vessels', 'Kurio Barons', 'Kurio Beats', 'Kurio Blooms']

export const unavailableNftId = 'nft_18'
export const soldOutEditionNftId = 'nft_11'

function slugify(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function allEntries(): CatalogEntry[] {
  const extras = extraTitles.map<CatalogEntry>((title, index) => {
    const position = catalog.length + index
    return {
      title,
      tokenNumber: String(100 + position * 7).padStart(4, '0'),
      artwork: extraArtworks[index % extraArtworks.length],
      priceEth: extraPrices[index % extraPrices.length],
      category: categories[(index + 3) % categories.length],
      chain: networks[(index * 2 + Math.floor(index / 3)) % networks.length],
      collection: collections[index % collections.length],
      attributes: ['Edição Kurio', index % 3 === 0 ? 'Raro' : 'Comum'],
    }
  })
  return [...catalog, ...extras]
}

function buildEditions(id: string, index: number, soldOut: boolean, limitedSoldOut: boolean): Edition[] {
  return [
    { id: `${id}_1of1`, label: '1/1', stock: soldOut || limitedSoldOut ? 0 : 1, maxPerBuyer: 1 },
    { id: `${id}_1of10`, label: '1/10', stock: soldOut ? 0 : 10, maxPerBuyer: 10 },
    { id: `${id}_1of50`, label: '1/50', stock: soldOut ? 0 : 50 - (index % 5), maxPerBuyer: 10 },
    { id: `${id}_open`, label: 'ABERTA', stock: soldOut ? 0 : 200, maxPerBuyer: 20 },
  ]
}

function buildNfts(): Nft[] {
  return allEntries().map((entry, index) => {
    const number = index + 1
    const id = `nft_${String(number).padStart(2, '0')}`
    const fullySoldOut = id === unavailableNftId
    const limitedSoldOut = id === soldOutEditionNftId
    const editions = buildEditions(id, index, fullySoldOut, limitedSoldOut)
    const artwork = artworks[entry.artwork]
    const title = `${entry.title} #${entry.tokenNumber.slice(1)}`
    const image: NftImage = { src: artwork.src, thumbSrc: artwork.thumbSrc, alt: `${title}: ${artwork.alt}` }
    return {
      id,
      slug: slugify(title),
      title,
      description: `Colecionável digital finalizado à mão da coleção Kurio Editions, verificado na ${chainName(entry.chain)}, com arte desbloqueável e acesso para colecionadores.`,
      creator: entry.collection,
      category: entry.category,
      chain: entry.chain,
      images: [image, image, image, image],
      priceEth: entry.priceEth,
      compareAtPriceEth: entry.compareAtPriceEth ?? null,
      tokenId: `#${entry.tokenNumber}`,
      collection: entry.collection,
      attributes: entry.attributes,
      rating: { average: index % 4 === 0 ? '4.8' : '4.6', count: 19 + (index % 7) },
      badge: entry.badge ?? null,
      isNew: index < 12,
      trending: index % 3 === 0 || index === 5,
      details: {
        overview: [
          `${title} é uma obra digital finalizada à mão da ${entry.collection} Editions. Cada atributo fica armazenado nos metadados do token e verificado na ${chainName(entry.chain)}. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
          'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência registrada na rede. Nova Seto recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
        ],
        sections: [
          { label: 'Rede:', body: `Cunhado na ${chainName(entry.chain)} com procedência imutável e metadados armazenados no IPFS.` },
          { label: 'Contrato:', body: 'Direitos autorais do criador: 5% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.' },
          { label: 'Direitos autorais:', body: '0x7A42…19E8 • Contrato inteligente ERC-721 verificado.' },
        ],
      },
      editions,
      version: 1,
      featured: index === 0 || index % 7 === 0,
      available: editions.some((edition) => edition.stock > 0),
      createdAt: new Date(Date.UTC(2026, 8, 30) - index * 86_400_000).toISOString(),
    }
  })
}

function chainName(chain: Network) {
  return { ethereum: 'Ethereum', polygon: 'Polygon', solana: 'Solana' }[chain]
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
      displayName: 'Marina Duarte',
      label: 'Principal',
      profileName: 'marina-duarte',
      address: '0xA91F4c2b7D3e89aB10C5f6E72d048b9C13a5E82C',
      secondaryAddress: '',
      network: 'ethereum',
      walletType: 'metamask',
      referralCode: 'KURIO-2026',
      email: 'demo1@example.test',
      ensName: 'marina',
      ensSuffix: 'eth',
      kind: 'primary',
      connection: 'disconnected',
    },
    {
      id: 'wallet_2',
      userId: 'user_1',
      displayName: 'Marina Duarte',
      label: 'Reserva',
      profileName: 'marina-reserva',
      address: '0x3a9d41E8c7b05F26d1A84e93Bc07f5D2e6A18C40',
      secondaryAddress: 'nova.kurio.eth',
      network: 'polygon',
      walletType: 'walletconnect',
      referralCode: 'KURIO-2026',
      email: 'demo1@example.test',
      ensName: 'nova.kurio',
      ensSuffix: 'eth',
      kind: 'secondary',
      connection: 'disconnected',
    },
    {
      id: 'wallet_3',
      userId: 'user_2',
      displayName: 'Rafael Torres',
      label: 'Principal',
      profileName: 'rafael-torres',
      address: '0x9e5b2C71a0D84f36E1b7c92d5A08F4e3b6D17a25',
      secondaryAddress: '',
      network: 'ethereum',
      walletType: 'coinbase',
      referralCode: 'KURIO-2026',
      email: 'demo2@example.test',
      ensName: 'rafael',
      ensSuffix: 'eth',
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
  const owned = nfts[8]
  const ownedPrice = editionPriceEth(owned.priceEth, owned.editions[2])
  const receipt = {
    items: [
      {
        nftId: owned.id,
        editionId: owned.editions[2].id,
        title: owned.title,
        editionLabel: owned.editions[2].label,
        quantity: 1,
        unitPriceEth: ownedPrice,
        lineTotalEth: ownedPrice,
        nftVersion: 1,
      },
    ],
    couponCode: null,
    network: 'ethereum' as const,
    subtotalEth: ownedPrice,
    discountEth: '0',
    networkFeeEth: '0.016',
    totalEth: addEth(ownedPrice, '0.016'),
    walletAddress: '0x9e5b2C71a0D84f36E1b7c92d5A08F4e3b6D17a25',
    collector: {
      displayName: 'Rafael Torres',
      username: 'rafael.torres',
      profileName: 'rafael-torres',
      email: 'demo2@example.test',
      ensName: 'rafael',
      ensSuffix: 'eth' as const,
      referralCode: 'KURIO-2026',
      walletType: 'coinbase' as const,
      walletAddress: '0x9e5b2C71a0D84f36E1b7c92d5A08F4e3b6D17a25',
    },
  }

  return {
    schemaVersion: SCHEMA_VERSION,
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
