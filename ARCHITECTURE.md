# Arquitetura

Este documento descreve o que existe no código hoje. Desvios em relação ao Figma estão em [FIGMA_AUDIT.md](FIGMA_AUDIT.md); limites conhecidos estão em "Limites", no fim.

## Fluxo de dados

```text
componente -> hook (TanStack Query) -> endpoints (Axios + Zod) -> rede -> MSW -> store do mock
                                                                              |
cliente Socket.IO <- WebSocket interceptado pelo MSW <- barramento de eventos <-+
```

- A UI nunca importa fixtures nem o store. Só `src/mocks` os conhece, e `src/main.tsx` só carrega o mock via `import()` quando `VITE_ENABLE_MOCKS` não é `false`.
- O MSW precisa estar ativo **antes** de qualquer módulo da aplicação ser importado. O `engine.io-client` guarda `globalThis.WebSocket` no momento do import; se o MSW aplicar o patch depois, o socket abre uma conexão real e falha. Por isso `main.tsx` ativa os mocks e só então faz `import('./app/mount')`.
- Respostas são validadas com Zod em `src/api/endpoints.ts`. Os tipos de DTO são derivados dos schemas em `src/api/contracts.ts`.

## Contratos REST

Erros seguem `{ code, message, fieldErrors?, details? }`. O Axios converte em `ApiError` (resposta HTTP) ou `NetworkError` (sem resposta: rede ou timeout, com `timedOut`). `NetworkError` significa "resultado desconhecido".

| Recurso | Rota | Observações |
| --- | --- | --- |
| Sessão | `POST /api/auth/register` | 201; 409 `EMAIL_TAKEN`; 422 por campo |
| | `POST /api/auth/login` | Retorna `token`, sessão e `cartMerge` (itens migrados e conflitos). 401 `INVALID_CREDENTIALS` |
| | `GET /api/auth/session` | 401 `UNAUTHENTICATED` ou `SESSION_EXPIRED` |
| | `POST /api/auth/logout` | 204 |
| NFTs | `GET /api/nfts?q&category&chain&sort&page&pageSize&featured` | `category` e `chain` repetíveis. Retorna `items`, `page`, `pageSize`, `total`, `totalPages` e `facets` calculadas sobre o resultado filtrado. `sort`: `recent`, `price-asc`, `price-desc`, `name` |
| | `GET /api/nfts/:id` | 404 `NFT_NOT_FOUND` |
| Favoritos | `GET /api/favorites`, `POST /api/favorites/:id`, `DELETE /api/favorites/:id` | Exigem login |
| Carrinho | `GET /api/cart?network=` | Visitante ou usuário. Totais calculados pela API |
| | `POST /api/cart/items` | 409 `EDITION_SOLD_OUT` ou `QUANTITY_LIMIT` (`details.max`) |
| | `PATCH /api/cart/items/:key`, `DELETE /api/cart/items/:key` | `key` = `nftId:editionId` |
| | `PUT /api/cart/coupon`, `DELETE /api/cart/coupon` | 422 `COUPON_INVALID` ou `COUPON_EXPIRED` |
| Cotação | `POST /api/quotes` `{ network }` | Congela preços e totais por 5 minutos. 409 se algum item esgotou |
| Pedidos | `POST /api/orders` + `Idempotency-Key` | Ver abaixo |
| | `GET /api/orders`, `GET /api/orders?idempotencyKey=`, `GET /api/orders/:id` | 403 para pedido de outro usuário |
| Perfil | `GET/PATCH /api/profile`, `POST/DELETE /api/profile/avatar`, `PUT /api/profile/password` | Avatar: PNG, JPEG ou WebP até 512 KB |
| Carteiras | `GET/POST /api/wallets`, `PATCH /api/wallets/:id`, `POST /api/wallets/:id/connect`, `POST /api/wallets/:id/disconnect` | Uma principal e uma secundária por usuário; endereço `0x` + 40 hex |

### Pedido

`POST /api/orders` com `{ quoteId, walletId, network, collector }`:

1. Mesma `Idempotency-Key` e mesmo conteúdo (hash SHA-256 do corpo com chaves ordenadas): devolve o pedido existente (200). Conteúdo diferente: 409 `IDEMPOTENCY_KEY_REUSED`.
2. Uma cotação só gera um pedido: outra chave para a mesma cotação responde 409 `QUOTE_ALREADY_USED`.
3. Cotação expirada: 409 `QUOTE_EXPIRED`.
4. Revalida contra o estado atual: versão do carrinho, preço, disponibilidade, cupom e taxa. Qualquer diferença responde 409 `QUOTE_STALE` com `details.reasons` e `details.currentQuote` (nova cotação, ou `null` se não for possível). O cliente precisa pedir nova confirmação ao usuário.
5. Carteira precisa estar conectada (409 `WALLET_NOT_CONNECTED`) e na mesma rede da cotação (422 `NETWORK_MISMATCH`).
6. Cria o pedido `pending` com o recibo congelado (`structuredClone` dos itens e totais da cotação). A confirmação ou recusa acontece depois (padrão 1,5 s).

Na confirmação o mock confere o estoque; se acabou, o pedido é recusado. Só então baixa o estoque e remove do carrinho as quantidades compradas. Na recusa, carrinho e estoque ficam intactos. `pending -> confirmed | rejected` é a única transição (`src/domain/order.ts`). O pedido pendente conclui pelo relógio mesmo após um refresh: `GET /api/orders` e o início do mock reagendam a liquidação.

No cliente, `submitOrder` (`src/features/checkout/place-order.ts`) compartilha uma única requisição por chave (cliques repetidos) e, ao receber `NetworkError`, consulta `GET /api/orders?idempotencyKey=` antes de reenviar com a mesma chave. `getAttemptKey` guarda a chave em `sessionStorage` por usuário e conteúdo, então um refresh reaproveita a tentativa.

## Dinheiro

ETH trafega como string decimal. `src/domain/money.ts` é o único lugar com `decimal.js` (18 casas, arredondamento para baixo). Quantidades são inteiros. Subtotal, desconto, taxa e total são sempre calculados no mock; o cliente só exibe. Taxa de rede fixa por rede: Ethereum 0,016, Polygon 0,002, Solana 0,0005 ETH, cobrada uma vez por pedido.

## Sessão

- Token opaco em `localStorage` (`jg-session-token`), enviado como `Authorization: Bearer`. A sessão do mock dura 2 h.
- `GET /api/auth/session` recupera a sessão após refresh (`useSession`).
- Resposta 401 com `SESSION_EXPIRED` ou `UNAUTHENTICATED` dispara `onSessionInvalid`, que limpa o token e o cache privado.
- Logout, troca de usuário e sessão inválida passam por `resetPrivateState`: cancela e remove todas as queries sob `['private']` e apaga a tentativa de checkout. O `RealtimeProvider` recria o cliente do socket quando o `userId` muda; o anterior desconecta, remove listeners e esquece versões vistas.
- Visitante tem um `X-Guest-Id` (em `localStorage`) que identifica o carrinho anônimo no mock. No login o carrinho é migrado: soma sem passar de `min(estoque, maxPerBuyer)`, o excedente volta em `cartMerge.conflicts`.
- Rotas privadas (`/pagamento`, `/pedido/:id`, `/perfil/*`) ficam sob um layout sem caminho do TanStack Router (`id: 'privado'` em `src/app/router.tsx`). O `beforeLoad` resolve a sessão com `ensureQueryData` (o `queryClient` chega pelo contexto do router) e o componente do layout aplica `RequireAuth`, com o texto vindo do `staticData` da rota.
- Retomada do checkout após expiração: sem sessão, o guard abre o login no próprio endereço e renderiza a página no mesmo lugar depois de entrar. Os campos do formulário e a carteira escolhida ficam em `sessionStorage` por usuário (`checkout-draft.ts`) e são apagados no logout. O foco volta ao elemento que abriu o diálogo ao fechá-lo.

## Cache (TanStack Query)

