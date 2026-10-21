import dourado from '@/assets/nfts/dourado-400.webp'
import esmeralda from '@/assets/nfts/esmeralda-400.webp'
import ivory from '@/assets/nfts/ivory-400.webp'
import violeta from '@/assets/nfts/violeta-400.webp'

export type Article = {
  slug: string
  image: string
  date: string
  read: string
  title: string
  text: string
  body: string[]
}

export const articles: Article[] = [
  {
    slug: 'como-funciona-a-propriedade-de-nfts',
    image: ivory,
    date: '12 de setembro',
    read: 'Leitura de 6 min',
    title: 'Como funciona a propriedade de NFTs',
    text: 'Aprenda a colecionar, negociar e verificar ativos digitais.',
    body: [
      'Um NFT é um registro único na rede que aponta para uma obra digital. Quem tem o token na carteira é o dono daquela edição, e qualquer pessoa pode conferir a procedência no explorador da rede.',
      'Ao comprar, você escolhe a edição. Uma edição 1/1 é peça única; uma 1/10 tem dez cópias numeradas; a edição aberta não tem limite de tiragem. Quanto menor a tiragem, mais rara a peça.',
      'Depois da compra, o recibo mostra a transação, a carteira de destino e os valores pagos. Esse registro não muda, mesmo que o preço da obra mude depois.',
    ],
  },
  {
    slug: '10-artistas-digitais-para-acompanhar',
    image: esmeralda,
    date: '13 de setembro',
    read: 'Leitura de 2 min',
    title: '10 artistas digitais para acompanhar',
    text: 'Conheça criadores que moldam a cultura digital.',
    body: [
      'A cena digital cresce rápido e muitos criadores começam com tiragens pequenas antes de abrir edições maiores. Acompanhar esses lançamentos cedo é a melhor forma de colecionar peças raras.',
      'No mercado, filtre por coleção e por rede para encontrar estúdios que trabalham com arte generativa, fotografia, música e 3D. Favorite as obras que quer acompanhar e elas ficam na sua lista de interesse.',
    ],
  },
  {
    slug: 'raridade-atributos-e-procedencia',
    image: violeta,
    date: '15 de setembro',
    read: 'Leitura de 3 min',
    title: 'Raridade, atributos e procedência',
    text: 'Entenda raridade, procedência, direitos autorais e utilidade.',
    body: [
      'Raridade vem da tiragem e dos atributos da obra. Atributos ficam gravados nos metadados do token e não podem ser alterados depois da cunhagem.',
      'Procedência é o histórico do token desde a criação. Ela garante que a obra saiu do criador original e mostra cada transferência.',
      'Os direitos autorais continuam com o criador, que recebe uma porcentagem nas vendas secundárias.',
    ],
  },
  {
    slug: 'como-proteger-sua-carteira',
    image: dourado,
    date: '15 de setembro',
    read: 'Leitura de 2 min',
    title: 'Como proteger sua carteira',
    text: 'Proteja sua carteira, seus ativos e sua identidade.',
    body: [
      'Nunca compartilhe a frase de recuperação da carteira. Nenhum mercado sério pede essa frase, nem por e-mail nem por suporte.',
      'Confira sempre o endereço da carteira antes de confirmar uma compra e desconfie de links que imitam páginas conhecidas.',
      'Se possível, use uma carteira principal para guardar a coleção e uma secundária para compras do dia a dia.',
    ],
  },
]
