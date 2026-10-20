# NFT Marketplace — desafio Frontend da Jungle Gaming

Implementação do desafio descrito em https://github.com/junglegaming/frontend-challenge/blob/main/README.md. Se algo aqui divergir do enunciado oficial, vale o enunciado.

## Estado atual

Todas as telas do Figma estão implementadas (início, detalhe, carrinho, pagamento, recibo, login e cadastro, perfil, carteiras, atividade e favoritos), em desktop e mobile, sobre mocks MSW com REST e Socket.IO. Testes e medições executados estão em [TASKS.md](TASKS.md); a conferência visual e as divergências em [FIGMA_AUDIT.md](FIGMA_AUDIT.md); decisões técnicas em [ARCHITECTURE.md](ARCHITECTURE.md).

Rotas: `/` e `/mercado` (catálogo, com busca, filtros, ordenação e página na URL), `/nft/:id`, `/carrinho`, `/pagamento`, `/pedido/:orderId`, `/perfil`, `/perfil/carteiras`, `/perfil/atividade`, `/perfil/favoritos`. Login e cadastro abrem em diálogo. `/dev/mocks` é um painel técnico para escolher cenários e ver a atividade do Socket.IO.

Nada foi publicado: não há deploy nem envio à empresa.

## Requisitos

- Node 22.19 ou superior (declarado em `engines`; é o mínimo do Lighthouse 13, e o Vitest 5 pede 22.12)
- pnpm 10 (`corepack enable` resolve a versão pelo campo `packageManager`)

## Começo rápido

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm exec playwright install chromium   # só na primeira vez: baixa o Chromium da versão fixada no lockfile
pnpm dev                                # http://localhost:5173 com os mocks ligados
pnpm test:e2e                           # suíte Playwright completa
```

## Comandos

| Comando | O que faz |
| --- | --- |
| `pnpm install --frozen-lockfile` | Instala as dependências exatamente como no lockfile |
| `pnpm exec playwright install chromium` | Baixa o Chromium do Playwright fixado (uma vez por máquina) |
| `pnpm dev` | Servidor de desenvolvimento com os mocks ligados |
| `pnpm dev:lan` | O mesmo, exposto na rede local para abrir no celular (ver "Testar no celular") |
| `pnpm build` | Verifica tipos e gera `dist/` |
| `pnpm preview` | Serve o build em `http://localhost:4173` |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm test` | Testes de unidade e de API dos mocks (Vitest + MSW em Node) |
| `pnpm test:e2e` | Playwright em Chromium, viewports desktop (1440) e mobile (390). Compila e sobe o preview na porta 4173 sozinho (pare qualquer `pnpm preview` antes) |
| `pnpm lighthouse` | Lighthouse 3x por página e perfil (início e detalhe, mobile e desktop), mediana e metas. Precisa do preview em `http://localhost:4173`; grava `lighthouse/summary.json` e o relatório HTML/JSON da execução mediana de cada combinação (as demais ficam em `lighthouse/runs/`, fora do git) |

O Playwright está fixado em 1.56.1 no lockfile, então `pnpm exec playwright install chromium` baixa sempre o mesmo Chromium (141) com que as baselines visuais foram geradas, e os 8 testes de regressão visual rodam e passam num checkout limpo em Linux. Nenhum teste é pulado. Em macOS ou Windows a rasterização de texto é diferente; rode a suíte na imagem oficial do Playwright (comando não executado neste ambiente, que não tem Docker):

```bash
docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.56.1-noble \
  bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e"
```

Relatório HTML em `playwright-report/` e traces das falhas em `test-results/`.

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

Os dados dos mocks (sessão, carrinho, pedidos, perfil) ficam em `localStorage` (chave `jg-mock-db`) e sobrevivem a refresh. O cenário ativo (falhas, latência, socket bloqueado...) fica em `sessionStorage` (`jg-mock-scenario`): vale para a aba atual, sobrevive a reload e navegação, e uma aba ou sessão nova sempre começa no caminho feliz. Enquanto um cenário está ativo, uma faixa no topo da página mostra o nome dele e o botão **Restaurar condições normais** (que mantém carrinho e pedidos).

Três formas de voltar ao normal:

- o botão da faixa ou de `/dev/mocks` (condições normais, dados preservados);
- **Restaurar tudo** em `/dev/mocks`, ou `POST /__demo/reset` (dados e cenário iniciais);
- abrir qualquer rota com `?mock-reset=1` (por exemplo `/?mock-reset=1`): restaura tudo antes de a aplicação montar e tira o parâmetro da URL.

Cada cenário é selecionado por requisição, também no build publicado:

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

## Testar no celular

O jeito mais fiel é abrir a URL HTTPS publicada. Na rede local: `pnpm dev:lan` e abra no celular o endereço `http://<IP>:5173` mostrado no terminal. Fora de HTTPS e de localhost o navegador não registra o service worker; o MSW passa a interceptar dentro da página e catálogo, conta, carrinho e compra funcionam (o recibo conclui pela consulta REST). O tempo real simulado fica desligado nesse modo, porque o MSW 2.15 não intercepta WebSocket sem service worker, e uma faixa no topo avisa isso. Se a inicialização falhar por qualquer outro motivo, a página mostra um aviso com o link para restaurar a demonstração, nunca uma tela em branco.

## Deploy

Ainda não publicado. O `vercel.json` já define instalação pelo lockfile, build, pasta `dist`, fallback de SPA (tudo que não é `assets/` nem `mockServiceWorker.js` cai no `index.html`) e cabeçalhos de cache e segurança.

1. Na Vercel, importe o repositório (o framework Vite é detectado). Nenhuma variável é obrigatória: os mocks já vêm ligados.
2. Depois do deploy, confira na URL HTTPS:
   - abrir direto e dar refresh em `/nft/nft_01`, `/carrinho` e `/perfil/carteiras`;
   - `/mockServiceWorker.js` responde JavaScript, não o `index.html`;
   - `/dev/mocks` mostra `connected` no log do Socket.IO;
   - uma compra completa com `demo1@example.test` chega ao recibo confirmado.

Pela CLI: `pnpm dlx vercel` (pré-visualização) e `pnpm dlx vercel --prod`.

## Estrutura

```text
src/
  api/        contratos (Zod), cliente Axios, endpoints, chaves de query
  domain/     dinheiro (decimal.js), máquina de estados do pedido, erros
  components/ layout, UI base (padrão shadcn/ui sobre Radix, ver components.json) e componentes de NFT
  features/   catálogo, NFT, carrinho, checkout, pedidos, conta, auth, favoritos, tempo real, painel técnico
  mocks/      store, fixtures, handlers MSW, cenários, socket
  app/        providers, roteador, layout
e2e/          testes Playwright (e baselines visuais)
scripts/      Lighthouse
```

Documentação de contratos, sessão, cache e tempo real: [ARCHITECTURE.md](ARCHITECTURE.md).
