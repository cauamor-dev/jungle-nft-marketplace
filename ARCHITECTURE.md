# Arquitetura do Kurio

Este documento explica como o app conversa com a API e com o tempo real, como tratei sessão, carrinho e cache, e por que tomei cada decisão. Como rodar, contas de teste e cenários de falha estão no [README](README.md).

## Visão geral

React 19 com TypeScript estrito e Vite 8. TanStack Router para as rotas e TanStack Query para o estado do servidor. Axios com respostas validadas por Zod, MSW 2 com `@mswjs/socket.io-binding` e `socket.io-client`, Tailwind 4 com componentes no padrão do shadcn/ui (Radix), `decimal.js` para dinheiro, Vitest e Playwright.

Não existe backend. A API REST e o Socket.IO rodam no navegador com MSW, e os dados ficam no `localStorage`. Mesmo assim, organizei o código como se a API fosse real:

- **A interface não sabe que existe mock.** Os componentes usam hooks do TanStack Query, que chamam `src/api/endpoints.ts`. Só `src/mocks` conhece os dados. Trocar o MSW por uma API de verdade não muda nada fora de `src/mocks`.
- **Contratos com Zod.** Os schemas ficam em `src/api/contracts.ts`, e os tipos saem deles. Toda resposta é validada antes de chegar na tela, e o mock valida o corpo das requisições com os mesmos schemas.
- **Dinheiro é string.** ETH circula como string decimal (`"0.0425"`) e só vira `Decimal` dentro de `src/domain/money.ts`. Nada de `Number` ou `parseFloat` em valores. Subtotal, desconto, taxa e total são calculados pela API, e a interface só mostra.

```text
src/
  api/        contratos (Zod), cliente Axios, endpoints, chaves de cache
  domain/     dinheiro, edições, estados do pedido, erros
  components/ layout, UI base e componentes de NFT
  features/   catálogo, NFT, carrinho, checkout, pedidos, conta, auth, favoritos, tempo real, painel dos mocks
  mocks/      banco local, fixtures, handlers, cenários e socket
  app/        providers, rotas e layout
e2e/          testes Playwright e referências visuais
scripts/      Lighthouse
```

## Contratos REST

Todas as rotas ficam sob `/api` e trocam JSON. A sessão vai no cabeçalho `Authorization: Bearer <token>`. O visitante é identificado por `X-Guest-Id`, um id aleatório salvo no navegador que serve para o carrinho anônimo.

Na coluna **Acesso**, "sessão" quer dizer que a rota responde 401 `UNAUTHENTICATED` sem token e 401 `SESSION_EXPIRED` com token vencido, e "aberta" quer dizer que funciona para visitante. Corpo que não é JSON responde 400 `INVALID_JSON`.

### Sessão

| Método | Rota | Acesso | O que faz | Erros específicos |
| --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | aberta | Cria a conta e já devolve token e sessão | 409 `EMAIL_TAKEN`, 409 `USERNAME_TAKEN`, 422 `VALIDATION_ERROR` |
| POST | `/api/auth/login` | aberta | Devolve `{ token, session, cartMerge }`. Junta o carrinho de visitante ao da conta e informa o que não coube | 401 `INVALID_CREDENTIALS`, 422 `VALIDATION_ERROR` |
| GET | `/api/auth/session` | sessão | Devolve `{ user, expiresAt }` | 401 `SESSION_EXPIRED`, 401 `UNAUTHENTICATED` |
| POST | `/api/auth/logout` | aberta | Encerra a sessão do token enviado (204) | — |

### Catálogo e favoritos

| Método | Rota | Acesso | O que faz | Erros específicos |
| --- | --- | --- | --- | --- |
| GET | `/api/nfts` | aberta | Lista paginada `{ items, page, pageSize, total, totalPages, facets }`. Aceita `q`, `category` (repetível), `chain` (repetível), `sort` (`recent`, `price-asc`, `price-desc`, `name`), `listing` (`all`, `new`, `trending`), `minPrice`, `maxPrice`, `featured`, `page` e `pageSize` (padrão 9, máximo 48). Valores inválidos são ignorados | — |
| GET | `/api/nfts/:id` | aberta | NFT com edições, preço, disponibilidade e `version` | 404 `NFT_NOT_FOUND` |
| GET | `/api/favorites` | sessão | `{ nftIds }` da conta | — |
| POST | `/api/favorites/:id` | sessão | Favorita e devolve `{ nftIds }`. Repetir não duplica | 404 `NFT_NOT_FOUND` |
| DELETE | `/api/favorites/:id` | sessão | Remove o favorito e devolve `{ nftIds }` | — |