- `staleTime` de 30 s. Eventos do socket e mutations invalidam antes disso.
- Retry: até 2 vezes, só para falha de rede ou 5xx. 4xx é resposta definitiva. Mutations não repetem sozinhas.
- Chaves: catálogo em `['nfts', ...]` com parâmetros normalizados (arrays ordenados, `page` padrão 1). Dado privado sempre em `['private', dono, ...]`, onde `dono` é `user:<id>` ou `guest:<id>` (`src/api/query-keys.ts`).
- Requisições recebem o `AbortSignal` do Query para descartar respostas obsoletas.
- Favoritos: atualização otimista em `features/favorites/queries.ts`. A mutation cancela as consultas, grava o novo estado no cache, e em caso de erro restaura o anterior (a tela de detalhe avisa por toast); ao final invalida. Visitante que favorita é levado ao login e a ação é concluída depois.
- Catálogo mantém a página anterior enquanto carrega a nova (`keepPreviousData`) e marca a área com `aria-busy`.

## Tempo real

### Transporte e limitações

- `socket.io-client` usa só o transporte WebSocket (`transports: ['websocket']`), namespace padrão e eventos de texto. O `@mswjs/socket.io-binding` 0.2.0 (peer `msw ^2.10.2`, por isso o `msw` está fixado em 2.x) não suporta namespaces, acknowledgments nem binários.
- O binding responde ao handshake com `sid` fixo (`test`) e não envia pings. Sem pings o engine.io do cliente derruba a conexão após `pingInterval + pingTimeout`, então `src/mocks/socket.ts` envia o pacote `2` a cada 25 s.
- O MSW 2.15 remove o prefixo `/socket.io/` da URL antes de comparar com o handler. O link é `ws.link('*')`; conexões sem `EIO` na query (como o HMR do Vite) seguem para o servidor real.
- O WebSocket é interceptado dentro da página: não existe conexão de rede real. O teste `e2e/realtime-transport.spec.ts` confirma isso observando que o Playwright não registra nenhum WebSocket.
- Como o binding não expõe o payload de autenticação do `CONNECT`, o cliente emite `session.subscribe { token }` depois de conectar. O servidor mock associa a conexão ao usuário.

### Eventos

Envelope: `{ eventId, resource: { type, id }, version, occurredAt, userId?, data }`.

- `nft.updated`: `data = { priceEth, available, editions[] }`. Público.
- `order.updated`: `data = { status, txReference, rejectionReason }`. Privado: o mock só envia ao dono e o cliente descarta se `userId` diferir do usuário atual.

Toda mudança no store passa por `publishNftUpdated` / `publishOrderUpdated`, que registram o evento e o enviam aos sockets. Assim a REST e os eventos mostram a mesma versão.

### Reconciliação

`RealtimeClient` guarda `eventId`s vistos (limite de 500) e a última versão por recurso. Duplicado ou versão menor ou igual é descartado e registrado como `duplicate` ou `stale`. Evento aceito de NFT atualiza os caches de detalhe e listas (sem refetch, sem regredir versão) e invalida carrinho e cotação do dono. Evento de pedido atualiza o cache do pedido, invalida a lista e, se confirmado, o carrinho. Depois de reconectar, invalida o catálogo e todo o cache privado do dono: a REST é a fonte da verdade, porque eventos emitidos durante a queda se perdem.

## Mocks

- Dados em `localStorage` (`jg-mock-db`, esquema 2), com semente determinística (36 NFTs, 2 usuários, 3 carteiras, 3 cupons, 1 pedido do `demo2`). `resetDb` restaura tudo.
- O cenário (falhas, latência, socket bloqueado, resultado do pagamento) fica em `sessionStorage` (`jg-mock-scenario`): vale para a aba, sobrevive a reload e navegação, e não passa para abas ou sessões novas. Na versão 1 ele era gravado junto dos dados e uma falha como `offline` (sem `remaining`) travava o catálogo em qualquer aba, para sempre; a migração para o esquema 2 descarta esse cenário antigo e mantém os dados.
- Cada mudança de cenário dispara o evento de janela `jg:mock-scenario`. A faixa `ScenarioBanner` escuta esse evento (e consulta `GET /__demo/state` ao montar) sem importar o mock, mostra o cenário ativo e restaura as condições normais com `happy-path`, preservando os dados. `?mock-reset=1` faz o reset completo antes de montar.
- Fora de contexto seguro (HTTP pelo IP da rede) não há `crypto.subtle` nem `randomUUID`: o hash PBKDF2/SHA-256 do mock usa uma implementação em JS puro com os mesmos bytes do WebCrypto (`services/sha256.ts`, testada contra ele) e os ids usam `getRandomValues`. O MSW roda sem service worker (fallback) e, na versão 2.15, não aplica a interceptação de WebSocket nesse modo (as duas fontes de interceptação usam o mesmo nome global); por isso o cliente de tempo real não é iniciado ali e uma faixa avisa. `main.tsx` captura qualquer falha de inicialização e mostra um aviso em vez de tela em branco.
- Toda rota `/api` passa por `route()` (`src/mocks/handlers/route.ts`): falhas do cenário, latência, validação e conversão de `MockHttpError`.
- Latência variável usa um gerador pseudo-aleatório com semente persistida, então a sequência é reproduzível.
- Detalhe que já causou um falso positivo: o handler lê o estado **depois** da latência, então uma requisição em andamento durante `price-changed` responde com o preço novo. Os testes esperam a carga inicial antes de mudar o cenário.

