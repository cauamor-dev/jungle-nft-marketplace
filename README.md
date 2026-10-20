# Kurio, marketplace de NFTs

Minha solução para o [desafio de frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge/blob/main/README.md): um marketplace de NFTs em React com catálogo, detalhe, carrinho, checkout com carteira, recibo, conta e atualização em tempo real. Não existe backend nem blockchain. Toda a API REST e o Socket.IO são simulados no navegador com MSW, e os dados ficam salvos no próprio navegador.

Telas: início e mercado (`/`, `/mercado`), detalhe (`/nft/:id`), carrinho, pagamento, recibo (`/pedido/:id`), perfil, carteiras, atividade e favoritos (`/perfil/*`). Login e cadastro abrem em diálogo sobre a página atual. Em `/dev/mocks` fica um painel técnico para trocar cenários e ver os eventos do socket.

## Como rodar

Precisa de **Node 22.19 ou mais novo** (tem `.nvmrc`; o Lighthouse 13 e o Vitest 5 pedem Node 22) e do pnpm 10, que o `corepack` instala sozinho.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev                                # http://localhost:5173
```

Para os testes de ponta a ponta, baixe o Chromium do Playwright uma vez:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

| Comando | O que faz |
| --- | --- |
| `pnpm dev` | Servidor de desenvolvimento com os mocks ligados |
| `pnpm dev:lan` | O mesmo, aberto na rede local (para testar no celular) |
| `pnpm build` / `pnpm preview` | Build de produção e servidor em `http://localhost:4173` |
| `pnpm typecheck` / `pnpm lint` | TypeScript e ESLint |
| `pnpm test` | Testes de unidade e da API simulada (Vitest + MSW em Node) |
| `pnpm test:e2e` | Playwright em desktop (1440 px) e mobile (390 px). Faz o build e sobe o preview na porta 4173 sozinho |
| `pnpm lighthouse` | Lighthouse 3 vezes por página e perfil, com a mediana em `lighthouse/summary.json`. Precisa do preview rodando |

A única variável é `VITE_ENABLE_MOCKS` (padrão `true`). Com `false` o MSW não sobe, e sem backend real o app fica sem dados.

### Contas de teste

| Usuário | E-mail | Senha |
| --- | --- | --- |
| Marina Duarte | `demo1@example.test` | `Demo@1234` |
| Rafael Torres | `demo2@example.test` | `Demo@1234` |

Dá para criar uma conta nova no cadastro. Ela já entra logada e tem perfil, carteiras, favoritos, carrinho e pedidos próprios, que continuam lá depois de recarregar a página ou sair e entrar de novo. Cupons: `JUNGLE10` (10%), `BEMVINDO` (0,01 ETH) e `EXPIRADO20` (vencido).

Login com Google ou Facebook e recuperação de senha não fazem parte da demo. Os botões existem porque estão no layout, e ao clicar avisam isso, em vez de fingir que funcionou.

## Cenários e reset

Os dados (contas, carrinho, pedidos) ficam no `localStorage` (`jg-mock-db`). O cenário ativo, como latência, falha de rede ou socket derrubado, fica no `sessionStorage`. Ele vale só para a aba atual e sobrevive a reload, e uma aba nova sempre começa normal. Enquanto um cenário está ativo, uma faixa no topo mostra qual é e tem o botão **Restaurar condições normais**.

Para voltar ao estado inicial:

- **Restaurar condições normais**: na faixa ou em `/dev/mocks`. Mantém os dados.
- **Restaurar tudo**: em `/dev/mocks`, ou com `POST /__demo/reset`. Volta dados e cenário ao início.
- `?mock-reset=1` em qualquer rota (ex.: `/?mock-reset=1`): faz o reset completo antes de o app montar.

Os cenários podem ser escolhidos no painel ou pelo console, também no build publicado:

```js
await fetch('/__demo/scenario', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'price-changed', params: { nftId: 'nft_01', priceEth: '0.5' } }),
})
```