### Carrinho

O carrinho é do usuário logado ou, sem sessão, do visitante do `X-Guest-Id`. Toda resposta devolve o carrinho inteiro, com itens, cupom, `version` e o resumo calculado pela API.

| Método | Rota | Acesso | O que faz | Erros específicos |
| --- | --- | --- | --- | --- |
| GET | `/api/cart?network=` | aberta | Carrinho com totais na rede escolhida | — |
| POST | `/api/cart/items` | aberta | Adiciona `{ nftId, editionId, quantity }` (soma se a linha já existe) | 404 `NFT_NOT_FOUND`, 409 `EDITION_SOLD_OUT`, 409 `QUANTITY_LIMIT` (com `details.max`), 422 |
| PATCH | `/api/cart/items/:key` | aberta | Muda a quantidade de uma linha | 404 `CART_ITEM_NOT_FOUND`, 409 `QUANTITY_LIMIT`, 422 |
| DELETE | `/api/cart/items/:key` | aberta | Remove a linha | 404 `CART_ITEM_NOT_FOUND` |
| PUT | `/api/cart/coupon` | aberta | Aplica `{ code }` | 422 `COUPON_INVALID`, 422 `COUPON_EXPIRED` |
| DELETE | `/api/cart/coupon` | aberta | Remove o cupom | — |

### Checkout e pedidos

| Método | Rota | Acesso | O que faz | Erros específicos |
| --- | --- | --- | --- | --- |
| POST | `/api/quotes` | sessão | Cria uma cotação `{ network }` que congela itens, preços e totais por 5 minutos | 422 `CART_EMPTY`, 422 `COUPON_INVALID` / `COUPON_EXPIRED`, 404 `NFT_NOT_FOUND`, 409 `EDITION_SOLD_OUT`, 409 `QUANTITY_LIMIT` |
| POST | `/api/orders` | sessão | Cria o pedido a partir de `{ quoteId, walletId, network, collector }`. Exige `Idempotency-Key`: mesma chave e mesmo conteúdo devolvem o mesmo pedido (200), e um pedido novo volta com 201 e status `pending` | 400 `IDEMPOTENCY_KEY_REQUIRED`, 409 `IDEMPOTENCY_KEY_REUSED`, 404 `QUOTE_NOT_FOUND`, 409 `QUOTE_ALREADY_USED`, 409 `QUOTE_EXPIRED`, 409 `QUOTE_STALE` (com motivos e a cotação nova em `details`), 404 `WALLET_NOT_FOUND`, 409 `WALLET_NOT_CONNECTED`, 422 `NETWORK_MISMATCH`, 422 `VALIDATION_ERROR` |
| GET | `/api/orders` | sessão | `{ items }` com os pedidos da conta. `?idempotencyKey=` procura o pedido de uma tentativa | — |
| GET | `/api/orders/:id` | sessão | Pedido com status (`pending`, `confirmed`, `rejected`), `version`, referência da transação e recibo congelado | 404 `ORDER_NOT_FOUND`, 403 `FORBIDDEN` (pedido de outra conta) |

### Perfil e carteiras