## Decisões

- Rede e rede de carteira: a taxa depende da rede escolhida no checkout, não da rede do NFT. O pedido exige que carteira, cotação e rede escolhida coincidam.
- Estoque só baixa na confirmação, para o carrinho do próprio comprador não ficar "acima do disponível" enquanto o pedido está pendente.
- Imagens de NFT: as fixtures reaproveitam as quatro artes exportadas do Figma (`src/assets/nfts`, WebP em 400 e 800 px). Nenhuma imagem foi criada fora do arquivo.
- Textos, nomes e preços das fixtures são fictícios.

## Interface

- **Rotas**: TanStack Router em código, com contexto tipado (`createRootRouteWithContext`) e o layout privado descrito em "Sessão". Só o catálogo entra no bundle inicial; as demais páginas usam `React.lazy` com `RouteFallback` (`role=status`). A busca do catálogo é lida e escrita na URL por `parseSearch`/`stringifySearch` próprios; valores inválidos são saneados em `validateCatalogSearch`.
- **Breakpoints**: `useIsDesktop()` (768 px) escolhe uma única variante (mobile ou desktop) por tela, sem renderizar as duas. Detalhe, carrinho e pagamento empilham abaixo de `lg` (1024 px), o que cobre o tablet de 768 px sem overflow.
- **Cotação aceita**: `quote-signature.ts` resume preços, taxa e total da cotação. Se a assinatura muda (evento de socket ou 409 `QUOTE_STALE`), o botão de pagar fica desabilitado até o usuário aceitar os novos valores.
- **Carrinho**: item com preço diferente do momento em que foi adicionado mostra o valor antigo e o atual. No login, se o carrinho do visitante não couber inteiro (estoque ou limite da edição), um aviso informa o ajuste. O campo de lançamentos do rodapé valida o e-mail e deixa claro que o cadastro não acontece nesta demonstração.
- **Carteira**: uma carteira digitada no pagamento é cadastrada antes do pedido; o pedido só é criado se a conexão da carteira tiver sucesso.
- **Recibo**: `/pedido/:id` mostra o snapshot congelado do pedido. "Ver no Etherscan" abre um diálogo de explorador simulado com o hash e os valores da API; não há link externo, porque nenhuma transação existe fora do mock. 403/404 mostram "Pedido indisponível" sem botão de nova tentativa. O status vem da API e do socket; com o socket derrubado, `order-receipt` consulta a REST a cada 4 s enquanto o pedido está pendente.
- **Movimento**: diálogos abrem com opacidade e escala (o filtro mobile sobe da borda), cards aproximam a imagem no hover, botões reagem ao toque, toasts e recibo entram com um deslocamento curto e o coração do favorito pulsa ao marcar. Só `transform` e `opacity`, sem animar layout. Tudo isso e o shimmer são desligados com `prefers-reduced-motion`.
- **shadcn/ui**: as primitivas de `src/components/ui` seguem o padrão do shadcn (Radix + `cva` + `cn`), com `components.json` na raiz para o CLI.

## Testes