| Cenário | Efeito |
| --- | --- |
| `happy-path` | Volta ao padrão (latência de 30 a 120 ms) |
| `empty-results` | Catálogo vazio |
| `slow-network` / `variable-latency` | Latência fixa (`params.ms`, padrão 2500) ou variável de 100 a 1500 ms |
| `out-of-order-results` | Respostas do catálogo chegam fora de ordem |
| `offline`, `timeout`, `http-4xx`, `http-5xx` | Falha de rede, requisição que nunca responde ou erro HTTP. Aceitam `params.match` (ex.: `"POST /api/favorites"`), `params.remaining` e `params.status` |
| `expired-session` | Expira as sessões abertas |
| `registration-conflict` | Todo cadastro responde 409 |
| `wallet-refused` | A carteira recusa a conexão |
| `expired-coupon` | `JUNGLE10` vence |
| `price-changed` / `edition-sold-out` | Muda o preço ou esgota uma edição e avisa pelo socket |
| `post-create-order-timeout` | O próximo pedido é criado, mas a resposta nunca chega |
| `payment-confirmed` / `payment-rejected` | Resultado do pagamento simulado |
| `duplicate-events` / `stale-events` | Reenvia o último evento ou uma versão antiga dele |
| `disconnect-pending-order` / `reconnect-pending-order` | Derruba o socket e depois libera a reconexão |

Alguns fluxos de falha para testar na mão:

- **Resposta perdida no pedido**: ative `post-create-order-timeout` e finalize a compra. O app reenvia com a mesma chave de idempotência e acha o pedido que já existia, sem criar outro.
- **Preço mudou no meio do checkout**: com a página de pagamento aberta, rode `price-changed` para o NFT do carrinho. O app mostra o valor antigo e o novo e só deixa pagar depois de aceitar.
- **Socket caiu com pedido pendente**: faça o pedido, ative `disconnect-pending-order` e depois `reconnect-pending-order`. O recibo se acerta pela API REST.

## Arquitetura e decisões

**Stack.** React 19 com TypeScript estrito e Vite 8. TanStack Router para as rotas e TanStack Query para o estado do servidor. Axios com respostas validadas por Zod, MSW 2 com `@mswjs/socket.io-binding` e `socket.io-client`, Tailwind 4 com componentes no padrão do shadcn/ui (Radix), `decimal.js` para dinheiro, Vitest e Playwright.

**A interface não sabe que existe mock.** Os componentes falam com hooks do TanStack Query, que chamam `src/api/endpoints.ts`. Só `src/mocks` conhece os dados. Trocar o MSW por uma API de verdade não muda nada fora de `src/mocks`. Os contratos ficam em `src/api/contracts.ts`, e os tipos saem dos schemas.

**O MSW sobe antes do app.** O `socket.io-client` guarda a referência de `WebSocket` no momento do import. Por isso o `main.tsx` ativa os mocks e só depois importa a aplicação. O custo é um carregamento inicial em duas etapas, que pesa no Lighthouse mobile. Para compensar, troquei o `tough-cookie` que o MSW importa (cerca de 340 kB que os mocks não usam) por um substituto mínimo e separei os chunks de MSW, socket e Radix.

**Dinheiro é string.** ETH circula como string decimal (`"0.0425"`) e só vira `Decimal` dentro de `src/domain/money.ts`. Nada de `Number` ou `parseFloat` em valores. Subtotal, desconto, taxa e total são calculados pela API, e a interface só mostra.

**Dados privados por dono.** Tudo o que é da conta fica em chaves `['private', dono, ...]`, onde o dono é o usuário ou o visitante. Logout, troca de conta e sessão expirada apagam esse prefixo inteiro e recriam o cliente do socket. Uma resposta atrasada da conta anterior é ignorada: um 401 antigo não derruba a sessão nova, e um perfil salvo pela conta anterior não sobrescreve o usuário atual. O carrinho de visitante é juntado ao da conta no login, respeitando estoque e limite por comprador.

**Checkout sem pedido duplicado.** A cotação congela preços e vale 5 minutos. O pedido sai com uma `Idempotency-Key`: mesma chave e mesmo conteúdo devolvem o mesmo pedido. Cliques repetidos dividem a mesma requisição, e se a resposta se perde o app consulta o pedido pela chave antes de reenviar. Se nem a consulta funciona, a compra fica bloqueada até dar para conferir, porque uma cotação nova geraria outra chave e outro pedido. O servidor revalida tudo (preço, estoque, cupom, carrinho) e responde 409 com a cotação nova quando algo mudou. O recibo é uma cópia congelada: editar o perfil ou o preço depois não altera pedidos antigos.

**Tempo real com a REST como fonte da verdade.** Os eventos têm `eventId` e `version`. Evento repetido ou mais antigo que o último aplicado é descartado. Eventos de pedido só vão para o dono. Depois de uma queda, o que foi emitido no meio se perdeu, então o app recarrega da API. O recibo pendente também consulta a API a cada 4 s se o socket estiver fora.

**URL como estado do catálogo.** Busca, filtros, ordenação e página ficam na URL. Valores inválidos são descartados em vez de quebrar a página. A lista anterior continua na tela enquanto a próxima carrega.