| Método | Rota | Acesso | O que faz | Erros específicos |
| --- | --- | --- | --- | --- |
| GET | `/api/profile` | sessão | Dados do perfil | — |
| PATCH | `/api/profile` | sessão | Atualiza nome, usuário, e-mail, nome ENS e apelido da carteira | 409 `EMAIL_TAKEN`, 409 `USERNAME_TAKEN`, 422 `VALIDATION_ERROR` |
| POST / DELETE | `/api/profile/avatar` | sessão | Envia ou remove a foto | 422 `VALIDATION_ERROR` (sem imagem, formato ou tamanho) |
| PUT | `/api/profile/password` | sessão | Troca a senha `{ currentPassword, newPassword }` | 422 `VALIDATION_ERROR` (inclusive senha atual errada) |
| GET | `/api/wallets` | sessão | Carteiras da conta | — |
| POST | `/api/wallets` | sessão | Adiciona uma carteira | 409 `WALLET_DUPLICATED`, 409 `WALLET_KIND_TAKEN`, 422 `PRIMARY_WALLET_REQUIRED`, 422 `VALIDATION_ERROR` |
| PATCH | `/api/wallets/:id` | sessão | Edita os dados da carteira | 404 `WALLET_NOT_FOUND`, 403 `FORBIDDEN` (carteira de outra conta), 409 `WALLET_DUPLICATED`, 422 `VALIDATION_ERROR` |
| POST | `/api/wallets/:id/connect` | sessão | Conecta a carteira (simulado) | 404 `WALLET_NOT_FOUND`, 403 `FORBIDDEN`, 403 `WALLET_REJECTED` (cenário `wallet-refused`) |
| POST | `/api/wallets/:id/disconnect` | sessão | Desconecta | 404 `WALLET_NOT_FOUND`, 403 `FORBIDDEN` |

### Erros

Todo erro segue o mesmo formato:

```json
{ "code": "QUOTE_STALE", "message": "Os valores mudaram desde a cotação.", "fieldErrors": { "campo": "mensagem" }, "details": {} }
```

| Situação | Como chega | O que o app faz |
| --- | --- | --- |
| Validação | 422 `VALIDATION_ERROR` com `fieldErrors` | Mostra a mensagem embaixo de cada campo |
| Sessão inválida ou expirada | 401 `UNAUTHENTICATED` / `SESSION_EXPIRED` | Limpa os dados privados e abre o login sobre a página atual |
| Sem permissão | 403 `FORBIDDEN` | Mostra a mensagem da API ("Você não tem acesso a este pedido.") sem nenhum dado do recurso |
| Recurso inexistente | 404 `*_NOT_FOUND` | Tela de "não encontrado" com link de volta ao mercado |
| Conflito de disponibilidade | 409 `EDITION_SOLD_OUT`, `QUANTITY_LIMIT`, `QUOTE_STALE` | Explica o que mudou e oferece o próximo passo (ajustar quantidade, aceitar o valor novo) |
| Falha temporária | 5xx, sem resposta ou timeout de 10 s | Mensagem de erro com "Tentar de novo". Leituras repetem sozinhas até 2 vezes |

As rotas `/__demo/*` (reset, cenário e estado) são só da demonstração. Elas ficam fora de `/api` e não sofrem as falhas simuladas.

## Eventos Socket.IO

O socket conecta só por WebSocket em `/socket.io`. Logo depois de conectar, o cliente manda `session.subscribe` com o token. O servidor guarda qual usuário está naquela conexão e manda eventos de pedido só para o dono.

| Evento | Direção | Payload | Quem recebe | Efeito no app |
| --- | --- | --- | --- | --- |
| `session.subscribe` | cliente → servidor | `{ token }` (ou `null` para visitante) | — | Associa a conexão ao usuário. É reenviado a cada reconexão |
| `nft.updated` | servidor → cliente | `{ eventId, resource: { type: 'nft', id }, version, occurredAt, data: { priceEth, available, editions } }` | Todos | Atualiza preço e disponibilidade no catálogo e no detalhe e recarrega carrinho e cotação |
| `order.updated` | servidor → cliente | `{ eventId, resource: { type: 'order', id }, version, occurredAt, userId, data: { status, txReference, rejectionReason } }` | Só o dono do pedido | Atualiza o status no recibo e no histórico. Se confirmou, recarrega o carrinho |

Regras do cliente (`src/features/realtime/realtime-client.ts`):

- **Identidade:** cada evento tem um `eventId` único. Os últimos 500 ids ficam guardados, e um evento repetido é descartado.
- **Versão:** cada recurso tem uma `version` que só cresce. Evento com versão igual ou menor que a última aplicada é descartado como atrasado. O mesmo vale ao aplicar no cache: um dado REST mais novo que o evento não é sobrescrito.
- **Validação:** o payload passa pelo schema Zod. Evento malformado é ignorado.
- **Isolamento:** `order.updated` com `userId` diferente do usuário atual é ignorado, mesmo que chegue por engano.
- **Um cliente por sessão:** ao entrar, sair ou trocar de conta, o cliente anterior é destruído (socket, listeners, ids e versões vistas) e outro é criado.

