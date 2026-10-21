export type HelpSection = { id: string; title: string; body: string[] }

// Ajuda da demonstração: explica os fluxos que existem de verdade no site
export const helpSections: HelpSection[] = [
  {
    id: 'central-de-ajuda',
    title: 'Central de ajuda',
    body: [
      'O Kurio é uma demonstração: não há dinheiro, carteira nem blockchain reais. Toda compra é simulada no seu navegador e pode ser refeita quantas vezes quiser.',
      'Para começar do zero, abra qualquer página com ?mock-reset=1 no endereço.',
    ],
  },
  {
    id: 'como-comprar',
    title: 'Como comprar NFTs',
    body: [
      'Escolha a obra no mercado, selecione a edição e a quantidade e toque em Comprar. No carrinho, aplique um cupom se tiver e siga para o pagamento.',
      'No pagamento, escolha a rede e a carteira, confira o total e confirme. O recibo mostra o pedido como pendente e muda para confirmado sozinho, em alguns segundos.',
    ],
  },
  {
    id: 'carteira-e-seguranca',
    title: 'Carteira e segurança',
    body: [
      'Você pode cadastrar uma carteira principal e uma secundária em Perfil, Carteiras. Um endereço novo digitado no pagamento também é cadastrado na hora.',
      'A conexão com a carteira é simulada. Nunca informe uma frase de recuperação em nenhum site.',
    ],
  },
  {
    id: 'politica-do-mercado',
    title: 'Política do mercado',
    body: [
      'Os preços ficam garantidos por cinco minutos depois da cotação. Se o preço, o estoque ou o cupom mudarem antes de você confirmar, o site mostra os novos valores e pede sua confirmação.',
      'Um pedido nunca é cobrado duas vezes: repetir o clique ou perder a conexão não cria um segundo pedido.',
    ],
  },
  {
    id: 'denunciar-item',
    title: 'Denunciar item',
    body: ['Encontrou uma obra suspeita ou que viola direitos autorais? Escreva para contato@email.com com o link do item e o motivo.'],
  },
]