**Trade-offs que escolhi:**

- Login e cadastro em diálogo, e não em tela cheia como no Figma, para o usuário voltar ao mesmo ponto depois de entrar.
- O estoque só baixa quando o pagamento confirma. Assim o carrinho do próprio comprador não fica "acima do disponível" enquanto o pedido está pendente.
- Uma variante de layout por vez (mobile abaixo de 768 px, desktop acima), em vez de esconder com CSS e ter tudo duplicado no DOM.
- "Ver no Etherscan" abre um explorador simulado com o hash que a API devolveu, já que não existe transação real para linkar.
- O código de indicação do pagamento é opcional. No layout ele é obrigatório, mas uma conta nova não teria de onde tirar um código.

### Estrutura

```text
src/
  api/        contratos (Zod), cliente Axios, endpoints, chaves de cache
  domain/     dinheiro, estados do pedido, erros
  components/ layout, UI base e componentes de NFT
  features/   catálogo, NFT, carrinho, checkout, pedidos, conta, auth, favoritos, tempo real, painel dos mocks
  mocks/      banco local, fixtures, handlers, cenários e socket
  app/        providers, rotas e layout
e2e/          testes Playwright e referências visuais
scripts/      Lighthouse
```

## Testes e qualidade

- **Vitest** testa dinheiro, contratos e a API simulada: cadastro concorrente, idempotência, cotação vencida ou desatualizada, estoque e migração dos dados salvos.
- **Playwright** testa só pela interface e pela rede, em desktop e mobile. Cobre a jornada completa de uma conta nova (cadastro, perfil, compra, histórico, logout e login), o isolamento entre contas, todos os cenários de falha acima, corridas entre sessões, teclado e foco, alvos de toque de 44 px em 320 e 390 px, ausência de rolagem lateral em 390, 768 e 1440 px e CLS do pagamento.
- **Regressão visual** de início, detalhe, carrinho e pagamento, com tolerância de 0,05% dos pixels. As referências foram geradas na imagem oficial do Playwright (`mcr.microsoft.com/playwright:v1.56.1-noble`). As flags de fonte no `playwright.config.ts` fazem outro Linux renderizar igual. Em macOS ou Windows, rode pelo Docker:

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.56.1-noble \
    bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e"
  ```

Lighthouse 13 no build de produção (com os mocks ligados), mediana de 3 execuções. O perfil mobile é o padrão do Lighthouse: aparelho intermediário, 4G lento e CPU 4x mais lenta. O detalhe de cada execução fica em `lighthouse/summary.json`.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 98 | 100 | 100 | 100 | 1,9 s | 0 |
| Detalhe | mobile | 98 | 100 | 100 | 100 | 2,3 s | 0 |
| Início | desktop | 100 | 100 | 100 | 100 | 0,6 s | 0,0002 |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 0,7 s | 0 |

Para medir a qualidade da entrega, combinei Lighthouse, Playwright e uma revisão assistida por IA focada em acessibilidade, responsividade e casos de borda.

## O que eu faria com mais tempo

- Sincronizar abas com `BroadcastChannel`: logout e troca de conta em uma aba refletindo nas outras, e uma trava para duas abas não sobrescreverem o banco local uma da outra.
- Retomar a ação depois do login. Hoje, favoritar como visitante abre o login, mas o usuário precisa clicar de novo depois de entrar.
- Trocar o carregamento em duas etapas (MSW e depois app) por um service worker pré-registrado, para ganhar tempo na primeira visita no celular.
- Testes de acessibilidade automatizados com axe em todas as telas, além das verificações que já existem.
- Telas de perfil e carteiras desenhadas para mobile. O Figma não tem esses frames, então hoje as abas viram uma faixa rolável e os formulários empilham.

## Limitações conhecidas da demo

- Sem backend: contas, pedidos e estoque vivem no `localStorage` e valem só para aquele navegador.
- As abas não se sincronizam: logout ou troca de conta em uma aba não chega às outras abertas, e duas abas mexendo nos dados ao mesmo tempo podem sobrescrever o banco local uma da outra.
- Senhas são guardadas como hash com salt, o que basta para a simulação, mas não é um backend seguro.
- O binding de Socket.IO do MSW só aceita o namespace padrão e eventos de texto (sem acknowledgments nem binários).
- Aberto por HTTP pelo IP da rede (ex.: `pnpm dev:lan` no celular), o navegador não registra service worker. O app funciona, mas sem o tempo real simulado, e uma faixa avisa isso.
- O `vercel.json` (fallback de SPA e cabeçalhos) está pronto, mas só vai ser exercitado de verdade no deploy.
