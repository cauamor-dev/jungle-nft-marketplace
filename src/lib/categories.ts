import type { Category, Network } from '@/api/contracts'

export const categoryLabels: Record<Category, string> = {
  art: 'Arte digital',
  photography: 'Fotografia',
  music: 'Música',
  art3d: 'Arte 3D',
  collectibles: 'Colecionáveis',
  generative: 'Generativa',
  games: 'Jogos',
  subscriptions: 'Assinaturas',
  utility: 'Utilidade',
}

// Coleções na ordem em que a pessoa procura numa lista: alfabética, pelo nome exibido
export const categoriesByLabel = (Object.keys(categoryLabels) as Category[]).sort((a, b) =>
  categoryLabels[a].localeCompare(categoryLabels[b], 'pt-BR'),
)

export const networkLabels: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}
