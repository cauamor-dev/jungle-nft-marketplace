# Kurio, marketplace de NFTs

**App publicado:** https://jungle-nft-marketplace-six.vercel.app

Minha solução para o [desafio de frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge/blob/main/README.md): um marketplace de NFTs em React com catálogo, detalhe, carrinho, checkout com carteira, recibo, conta e atualização em tempo real. Não existe backend nem blockchain. Toda a API REST e o Socket.IO são simulados no navegador com MSW, e os dados ficam salvos no próprio navegador.

Telas: início e mercado (`/`, `/mercado`), detalhe (`/nft/:id`), carrinho, pagamento, recibo (`/pedido/:id`), perfil, carteiras, atividade e favoritos (`/perfil/*`), artigos do Diário da Cunhagem (`/aprenda/:slug`) e ajuda (`/ajuda`). Login e cadastro abrem em diálogo sobre a página atual. Em `/dev/mocks` fica um painel técnico para trocar cenários e ver os eventos do socket.

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

Os contratos REST e os eventos Socket.IO, a política de sessão, o estado do carrinho, a estratégia de cache, a reconciliação entre REST e socket, as decisões de UX, os desvios do Figma e as limitações estão no [ARCHITECTURE.md](ARCHITECTURE.md).

Em resumo:

- A interface só conversa com hooks do TanStack Query e com `src/api/endpoints.ts`. Só `src/mocks` sabe que a API é simulada.
- Respostas validadas com Zod, dinheiro como string decimal e totais sempre calculados pela API.
- Dados privados ficam no cache sob o dono (usuário ou visitante) e são apagados de uma vez no logout, na troca de conta e na sessão expirada.
- Pedido com `Idempotency-Key` e cotação congelada: clique repetido ou resposta perdida não geram pedido duplicado.
- Socket com `eventId` e `version`, descartando evento repetido ou atrasado. A API REST é a fonte da verdade e é consultada de novo depois de uma queda.

## Testes e qualidade

- **Vitest** testa dinheiro, contratos e a API simulada: cadastro concorrente, idempotência, cotação vencida ou desatualizada, estoque e migração dos dados salvos.
- **Playwright** testa só pela interface e pela rede, em desktop e mobile. Cobre a jornada completa de uma conta nova (cadastro, perfil, compra, histórico, logout e login), o isolamento entre contas, todos os cenários de falha acima, corridas entre sessões, teclado e foco, alvos de toque de 44 px em 320 e 390 px, ausência de rolagem lateral em 390, 768 e 1440 px e CLS do pagamento. `e2e/interactions.spec.ts` clica como uma pessoa e confere o resultado na tela e depois do reload: favoritar no card, no detalhe e na lista, posição da rolagem ao filtrar, busca ao vivo, edição e preço até o carrinho, links do rodapé, blog e ajuda.
- **Regressão visual** de início, detalhe, carrinho e pagamento, com tolerância de 0,05% dos pixels. As referências foram geradas na imagem oficial do Playwright (`mcr.microsoft.com/playwright:v1.56.1-noble`). As flags de fonte no `playwright.config.ts` fazem outro Linux renderizar igual. Em macOS ou Windows, rode pelo Docker:

  ```bash
  docker run --rm --ipc=host -v "$PWD":/work -v /work/node_modules -w /work mcr.microsoft.com/playwright:v1.56.1-noble \
    bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e"
  ```

Lighthouse 13 no build de produção (com os mocks ligados), mediana de 3 execuções. O perfil mobile é o padrão do Lighthouse: aparelho intermediário, 4G lento e CPU 4x mais lenta. O detalhe de cada execução fica em `lighthouse/summary.json`.

| Página | Perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 97 | 100 | 100 | 100 | 2,2 s | 0 | 149 ms |
| Detalhe | mobile | 96 | 100 | 100 | 100 | 2,6 s | 0 | 14 ms |
| Início | desktop | 100 | 100 | 100 | 100 | 0,6 s | 0,0002 | 0 ms |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 0,7 s | 0 | 0 ms |

Todas as categorias ficaram acima das metas do desafio (Performance 90, Acessibilidade 95, Boas práticas 95, SEO 90). A configuração está em `scripts/lighthouse.mjs`. Os relatórios HTML e JSON da execução mediana de cada página e perfil estão em `lighthouse/`, e o `summary.json` traz as três execuções, as versões e o ambiente. Rodar `pnpm lighthouse` gera também as execuções individuais em `lighthouse/runs/`, que ficam fora do Git.

Para medir a qualidade da entrega, combinei Lighthouse, Playwright e uma revisão assistida por IA focada em acessibilidade, responsividade e casos de borda.

O que eu faria com mais tempo e as limitações conhecidas da demo também estão no [ARCHITECTURE.md](ARCHITECTURE.md#limitações).