## Política de sessão

- O token fica no `localStorage` (`jg-session-token`), então a sessão sobrevive ao refresh. No servidor ela dura 2 horas.
- Ao abrir o app, a sessão é conferida em `GET /api/auth/session`. Um 401 limpa o token e o app segue como visitante.
- **Sessão expirada no meio do uso:** qualquer 401 da sessão atual limpa os dados privados e abre o login sobre a página atual. Depois de entrar, a pessoa continua na mesma rota. Rascunhos do checkout ficam no `sessionStorage` por usuário, e a ação pedida antes do login (como favoritar) é executada assim que a sessão volta.
- **Rotas privadas** (`/perfil/*`, pagamento, recibo) checam a sessão antes de carregar. Sem sessão, abrem o login e voltam ao destino original.
- **Logout e troca de conta** cancelam as requisições privadas em andamento, apagam todo o cache privado, limpam a tentativa de checkout salva e recriam o cliente do socket.
- **Respostas atrasadas da conta anterior** não afetam a sessão nova. O 401 só derruba a sessão se a requisição saiu com o token atual, e um perfil salvo pela conta anterior não sobrescreve o usuário logado.

## Estado do carrinho

- O carrinho mora na API, não no cliente. A tela mostra o que `GET /api/cart` devolve, com totais calculados no servidor.
- Visitante tem carrinho próprio pelo `X-Guest-Id`, que sobrevive ao refresh. No login, os itens do visitante são juntados ao carrinho da conta respeitando estoque e limite por comprador. O que não coube volta em `cartMerge`, e o app avisa.
- Cada linha é uma edição (1/1, 1/10, 1/50 ou aberta) com preço próprio. A regra de preço fica em `src/domain/editions.ts` e é a mesma no detalhe, no carrinho, na cotação e no recibo.
- Quantidade é limitada pelo estoque e pelo limite por pessoa da edição. A API responde 409 com o máximo permitido, e o seletor de quantidade já respeita esse máximo.
- O estoque só baixa quando o pagamento confirma. Assim o carrinho do próprio comprador não fica "acima do disponível" enquanto o pedido está pendente.
- **Checkout sem pedido duplicado.** A cotação congela preços por 5 minutos. O pedido sai com uma `Idempotency-Key` guardada no `sessionStorage`. Cliques repetidos dividem a mesma requisição. Se a resposta se perde, o app procura o pedido pela chave antes de reenviar, e se nem a consulta funciona a compra fica bloqueada até dar para conferir, porque uma cotação nova geraria outra chave e outro pedido. O servidor revalida preço, estoque, cupom e carrinho, e responde 409 com a cotação nova quando algo mudou. O recibo é uma cópia congelada: mudar o perfil ou o preço depois não altera pedidos antigos.

## Estratégia de cache

| Dado | Chave | Política |
| --- | --- | --- |
| Sessão | `['session']` | `staleTime` de 60 s, sem retry |
| Catálogo | `['nfts', 'list', params]` | `staleTime` de 30 s. Mantém a página anterior na tela enquanto a próxima carrega. Os parâmetros são normalizados para filtros iguais não gerarem chaves diferentes |
| Detalhe | `['nfts', 'detail', id]` | `staleTime` de 30 s, atualizado pelo socket |
| Favoritos | `['private', dono, 'favorites']` | Atualização otimista, com rollback se a API falhar |
| Carrinho | `['private', dono, 'cart', rede]` | A resposta de cada mutação vira o cache, e as outras redes são invalidadas |
| Cotação | `['private', dono, 'quote', rede]` | Nunca refeita sozinha (`staleTime` infinito, sem refetch por foco ou reconexão), porque cada busca cria uma cotação nova no servidor. Só é refeita quando o carrinho muda |
| Pedido | `['private', dono, 'orders', id]` | Enquanto está `pending`, consulta a API a cada 4 s, além de receber o socket |

Regras gerais:

- **Tudo o que é privado** fica sob `['private', dono, ...]`, onde o dono é `user:<id>` ou `guest:<id>`. Limpar a sessão é remover um único prefixo, e o cache de uma conta nunca aparece em outra.
- **Retry:** leituras repetem até 2 vezes, mas nunca em erro 4xx, que não vai mudar tentando de novo. Mutações não repetem sozinhas, para não duplicar ação. O checkout tem a própria lógica de idempotência.
- **Estado do catálogo na URL:** busca, filtros, ordenação e página ficam na URL. Voltar de um NFT restaura a lista igual, e um link compartilhado abre o mesmo resultado.

## Reconciliação REST e Socket.IO

A API REST é a fonte da verdade. O socket só acelera a atualização.

1. **Evento novo:** passa pela checagem de `eventId` e `version` e é aplicado direto no cache (`setQueryData`). Para o que depende de cálculo do servidor (totais do carrinho, cotação, lista de pedidos), o evento só invalida, e o dado é buscado de novo na API.
2. **Evento repetido ou atrasado:** descartado. Ao aplicar, o cache também compara versões, então um evento velho nunca desfaz uma resposta REST mais nova.
3. **Queda e reconexão:** o que foi emitido durante a queda se perdeu. Ao reconectar, o cliente reenvia `session.subscribe` e invalida o catálogo e todo o cache privado do dono, que voltam a ser buscados na API.
4. **Socket indisponível:** o recibo pendente continua se atualizando pela consulta a cada 4 s, então o status chega mesmo sem tempo real.
5. **Preço mudou no checkout:** o `nft.updated` recarrega o carrinho e a cotação. Se o pedido for enviado com a cotação antiga, o servidor responde 409 `QUOTE_STALE` com a cotação nova, e o app mostra o valor antigo e o novo e só deixa pagar depois de aceitar.

## Decisões de UX

- **Login e cadastro em diálogo**, e não em tela cheia como no Figma, para a pessoa voltar ao mesmo ponto depois de entrar.
- **Ações que pedem conta.** Favoritar como visitante abre o login, e o favorito é salvo assim que a pessoa entra, sem clicar de novo. Fechar o login sem entrar descarta a intenção. O botão do carrinho reflete a sessão ("Conectar e finalizar" sem conta, "Finalizar compra" com conta).
- **Busca enquanto digita**, 300 ms depois da última tecla. O termo continua no campo ao voltar de um NFT.
- **Rolagem previsível.** Filtros e abas não mexem na rolagem. Na paginação, a lista sobe suavemente até o começo dos resultados. No menu do topo, "Criadores" e "Aprenda" rolam suavemente até a seção.
- **Lista contínua no celular.** Em vez de páginas, a lista cresce com "Carregar mais" (e sozinha perto do fim). O número de páginas carregadas fica na URL para o feed voltar igual.
- **Uma variante de layout por vez** (mobile abaixo de 768 px, desktop acima), em vez de esconder com CSS e ter tudo duplicado no DOM.
- **Erros explicam o próximo passo.** Toda falha tem mensagem em português e uma ação: tentar de novo, ajustar a quantidade, aceitar o preço novo, entrar de novo.
- **Cenários de demonstração visíveis.** Quando um cenário de falha está ativo, uma faixa no topo avisa e oferece "Restaurar condições normais", para um erro simulado nunca parecer defeito.
- **Acessibilidade.** Foco visível, navegação por teclado em diálogos, abas e no seletor de ordenação, alvos de toque de 44 px no celular, ordem de títulos sem pular nível e textos alternativos.
- **Movimento.** Entrada das páginas e dos cards, abas, contador do carrinho, favoritos e diálogos usam só `transform` e `opacity`, de 200 a 360 ms. Tudo fica instantâneo com `prefers-reduced-motion`.
- **Funcionalidades fora da demo não fingem que funcionam.** Login com Google ou Facebook e recuperação de senha avisam que não fazem parte da demonstração. Itens sem destino ainda ("Estúdio do criador", "Ofertas", "Arquivos baixados") aparecem com o selo "em breve".
- **"Ver no Etherscan"** abre um explorador simulado com o hash que a API devolveu, já que não existe transação real.
- **O código de indicação do pagamento é opcional.** No layout ele é obrigatório, mas uma conta nova não teria de onde tirar um código.

## Desvios do Figma

Algumas coisas no Figma eu achei inconsistentes e acertei na implementação:

