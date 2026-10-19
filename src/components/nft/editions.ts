import type { Edition, Nft } from '@/api/contracts'

// Edição usada nas ações rápidas: a aberta, se houver estoque; senão a primeira com estoque.
export function pickDefaultEdition(nft: Nft): Edition | undefined {
  const inStock = nft.editions.filter((edition) => edition.stock > 0)
  return inStock.find((edition) => edition.label === 'ABERTA') ?? inStock[0]
}
