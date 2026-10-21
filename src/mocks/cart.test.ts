import { describe, expect, it } from 'vitest'
import {
  addCartItem,
  applyCoupon,
  getCart,
  removeCartItem,
  removeCoupon,
  updateCartItem,
} from '@/api/endpoints'
import { demoScenario, loginAs } from '@/test/helpers'

describe('carrinho do visitante', () => {
  it('soma subtotal, desconto, taxa e total com decimais exatos', async () => {
    // Edição 1/50 do nft_12: 0.0425 + 50% = 0.06375 por unidade
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 2 })
    const cart = await applyCoupon('jungle10')
    expect(cart.summary).toEqual({
      subtotalEth: '0.1275',
      discountEth: '0.01275',
      networkFeeEth: '0.016',
      totalEth: '0.13075',
    })
    expect(cart.couponCode).toBe('JUNGLE10')
  })

  it('respeita estoque e limite por comprador', async () => {
    await expect(addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 11 })).rejects.toMatchObject({
      status: 409,
      code: 'QUANTITY_LIMIT',
      details: { max: 10 },
    })
    await expect(addCartItem({ nftId: 'nft_11', editionId: 'nft_11_1of1', quantity: 1 })).rejects.toMatchObject({
      status: 409,
      code: 'EDITION_SOLD_OUT',
    })
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 6 })
    await expect(addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 5 })).rejects.toMatchObject({
      code: 'QUANTITY_LIMIT',
    })
  })

  it('altera e remove itens', async () => {
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    const updated = await updateCartItem('nft_12:nft_12_1of50', 3)
    expect(updated.items[0].quantity).toBe(3)
    await expect(updateCartItem('nft_12:nft_12_1of50', 0)).rejects.toMatchObject({ status: 422 })
    await expect(updateCartItem('nft_12:nft_12_1of50', 1.5)).rejects.toMatchObject({ status: 422 })
    const emptied = await removeCartItem('nft_12:nft_12_1of50')
    expect(emptied.items).toEqual([])
    expect(emptied.summary.totalEth).toBe('0')
    await expect(removeCartItem('nft_12:nft_12_1of50')).rejects.toMatchObject({ status: 404 })
  })

  it('trata cupom inválido, expirado e remoção', async () => {
    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_1of50', quantity: 1 })
    await expect(applyCoupon('NOPE')).rejects.toMatchObject({ status: 422, code: 'COUPON_INVALID' })
    await expect(applyCoupon('EXPIRADO20')).rejects.toMatchObject({ status: 422, code: 'COUPON_EXPIRED' })
    await applyCoupon('BEMVINDO')
    const without = await removeCoupon()
    expect(without.couponCode).toBeNull()
    expect(without.summary.discountEth).toBe('0')
  })

  it('persiste entre leituras e reflete mudança de preço do catálogo', async () => {
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    await demoScenario('price-changed', { nftId: 'nft_12', priceEth: '0.05' })
    const cart = await getCart()
    expect(cart.items[0]).toMatchObject({ unitPriceEth: '0.075', addedPriceEth: '0.06375' })
    expect(cart.summary.subtotalEth).toBe('0.075')
  })

  it('cada edição tem o próprio preço: quanto menor a tiragem, mais cara', async () => {
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_open', quantity: 1 })
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of10', quantity: 1 })
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of1', quantity: 1 })
    const prices = Object.fromEntries((await getCart()).items.map((item) => [item.editionLabel, item.unitPriceEth]))
    expect(prices).toEqual({ ABERTA: '0.0425', '1/50': '0.06375', '1/10': '0.085', '1/1': '0.17' })
  })

  it('sinaliza edição esgotada depois de adicionada', async () => {
    await addCartItem({ nftId: 'nft_12', editionId: 'nft_12_1of50', quantity: 1 })
    await demoScenario('edition-sold-out', { nftId: 'nft_12', editionId: 'nft_12_1of50' })
    const cart = await getCart()
    expect(cart.items[0]).toMatchObject({ issue: 'SOLD_OUT', availableQuantity: 0 })
  })
})

describe('login com carrinho de visitante', () => {
  it('migra os itens para a conta e informa conflitos de limite', async () => {
    await loginAs('demo1@example.test')
    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_1of50', quantity: 8 })
    localStorage.removeItem('jg-session-token')
    localStorage.setItem('jg-guest-id', 'visitante-novo')

    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_1of50', quantity: 3 })
    await addCartItem({ nftId: 'nft_02', editionId: 'nft_02_1of50', quantity: 1 })

    const { cartMerge } = await loginAs('demo1@example.test')
    expect(cartMerge.mergedItems).toBe(2)
    expect(cartMerge.conflicts).toEqual([
      { nftId: 'nft_01', editionId: 'nft_01_1of50', requested: 3, applied: 2, reason: 'QUANTITY_LIMIT' },
    ])

    const cart = await getCart()
    expect(cart.ownerUserId).toBe('user_1')
    const quantities = Object.fromEntries(cart.items.map((item) => [item.key, item.quantity]))
    expect(quantities).toEqual({ 'nft_01:nft_01_1of50': 10, 'nft_02:nft_02_1of50': 1 })

    localStorage.removeItem('jg-session-token')
    expect((await getCart()).items).toEqual([])
  })
})
