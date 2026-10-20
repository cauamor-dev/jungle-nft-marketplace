import type { Quote } from '@/api/contracts'

// Resume o que o usuário vê e aceita na cotação. Id e validade ficam de fora: refazer a cotação
// sem mudar valores não deve pedir nova confirmação.
export function quoteSignature(quote: Quote) {
  return JSON.stringify({
    network: quote.network,
    couponCode: quote.couponCode,
    items: quote.items.map((item) => [item.nftId, item.editionId, item.quantity, item.unitPriceEth, item.nftVersion]),
    subtotalEth: quote.subtotalEth,
    discountEth: quote.discountEth,
    networkFeeEth: quote.networkFeeEth,
    totalEth: quote.totalEth,
  })
}
