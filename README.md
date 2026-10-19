# NFT Marketplace — desafio Frontend da Jungle Gaming

Implementação do desafio descrito em https://github.com/junglegaming/frontend-challenge/blob/main/README.md. Se algo aqui divergir do enunciado oficial, vale o enunciado.

## Estado atual

Todas as telas do Figma estão implementadas (início, detalhe, carrinho, pagamento, recibo, login e cadastro, perfil, carteiras, atividade e favoritos), em desktop e mobile, sobre mocks MSW com REST e Socket.IO. Testes e medições executados estão em [TASKS.md](TASKS.md); a conferência visual e as divergências em [FIGMA_AUDIT.md](FIGMA_AUDIT.md); decisões técnicas em [ARCHITECTURE.md](ARCHITECTURE.md).

Rotas: `/` e `/mercado` (catálogo, com busca, filtros, ordenação e página na URL), `/nft/:id`, `/carrinho`, `/pagamento`, `/pedido/:orderId`, `/perfil`, `/perfil/carteiras`, `/perfil/atividade`, `/perfil/favoritos`. Login e cadastro abrem em diálogo. `/dev/mocks` é um painel técnico para escolher cenários e ver a atividade do Socket.IO.

Nada foi publicado: não há deploy nem envio à empresa.

## Requisitos

- Node 22 ou superior
- pnpm 10 (`corepack enable` resolve a versão pelo campo `packageManager`)

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm install` | Instala as dependências a partir do lockfile |
| `pnpm dev` | Servidor de desenvolvimento com os mocks ligados |
| `pnpm build` | Verifica tipos e gera `dist/` |
| `pnpm preview` | Serve o build em `http://localhost:4173` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes de unidade e de API dos mocks (Vitest + MSW em Node) |
| `pnpm test:e2e` | Playwright em Chromium, viewports desktop (1440) e mobile (390). Compila e sobe o preview na porta 4173 sozinho (pare qualquer `pnpm preview` antes) |
| `pnpm lighthouse` | Lighthouse 3x por página e perfil (início e detalhe, mobile e desktop), mediana e metas. Precisa do preview em `http://localhost:4173`; grava em `lighthouse/` |

Na primeira execução do Playwright: `pnpm exec playwright install chromium`.

## Variáveis de ambiente

| Variável | Padrão | Efeito |
| --- | --- | --- |
| `VITE_ENABLE_MOCKS` | `true` | `false` desliga o MSW. O build de demonstração deve manter ligado |

## Credenciais fictícias

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Marina Duarte | `demo1@example.test` | `Demo@1234` |
| Rafael Torres | `demo2@example.test` | `Demo@1234` |

As senhas ficam no store do mock apenas como hash PBKDF2 com salt. Isso serve à simulação e não torna o mock um backend seguro.

Cupons: `JUNGLE10` (10%), `BEMVINDO` (0,01 ETH), `EXPIRADO20` (expirado).

## Cenários e reset

Os mocks guardam o estado em `localStorage` (chave `jg-mock-db`), então sessão, carrinho e pedidos sobrevivem a refresh. Cada cenário é selecionado por requisição, também no build publicado:

```js
// no console do navegador
await fetch('/__demo/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'price-changed', params: { nftId: 'nft_01', priceEth: '0.5' } }),
})

// volta ao estado inicial conhecido (opcionalmente já aplicando um cenário)
await fetch('/__demo/reset', { method: 'POST' })
```

`GET /__demo/state` mostra o cenário ativo, conexões de socket e pedidos pendentes. As rotas `/__demo` não passam pelas falhas simuladas.

| Cenário | Efeito |
| --- | --- |
| `happy-path` | Restaura as configurações padrão (latência variável de 30 a 120 ms) |
| `empty-results` | Catálogo responde vazio |
| `slow-network` | Latência fixa (`params.ms`, padrão 2500) |
| `variable-latency` | Latência de 100 a 1500 ms, sequência determinística |
| `out-of-order-results` | Consultas ímpares ao catálogo demoram mais que as pares, invertendo a ordem das respostas |
| `offline`, `timeout`, `http-4xx`, `http-5xx` | Falha de rede, requisição que nunca responde, ou status 4xx/5xx. Aceitam `params.match` (`"POST /api/favorites"`), `params.remaining` (quantas vezes) e `params.status` |
| `expired-session` | Expira as sessões existentes (401 `SESSION_EXPIRED`) |
| `registration-conflict` | Todo cadastro responde 409 |
| `wallet-refused` | Conexão de carteira é recusada |
| `expired-coupon` | `JUNGLE10` passa a expirado |
| `price-changed` | Muda o preço de um NFT e emite `nft.updated` |
| `edition-sold-out` | Zera o estoque e emite `nft.updated` |
| `post-create-order-timeout` | O próximo `POST /api/orders` cria o pedido e nunca responde |
| `payment-confirmed`, `payment-rejected` | Resultado da simulação de pagamento |
| `duplicate-events`, `stale-events` | Reenvia o último evento (mesmo id) ou uma versão anterior do recurso |
| `disconnect-pending-order`, `reconnect-pending-order` | Derruba e bloqueia o socket; depois libera a reconexão |

### Reproduzindo falhas

- **Timeout após criar o pedido**: ative `post-create-order-timeout`, finalize a compra. O cliente reenvia com a mesma `Idempotency-Key` e recupera o mesmo pedido.
- **Preço mudou durante o checkout**: com um item no carrinho e uma cotação gerada, ative `price-changed` para o mesmo NFT. `POST /api/orders` responde 409 `QUOTE_STALE` com a nova cotação.
- **Queda do socket com pedido pendente**: crie o pedido, ative `disconnect-pending-order`, espere o pedido concluir (1,5 s), ative `reconnect-pending-order`. Depois da reconexão o cliente consulta a REST.

## Estrutura

```text
src/
  api/        contratos (Zod), cliente Axios, endpoints, chaves de query
  domain/     dinheiro (decimal.js), máquina de estados do pedido, erros
  components/ layout, UI base (radix) e componentes de NFT
  features/   catálogo, NFT, carrinho, checkout, pedidos, conta, auth, favoritos, tempo real, painel técnico
  mocks/      store, fixtures, handlers MSW, cenários, socket
  app/        providers, roteador, layout
e2e/          testes Playwright (e baselines visuais)
scripts/      Lighthouse
```

Documentação de contratos, sessão, cache e tempo real: [ARCHITECTURE.md](ARCHITECTURE.md).