- `pnpm test` (Vitest, MSW em Node): contratos, dinheiro, auth, catálogo, carrinho, checkout.
- `pnpm test:e2e` (Playwright, 1440 e 390): as specs usam só a UI e a rede, com cenários do mock via `/__demo/scenario`. `reuseExistingServer` é `false` para nunca testar um `dist` antigo.
- Regressão visual: baselines de início, detalhe, carrinho e pagamento em `e2e/responsive.spec.ts-snapshots`, com `maxDiffPixelRatio` de 0,005. Elas foram geradas pelo próprio app depois da conferência manual com o Figma, então protegem contra regressões e não provam fidelidade.
- Regressão visual: o `@playwright/test` está fixado em 1.56.1 (Chromium 141) e o `playwright.config.ts` passa `--font-render-hinting=none` e `--disable-lcd-text`. Sem essas flags o Chromium seguia o fontconfig de cada sistema; com hinting diferente os glifos mudavam de largura, a quebra de linha mudava e duas máquinas Linux divergiam em 0,5% a 1,7% dos pixels. Com elas, a imagem `mcr.microsoft.com/playwright:v1.56.1-noble` e o Linux de desenvolvimento geram as 8 telas idênticas. A tolerância (`maxDiffPixelRatio` 0,0005) foi calibrada contra 1 px de padding num único card, que muda de 0,065% a 0,7% dos pixels e precisa falhar; por isso não uso tolerâncias de 1% a 3%. Comando oficial no README.
- Nenhum teste é pulado. Ordenação, login por teclado e foco visível rodam também no mobile (ordenação pelo painel de filtros, login pelo favorito de um card).
- Alvos de toque: o teste "alvos de toque em 390px" mede a área real de cada controle visível em sete telas (caixa do elemento mais o `::after` do utilitário `touch-target`, recortada por ancestrais com `overflow` que não rolam) e exige 44 x 44 px.
- Regressões cobertas desde a auditoria externa: cenário de falha preso (aba nova, dados no formato antigo, `?mock-reset=1`, restauração pela faixa), estados de erro em 320/375/390 px sem rolagem lateral, cotação que vence com o relógio controlado por `page.clock`.

## Limites

- O mock não tem backend: sessão, pedidos e estoque vivem em `localStorage` e valem por navegador.
- O binding de Socket.IO do MSW não suporta namespaces, acknowledgments nem binários (ver "Tempo real").
- Performance mobile: antes da primeira pintura o navegador precisa do MSW e da aplicação, em sequência, porque o `socket.io-client` só pode ser executado depois do MSW ativo. O que funcionou: (1) o `tough-cookie` do MSW (com a lista de sufixos públicos do `tldts`, ~340 kB) é trocado por um substituto mínimo (`src/mocks/tough-cookie-stub.ts`), já que os mocks não usam cookies, e o chunk do mock caiu de 177 para 57 kB gzip; (2) chunks próprios para `msw`, `socket`, `socket-protocol` e `radix` via `codeSplitting` do Rolldown. Os parsers do Socket.IO ficam num grupo de prioridade maior que o do cliente: sem isso eles iam para o chunk `socket`, o mock passava a importá-lo e o `engine.io-client` era executado antes do MSW (os 5 testes de `realtime-transport.spec.ts` falharam e pegaram o problema); (3) preload da imagem do hero só na home desktop, onde ela é o LCP. O que não funcionou: `modulepreload` dos chunks da aplicação em paralelo ao MSW (Performance mobile de 93 para 83, por disputa de banda).
- Pagamento: enquanto a cotação é calculada, `PaymentSummarySkeleton` ocupa o mesmo espaço do resumo (itens do carrinho, subtotal, desconto, taxa e total), e o botão de confirmar fica desabilitado. Um teste mede o CLS da troca com `PerformanceObserver`.

## Desvios intencionais em relação ao Figma

- Login e cadastro são diálogos sobre a página atual (no Figma, telas inteiras), para o usuário voltar ao mesmo ponto depois de entrar.
- As contagens da barra lateral vêm das facetas da API, não dos números fixos do frame.
- O card "NFT em destaque" mostra o NFT destacado mais caro da API.
- No pagamento mobile, "Dados do colecionador" fica num bloco recolhível: o frame não tem os campos, mas o enunciado exige validar os dados do colecionador.
- Os pontos dos carrosséis só aparecem quando há mais de uma página para rolar.
- No catálogo mobile a coluna da direita é deslocada só visualmente (`transform`), para a ordem de leitura e de teclado seguir a listagem.
- O Lighthouse reporta uma categoria extra no v13 (`agentic-browsing`, 50), fora das metas do desafio.
- `vercel.json` (fallback de SPA) não foi exercitado em ambiente publicado.
