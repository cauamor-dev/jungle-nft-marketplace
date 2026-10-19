# Arquitetura

Este documento descreve o que existe no código hoje. Itens que dependem do Figma (telas, tokens, desvios visuais) estão em "Pendências".

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

ETH trafega como string decimal. `src/domain/money.ts` é o único lugar com `decimal.js` (18 casas, arredondamento para baixo). Quantidades são inteiros. Subtotal, desconto, taxa e total são sempre calculados no mock; o cliente só exibe. Taxa de rede fixa por rede: Ethereum 0,0021, Polygon 0,0003, Arbitrum 0,0005 ETH, cobrada uma vez por pedido.

## Sessão

- Token opaco em `localStorage` (`jg-session-token`), enviado como `Authorization: Bearer`. A sessão do mock dura 2 h.
- `GET /api/auth/session` recupera a sessão após refresh (`useSession`).
- Resposta 401 com `SESSION_EXPIRED` ou `UNAUTHENTICATED` dispara `onSessionInvalid`, que limpa o token e o cache privado.
- Logout, troca de usuário e sessão inválida passam por `resetPrivateState`: cancela e remove todas as queries sob `['private']` e apaga a tentativa de checkout. O `RealtimeProvider` recria o cliente do socket quando o `userId` muda; o anterior desconecta, remove listeners e esquece versões vistas.
- Visitante tem um `X-Guest-Id` (em `localStorage`) que identifica o carrinho anônimo no mock. No login o carrinho é migrado: soma sem passar de `min(estoque, maxPerBuyer)`, o excedente volta em `cartMerge.conflicts`.
- Retomada do checkout após expiração: **pendente** (ver abaixo).

## Cache (TanStack Query)

- `staleTime` de 30 s. Eventos do socket e mutations invalidam antes disso.
- Retry: até 2 vezes, só para falha de rede ou 5xx. 4xx é resposta definitiva. Mutations não repetem sozinhas.
- Chaves: catálogo em `['nfts', ...]` com parâmetros normalizados (arrays ordenados, `page` padrão 1). Dado privado sempre em `['private', dono, ...]`, onde `dono` é `user:<id>` ou `guest:<id>` (`src/api/query-keys.ts`).
- Requisições recebem o `AbortSignal` do Query para descartar respostas obsoletas.
- Atualização otimista com rollback (favoritos): **pendente**, depende da tela de detalhe.

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

- Estado único em `localStorage`, com semente determinística (36 NFTs, 2 usuários, 3 carteiras, 3 cupons, 1 pedido do `demo2`). `resetDb` restaura tudo.
- Toda rota `/api` passa por `route()` (`src/mocks/handlers/route.ts`): falhas do cenário, latência, validação e conversão de `MockHttpError`.
- Latência variável usa um gerador pseudo-aleatório com semente persistida, então a sequência é reproduzível.
- Detalhe que já causou um falso positivo: o handler lê o estado **depois** da latência, então uma requisição em andamento durante `price-changed` responde com o preço novo. Os testes esperam a carga inicial antes de mudar o cenário.

## Decisões

- Rede e rede de carteira: a taxa depende da rede escolhida no checkout, não da rede do NFT. O pedido exige que carteira, cotação e rede escolhida coincidam.
- Estoque só baixa na confirmação, para o carrinho do próprio comprador não ficar "acima do disponível" enquanto o pedido está pendente.
- Imagens de NFT nas fixtures apontam para `/assets/nfts/<slug>-<n>.webp`, caminhos que ainda não existem. Nenhuma imagem foi inventada; os arquivos virão do Figma.
- Textos, nomes e preços das fixtures são fictícios e provisórios.

## Pendências

- Telas, tokens, tipografia e fidelidade visual: bloqueado pelo acesso ao Figma.
- Componentes shadcn/ui: serão adicionados com as telas, já adaptados ao Figma.
- Retomada do checkout após expiração de sessão, favoritos otimistas, URL de busca/filtros e demais fluxos de UI.
- Testes E2E E01 a E12 completos, regressão visual, Lighthouse e deploy: dependem das telas (e o deploy, da autorização do Cauã).
