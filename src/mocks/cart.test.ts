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
    await addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 2 })
    const cart = await applyCoupon('jungle10')
    expect(cart.summary).toEqual({
      subtotalEth: '0.085',
      discountEth: '0.0085',
      networkFeeEth: '0.0021',
      totalEth: '0.0786',
    })
    expect(cart.couponCode).toBe('JUNGLE10')
  })

  it('respeita estoque e limite por comprador', async () => {
    await expect(addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 4 })).rejects.toMatchObject({
      status: 409,
      code: 'QUANTITY_LIMIT',
      details: { max: 3 },
    })
    await expect(addCartItem({ nftId: 'nft_11', editionId: 'nft_11_ltd', quantity: 1 })).rejects.toMatchObject({
      status: 409,
      code: 'EDITION_SOLD_OUT',
    })
    await addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 2 })
    await expect(addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 2 })).rejects.toMatchObject({
      code: 'QUANTITY_LIMIT',
    })
  })

  it('altera e remove itens', async () => {
    await addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 1 })
    const updated = await updateCartItem('nft_03:nft_03_std', 3)
    expect(updated.items[0].quantity).toBe(3)
    await expect(updateCartItem('nft_03:nft_03_std', 0)).rejects.toMatchObject({ status: 422 })
    await expect(updateCartItem('nft_03:nft_03_std', 1.5)).rejects.toMatchObject({ status: 422 })
    const emptied = await removeCartItem('nft_03:nft_03_std')
    expect(emptied.items).toEqual([])
    expect(emptied.summary.totalEth).toBe('0')
    await expect(removeCartItem('nft_03:nft_03_std')).rejects.toMatchObject({ status: 404 })
  })

  it('trata cupom inválido, expirado e remoção', async () => {
    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_std', quantity: 1 })
    await expect(applyCoupon('NOPE')).rejects.toMatchObject({ status: 422, code: 'COUPON_INVALID' })
    await expect(applyCoupon('EXPIRADO20')).rejects.toMatchObject({ status: 422, code: 'COUPON_EXPIRED' })
    await applyCoupon('BEMVINDO')
    const without = await removeCoupon()
    expect(without.couponCode).toBeNull()
    expect(without.summary.discountEth).toBe('0')
  })

  it('persiste entre leituras e reflete mudança de preço do catálogo', async () => {
    await addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 1 })
    await demoScenario('price-changed', { nftId: 'nft_03', priceEth: '0.05' })
    const cart = await getCart()
    expect(cart.items[0]).toMatchObject({ unitPriceEth: '0.05', addedPriceEth: '0.0425' })
    expect(cart.summary.subtotalEth).toBe('0.05')
  })

  it('sinaliza edição esgotada depois de adicionada', async () => {
    await addCartItem({ nftId: 'nft_03', editionId: 'nft_03_std', quantity: 1 })
    await demoScenario('edition-sold-out', { nftId: 'nft_03', editionId: 'nft_03_std' })
    const cart = await getCart()
    expect(cart.items[0]).toMatchObject({ issue: 'SOLD_OUT', availableQuantity: 0 })
  })
})

describe('login com carrinho de visitante', () => {
  it('migra os itens para a conta e informa conflitos de limite', async () => {
    await loginAs('demo1@example.test')
    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_std', quantity: 2 })
    localStorage.removeItem('jg-session-token')
    localStorage.setItem('jg-guest-id', 'visitante-novo')

    await addCartItem({ nftId: 'nft_01', editionId: 'nft_01_std', quantity: 3 })
    await addCartItem({ nftId: 'nft_02', editionId: 'nft_02_std', quantity: 1 })

    const { cartMerge } = await loginAs('demo1@example.test')
    expect(cartMerge.mergedItems).toBe(2)
    expect(cartMerge.conflicts).toEqual([
      { nftId: 'nft_01', editionId: 'nft_01_std', requested: 3, applied: 1, reason: 'QUANTITY_LIMIT' },
    ])

    const cart = await getCart()
    expect(cart.ownerUserId).toBe('user_1')
    const quantities = Object.fromEntries(cart.items.map((item) => [item.key, item.quantity]))
    expect(quantities).toEqual({ 'nft_01:nft_01_std': 3, 'nft_02:nft_02_std': 1 })

    localStorage.removeItem('jg-session-token')
    expect((await getCart()).items).toEqual([])
  })
})
