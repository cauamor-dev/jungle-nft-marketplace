import { describe, expect, it } from 'vitest'
import {
  addCartItem,
  applyCoupon,
  connectWallet,
  createOrder,
  createQuote,
  getCart,
  getNft,
  getOrder,
  findOrderByKey,
} from '@/api/endpoints'
import type { CreateOrderInput } from '@/api/contracts'
import { getAttemptKey, clearAttempt } from '@/features/checkout/checkout-attempt'
import { submitOrder } from '@/features/checkout/place-order'
import { getDb } from '@/mocks/db'
import { collector, demoScenario, loginAs, sleep } from '@/test/helpers'


async function prepareCheckout() {
  await loginAs('demo1@example.test')
  await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 2 })
  await connectWallet('wallet_1')
  const quote = await createQuote('ethereum')
  const input: CreateOrderInput = { quoteId: quote.id, walletId: 'wallet_1', network: 'ethereum', collector }
  return { quote, input }
}

async function waitForSettlement(orderId: string) {
  await sleep(60)
  return getOrder(orderId)
}

describe('cotação', () => {
  it('exige login e carrinho preenchido', async () => {
    await expect(createQuote('ethereum')).rejects.toMatchObject({ status: 401 })
    await loginAs('demo1@example.test')
    await expect(createQuote('ethereum')).rejects.toMatchObject({ status: 422, code: 'CART_EMPTY' })
  })

  it('congela preços e totais e expira em cinco minutos', async () => {
    const { quote } = await prepareCheckout()
    expect(quote.totalEth).toBe('0.1435')
    expect(quote.items[0]).toMatchObject({ quantity: 2, unitPriceEth: '0.06375', lineTotalEth: '0.1275' })
    expect(new Date(quote.expiresAt).getTime() - new Date(quote.createdAt).getTime()).toBe(5 * 60 * 1000)
  })

  it('recusa cupom que expirou entre carrinho e cotação', async () => {
    await loginAs('demo1@example.test')
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    await applyCoupon('JUNGLE10')
    await demoScenario('expired-coupon')
    await expect(createQuote('ethereum')).rejects.toMatchObject({ status: 422, code: 'COUPON_EXPIRED' })
  })
})

describe('pedido confirmado', () => {
  it('só confirma depois da resposta da API e remove apenas o comprado', async () => {
    const { input } = await prepareCheckout()
    await addCartItem({ nftId: 'nft_05', editionId: 'nft_05_1of50', quantity: 1 })
    const stockBefore = (await getNft('nft_12')).editions[2].stock

    // adicionar item mudou a versão do carrinho: gera nova cotação para o carrinho completo
    const fresh = await createQuote('ethereum')
    const order = await createOrder({ ...input, quoteId: fresh.id }, 'key-confirmed')
    expect(order.status).toBe('pending')
    expect(order.txReference).toBeNull()

    const settled = await waitForSettlement(order.id)
    expect(settled.status).toBe('confirmed')
    expect(settled.txReference).toMatch(/^0x[0-9a-f]{64}$/)
    expect(settled.explorerUrl).toContain(settled.txReference ?? 'x')
    expect((await getNft('nft_12')).editions[2].stock).toBe(stockBefore - 2)
    expect((await getCart()).items).toEqual([])
  })

  it('preserva no carrinho o que foi adicionado depois da cotação', async () => {
    const { input } = await prepareCheckout()
    const order = await createOrder(input, 'key-partial')
    await addCartItem({ nftId: 'nft_05', editionId: 'nft_05_1of50', quantity: 1 })
    await waitForSettlement(order.id)
    const cart = await getCart()
    expect(cart.items.map((item) => item.key)).toEqual(['nft_05:nft_05_1of50'])
  })

  it('mantém o recibo imutável mesmo se o preço do catálogo mudar', async () => {
    const { input } = await prepareCheckout()
    const order = await createOrder(input, 'key-receipt')
    const settled = await waitForSettlement(order.id)
    await demoScenario('price-changed', { nftId: 'nft_12', priceEth: '9.99' })
    const later = await getOrder(order.id)
    expect(later.receipt).toEqual(settled.receipt)
    expect(later.receipt.items[0].unitPriceEth).toBe('0.06375')
    expect(later.receipt.totalEth).toBe('0.1435')
  })

  it('gera eventos pending -> confirmed e nunca regride', async () => {
    const { input } = await prepareCheckout()
    const order = await createOrder(input, 'key-events')
    await waitForSettlement(order.id)
    await getOrder(order.id)
    const db = await getDb()
    const orderEvents = db.events.filter((event) => event.type === 'order.updated')
    expect(orderEvents.map((event) => [event.version, event.type === 'order.updated' && event.data.status])).toEqual([
      [1, 'pending'],
      [2, 'confirmed'],
    ])
    expect(orderEvents.every((event) => event.userId === 'user_1')).toBe(true)
  })
})

