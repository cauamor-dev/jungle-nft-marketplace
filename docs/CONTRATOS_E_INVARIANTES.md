# Contratos, invariantes e cenários para implementar

Este documento complementa o plano completo; o README oficial prevalece.

## Entidades e ownership
- `Nft{id,version,priceEth:string,editions:[{id,stock,maxPerBuyer}]}`.
- `Session{sessionId,userId,expiresAt}` e perfil/carteiras/favoritos/pedidos por `userId`.
- `Cart{id,ownerUserId|null,items:[{nftId,editionId,quantity}],version}`.
- `Quote{id,cartVersion,itemsSnapshot,subtotalEth,discountEth,networkFeeEth,totalEth,expiresAt}`.
- `Order{id,userId,idempotencyKey,payloadHash,status:pending|confirmed|rejected,receiptSnapshot}`.
- `DomainEvent{eventId,entityId,version,userId?,payload}`.

## Recursos REST esperados
- Conta/sessão: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/session`, `POST /api/auth/logout`.
- NFTs: `GET /api/nfts?q=&category=&chain=&sort=&page=&pageSize=`, `GET /api/nfts/:id`.
- Favoritos: `GET /api/favorites`, `POST /api/favorites/:id`, `DELETE /api/favorites/:id`.
- Carrinho: `GET /api/cart`, `POST /api/cart/items`, `PATCH /api/cart/items/:itemKey`, `DELETE /api/cart/items/:itemKey`.
- Cotação: `POST /api/quotes` verifica preço, estoque, cupom, rede e taxas atuais.
- Pedidos: `POST /api/orders` + header `Idempotency-Key`; `GET /api/orders/:id`; recuperação segura de tentativa via chave ou identificador definido na arquitetura.
- Conta: `GET/PATCH /api/profile`, endpoint de senha, `GET/POST/PATCH /api/wallets`.
- Dev/demo: cenário/reset seguros, coerentes e reproduzíveis (nunca em produção real).

## Regras que não podem falhar
- `GET /api/nfts` respeita todos os parâmetros; mudança de filtro reinicia page; back/refresh preservam URL.
- State privado isolado; `queryKey` inclui usuário; logout/troca limpa caches, listeners, sessões e pending requests privados.
- Visitante tem carrinho persistido; login faz merge controlado sem ultrapassar estoque; conflitos informados.
- ETH é decimal string; usar operações decimais exatas, não float.
- Pedido só confirma se mock API retornar `confirmed`; recibo usa snapshot de preço/itens/taxas e permanece imutável.
- A mesma idempotency key + mesmo payload sempre retorna o mesmo ID de pedido; mesma chave com payload diferente responde 409.
- Timeout depois de persistir pedido não autoriza segunda compra. Recarregar/reconectar recupera pedido existente.
- `pending -> confirmed | rejected`; estado terminal não regride.
- `nft.updated` e `order.updated` devem passar por `socket.io-client` e protocolo MSW compatível; payloads têm versão/identificador; duplicatas/antigos são ignorados; reconectar consulta REST.
- O mock acompanha HTTP 4xx/5xx, timeout, latência variável, vazio, expiração, erro de cadastro, desconto inválido, preço alterado e desconexão.

## Testes críticos de falha
1. Pedido enviado, servidor cria registro mas simula timeout -> retry com mesma chave recupera mesmo pedido.
2. Carrinho aberto e `nft.updated` modifica preço -> UI avisa e checkout revalida; compra com cotação antiga é bloqueada.
3. `order.updated` repetido e depois evento antigo -> status não regredir.
4. Logout e login como outro usuário -> jamais mostrar perfil, favoritos, pedidos, caches e sockets anteriores.
5. Refresh em rota profunda e no meio de pending -> estado reconstituído.
6. E2E de socket usa conexão real; injetar direto em store ou React não é cobertura válida.
