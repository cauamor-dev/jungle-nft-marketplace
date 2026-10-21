import type { Edition } from '@/api/contracts'
import { addEth, percentOfEth, type DecimalString } from './money'

// Tiragem total da edição: "1/10" tem 10 cópias. A edição aberta não tem limite.
export function editionSupply(edition: Pick<Edition, 'label'>): number | null {
  const match = /^1\/(\d+)$/.exec(edition.label)
  return match ? Number(match[1]) : null
}

// O preço do NFT é o da edição aberta. Quanto menor a tiragem, mais rara e mais cara a edição.
// Mesma regra no mock (carrinho, cotação e pedido) e na tela de detalhe.
export function editionPriceEth(basePriceEth: DecimalString, edition: Pick<Edition, 'label'>): DecimalString {
  const supply = editionSupply(edition)
  if (supply === null) return basePriceEth
  const premium = supply === 1 ? 300 : supply <= 10 ? 100 : 50
  return addEth(basePriceEth, percentOfEth(basePriceEth, premium))
}