- Coleções em ordem alfabética, no filtro e no rodapé. No layout elas estão numa ordem que não segue nenhum critério.
- Card de NFT e imagem principal do detalhe só com a imagem, quadrada e com cantos arredondados. No layout cada uma tem uma caixa marrom atrás, com sobras diferentes em cima e embaixo de card para card.
- Na promo, a imagem ocupa toda a altura do card. No layout sobra uma faixa do fundo embaixo dela.
- No celular, a promo empilha a imagem em cima do texto, em vez de espremer o texto em seis linhas ao lado de uma imagem estreita.
- Contadores da barra de filtros alinhados à direita na mesma coluna. No layout os números da rede ficam mais à direita que os das coleções.
- Preço anterior riscado ao lado do preço atual. No layout os dois aparecem lado a lado sem indicar qual vale.
- "Desconto do lançamento" com o mesmo formato dos outros valores ("(-) 0.00 ETH"). No layout aparece "(-) 00.00" no carrinho e no pagamento, e outro formato no recibo.
- Ícones das redes sociais do rodapé como links que abrem em nova aba, com estado de foco e hover. O do YouTube foi redesenhado no mesmo estilo e tamanho dos outros.
- "Ordenar por" com um seletor no visual do site, em vez do select nativo do navegador.
- Login e cadastro em diálogo, e não em tela cheia (ver decisões de UX).
- Perfil e carteiras no celular: o Figma não tem esses frames, então as abas viram uma faixa rolável e os formulários empilham.

## Decisões técnicas

- **O MSW sobe antes do app.** O `socket.io-client` guarda a referência de `WebSocket` no momento do import. Por isso o `main.tsx` ativa os mocks e só depois importa a aplicação. O custo é um carregamento inicial em duas etapas, que pesa no Lighthouse mobile. Para compensar, troquei o `tough-cookie` que o MSW importa (cerca de 340 kB que os mocks não usam) por um substituto mínimo e separei os chunks de MSW, socket e Radix.
- **O mock se recupera quando o Chrome reinicia o service worker.** O service worker do MSW guarda só na memória quais abas ativaram o mock. Quando o Chrome encerra o worker parado e o religa, ele esquece a aba, e as chamadas à API vão para o servidor e voltam com o `index.html`. Se uma chamada da API volta como HTML, a aba se registra de novo no worker e repete a chamada (`src/mocks/browser.ts`).
- **Seletor de ordenação com Radix.** Ele traz teclado completo e leitura por leitor de tela, mas aumentou o pacote compartilhado em cerca de 13 kB comprimidos. As notas do Lighthouse continuaram acima das metas.

## Limitações

- Sem backend: contas, pedidos e estoque vivem no `localStorage` e valem só para aquele navegador.
- As abas não se sincronizam: logout ou troca de conta em uma aba não chega às outras abertas, e duas abas mexendo nos dados ao mesmo tempo podem sobrescrever o banco local uma da outra.
- Senhas são guardadas como hash com salt, o que basta para a simulação, mas não é um backend seguro.
- O binding de Socket.IO do MSW só aceita o namespace padrão e eventos de texto (sem acknowledgments nem binários). Por isso o cliente usa só WebSocket, sem long-polling, e o usuário é identificado por um evento próprio.
- Aberto por HTTP pelo IP da rede (ex.: `pnpm dev:lan` no celular), o navegador não registra service worker. O app funciona, mas sem o tempo real simulado, e uma faixa avisa isso.
- Os links das redes sociais apontam para a página inicial de cada rede, já que o Kurio não tem perfis reais.
- O conteúdo dos artigos e da ajuda é curto e fictício, escrito para explicar os fluxos da demo.

## O que eu faria com mais tempo

- Sincronizar abas com `BroadcastChannel`: logout e troca de conta em uma aba refletindo nas outras, e uma trava para duas abas não sobrescreverem o banco local uma da outra.
- Páginas de criador e de coleção, para os links "Criadores" e o nome da coleção no detalhe levarem a uma lista filtrada com a história de quem fez a obra.
- Trocar o carregamento em duas etapas (MSW e depois app) por um service worker pré-registrado, para ganhar tempo na primeira visita no celular.
- Testes de acessibilidade automatizados com axe em todas as telas, além das verificações que já existem.
- Telas de perfil e carteiras desenhadas para mobile.