describe('pedido recusado', () => {
  it('preserva carrinho e estoque e informa o motivo', async () => {
    await demoScenario('payment-rejected')
    const { input } = await prepareCheckout()
    const stockBefore = (await getNft('nft_12')).editions[2].stock
    const order = await createOrder(input, 'key-rejected')
    const settled = await waitForSettlement(order.id)
    expect(settled.status).toBe('rejected')
    expect(settled.rejectionReason).toBeTruthy()
    expect(settled.txReference).toBeNull()
    expect((await getCart()).items).toHaveLength(1)
    expect((await getNft('nft_12')).editions[2].stock).toBe(stockBefore)
  })

  it('recusa se o estoque acabar antes da confirmação', async () => {
    const { input } = await prepareCheckout()
    const order = await createOrder(input, 'key-out-of-stock')
    await demoScenario('edition-sold-out', { nftId: 'nft_12', editionId: 'nft_12_1of50' })
    const settled = await waitForSettlement(order.id)
    expect(settled.status).toBe('rejected')
    expect(settled.rejectionReason).toContain('estoque')
  })
})

describe('idempotência', () => {
  it('mesma chave e mesmo conteúdo devolvem o mesmo pedido', async () => {
    const { input } = await prepareCheckout()
    const first = await createOrder(input, 'key-same')
    const second = await createOrder(input, 'key-same')
    expect(second.id).toBe(first.id)
    const db = await getDb()
    expect(db.orders.filter((order) => order.userId === 'user_1')).toHaveLength(1)
  })

  it('mesma chave com conteúdo diferente gera 409', async () => {
    const { input } = await prepareCheckout()
    await createOrder(input, 'key-conflict')
    await expect(
      createOrder({ ...input, collector: { ...collector, displayName: 'Outra Pessoa' } }, 'key-conflict'),
    ).rejects.toMatchObject({ status: 409, code: 'IDEMPOTENCY_KEY_REUSED' })
  })

  it('uma cotação não gera dois pedidos com chaves diferentes', async () => {
    const { input } = await prepareCheckout()
    await createOrder(input, 'key-a')
    await expect(createOrder(input, 'key-b')).rejects.toMatchObject({ status: 409, code: 'QUOTE_ALREADY_USED' })
  })

  it('exige o cabeçalho Idempotency-Key', async () => {
    const { input } = await prepareCheckout()
    await expect(createOrder(input, '')).rejects.toMatchObject({ status: 400, code: 'IDEMPOTENCY_KEY_REQUIRED' })
  })

  it('cliques repetidos compartilham uma única requisição', async () => {
    const { input } = await prepareCheckout()
    const first = submitOrder(input, 'key-double')
    const second = submitOrder(input, 'key-double')
    expect(second).toBe(first)
    const [a, b] = await Promise.all([first, second])
    expect(a.id).toBe(b.id)
    const db = await getDb()
    expect(db.orders.filter((order) => order.userId === 'user_1')).toHaveLength(1)
  })

  it('timeout depois da criação recupera o mesmo pedido, sem criar outro', async () => {
    await demoScenario('post-create-order-timeout')
    const { input } = await prepareCheckout()
    const order = await submitOrder(input, 'key-timeout', { timeoutMs: 150 })
    const db = await getDb()
    const created = db.orders.filter((candidate) => candidate.userId === 'user_1')
    expect(created).toHaveLength(1)
    expect(order.id).toBe(created[0].id)
    expect((await findOrderByKey('key-timeout'))?.id).toBe(order.id)
  })

  it('reenvio manual com a mesma chave após o timeout devolve o pedido existente', async () => {
    await demoScenario('post-create-order-timeout')
    const { input } = await prepareCheckout()
    await expect(createOrder(input, 'key-retry', { timeoutMs: 100 })).rejects.toMatchObject({ timedOut: true })
    const retried = await createOrder(input, 'key-retry')
    const db = await getDb()
    expect(db.orders.filter((candidate) => candidate.userId === 'user_1')).toHaveLength(1)
    expect(retried.id).toBe(db.orders.find((candidate) => candidate.userId === 'user_1')?.id)
  })
})

describe('revalidação antes de confirmar', () => {
  it('bloqueia pedido com cotação de preço desatualizado e devolve a nova', async () => {
    const { input, quote } = await prepareCheckout()
    await demoScenario('price-changed', { nftId: 'nft_12', priceEth: '0.05' })
    await expect(createOrder(input, 'key-price')).rejects.toMatchObject({
      status: 409,
      code: 'QUOTE_STALE',
      details: {
        reasons: expect.arrayContaining(['PRICE_CHANGED']),
        currentQuote: { subtotalEth: '0.15', totalEth: '0.166' },
      },
    })
    const db = await getDb()
    expect(db.orders.filter((order) => order.userId === 'user_1')).toHaveLength(0)

    const refreshed = await createQuote('ethereum')
    expect(refreshed.id).not.toBe(quote.id)
    const order = await createOrder({ ...input, quoteId: refreshed.id }, 'key-price-2')
    expect(order.receipt.totalEth).toBe('0.166')
  })

  it('bloqueia quando a edição esgota e a cotação nova não é possível', async () => {
    const { input } = await prepareCheckout()
    await demoScenario('edition-sold-out', { nftId: 'nft_12', editionId: 'nft_12_1of50' })
    await expect(createOrder(input, 'key-soldout')).rejects.toMatchObject({
      status: 409,
      code: 'QUOTE_STALE',
      details: { reasons: expect.arrayContaining(['AVAILABILITY_CHANGED']), currentQuote: null },
    })
    await expect(createQuote('ethereum')).rejects.toMatchObject({ status: 409, code: 'EDITION_SOLD_OUT' })
  })

  it('bloqueia quando o carrinho mudou depois da cotação', async () => {
    const { input } = await prepareCheckout()
    await addCartItem({ nftId: 'nft_05', editionId: 'nft_05_1of50', quantity: 1 })
    await expect(createOrder(input, 'key-cart')).rejects.toMatchObject({
      code: 'QUOTE_STALE',
      details: { reasons: expect.arrayContaining(['CART_CHANGED']) },
    })
  })

  it('exige carteira conectada e rede compatível', async () => {
    await loginAs('demo1@example.test')
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    const quote = await createQuote('ethereum')
    const input: CreateOrderInput = { quoteId: quote.id, walletId: 'wallet_1', network: 'ethereum', collector }
    await expect(createOrder(input, 'key-wallet')).rejects.toMatchObject({ status: 409, code: 'WALLET_NOT_CONNECTED' })

    await connectWallet('wallet_2')
    await expect(createOrder({ ...input, walletId: 'wallet_2' }, 'key-network')).rejects.toMatchObject({
      status: 422,
      code: 'NETWORK_MISMATCH',
    })
  })

  it('valida os dados do colecionador', async () => {
    const { input } = await prepareCheckout()
    await expect(
      createOrder({ ...input, collector: { ...collector, displayName: 'A', email: 'x' } }, 'key-collector'),
    ).rejects.toMatchObject({
      status: 422,
      fieldErrors: { 'collector.displayName': expect.any(String), 'collector.email': expect.any(String) },
    })
  })

  it('código de indicação é opcional, mas preenchido precisa seguir o formato', async () => {
    const { input } = await prepareCheckout()
    await expect(
      createOrder({ ...input, collector: { ...collector, referralCode: 'a!' } }, 'key-referral-bad'),
    ).rejects.toMatchObject({ status: 422, fieldErrors: { 'collector.referralCode': expect.any(String) } })
    const order = await createOrder({ ...input, collector: { ...collector, referralCode: '' } }, 'key-referral-empty')
    expect(order.status).toBe('pending')
  })

  it('não deixa outro usuário usar a cotação alheia', async () => {
    const { input } = await prepareCheckout()
    await loginAs('demo2@example.test')
    await expect(createOrder({ ...input, walletId: 'wallet_3' }, 'key-other')).rejects.toMatchObject({
      status: 404,
      code: 'QUOTE_NOT_FOUND',
    })
  })
})

describe('tentativa de checkout no cliente', () => {
  it('reaproveita a chave para o mesmo conteúdo e gera outra para conteúdo novo', () => {
    clearAttempt()
    const input: CreateOrderInput = { quoteId: 'q1', walletId: 'w1', network: 'ethereum', collector }
    const first = getAttemptKey('user_1', input)
    expect(getAttemptKey('user_1', input)).toBe(first)
    expect(getAttemptKey('user_1', { ...input, quoteId: 'q2' })).not.toBe(first)
    expect(getAttemptKey('user_2', input)).not.toBe(first)
  })
})
