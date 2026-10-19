# JUNGLE GAMING — PLANO DE EXECUÇÃO E ARQUITETURA

**Desafio:** Frontend — NFT Marketplace  
**Candidato:** Cauã Moreira Martins  
**Data de referência:** 19/10/2026  
**Meta de entrega:** terça, 20/10/2026, até 22h BRT (margem de segurança; e-mail recebido em 19/10 às 07h11 prevê 2 dias)  
**Fonte da verdade:** https://github.com/junglegaming/frontend-challenge/blob/main/README.md  
**Figma:** https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1  
**Entrega indicada no e-mail:** https://entrevistas.45-55-130-35.sslip.io/testes/front-remoto

> IMPORTANTE: este documento é o plano de execução, NÃO substitui o README da empresa. Antes de codificar, leia o README original integralmente e confira eventuais mudanças. A conexão Figma usada na pesquisa não conseguiu inspecionar os nós por falta de permissão. Não invente cores, frames, espaçamentos ou assets: obtenha acesso às telas por Figma/web ou screenshots fornecidas pelo Cauã. Se não tiver acesso, registre o bloqueio e implemente o que for possível sem alegar fidelidade validada.

## 1. Objetivo em uma frase

Criar um marketplace de NFTs em React + TypeScript fiel ao Figma, com fluxo completo de descoberta → carrinho → checkout → pedido confirmado/recusado, autenticação e conta simuladas, API REST mockada por MSW, eventos reais via `socket.io-client` interceptados pelo MSW, testes Playwright executáveis, auditorias Lighthouse e deploy público validado.

**Fora do escopo:** blockchain real, wallet extension real, pagamento real, backend remoto, páginas editoriais/suporte/atividade/ofertas/downloads. A compra deve ser **simulada, mas não falsamente aprovada na UI**: confirmação só após a API mock confirmar o pedido.

## 2. Critérios e prioridade

- Visual/responsividade: 20 pts; fluxos/UX: 20; integração/estado: 15; tempo real: 10; mocking: 10; testes: 10; acessibilidade: 5; Lighthouse: 5; arquitetura/docs: 5.
- **Eliminatórios:** faltar uma tecnologia obrigatória em uso efetivo; telas apenas visuais nos fluxos principais; exibir compra confirmada sem resposta da simulação; vazamento de dados entre usuários; simular Socket.IO por setters/chamadas diretas na UI; não ter testes E2E executáveis.
- **Prioridade real:** evitar eliminatórios primeiro; depois fechar ciclo de compra/conta, alcançar Figma/responsividade e finalizar evidências de testes e performance.
- Não adicionar tecnologias extras só por sofisticação. Não usar serviços pagos. Não criar dependências de backend externo/segredos privados.

## 3. Stack obrigatória — todas devem participar efetivamente

| Camada | Escolha |
|---|---|
| Build e app | Vite + React + TypeScript `strict` |
| Rotas | TanStack Router (rotas, busca na URL, proteção de páginas) |
| Dados remotos | TanStack Query (`useQuery`, `useMutation`, cache, invalidação/rollback) |
| HTTP | Axios em `api/http.ts`; nada de fetch de negócio fora da camada HTTP |
| REST simulado | MSW (`http`, `HttpResponse`, `setupWorker`) |
| Tempo real | `socket.io-client` + eventos mockados via MSW e `@mswjs/socket.io-binding` |
| Visual | Tailwind CSS + componentes shadcn/ui adaptados ao Figma |
| E2E e regressão | Playwright (`chromium` desktop/mobile, snapshots versionados) |
| Auditoria | Lighthouse no build de produção (mobile/desktop) |
| Cálculos ETH | Biblioteca decimal, como `decimal.js`; valores trafegam como strings |
| Validação | Zod opcional e recomendado para contratos/formulários |
| Formulários | React Hook Form opcional; evitar abstrações extras desnecessárias |

**Risco técnico de Socket.IO:** o README do `@mswjs/socket.io-binding` indica suporte ao namespace padrão e eventos de texto; não dá suporte a namespaces personalizados, acknowledgments ou binários. Fixar bibliotecas compatíveis no lockfile e provar com um teste Playwright que a conexão passou de verdade por `socket.io-client` e pelo mock MSW; não alegar cumprimento enquanto isso não estiver funcionando.

## 4. Telas e rotas

| Rota sugerida | Tela | Aceite indispensável |
|---|---|---|
| `/` | Home | Destaques, catálogo, pesquisa, filtros combináveis, ordem, paginação, estados vazios/erro/loading; estado na URL |
| `/nft/$nftId` | Detalhes | Galeria, edição, quantidade, limite, favorito, carrinho, recurso inexistente |
| `/cart` | Carrinho | Adicionar/alterar/remover, cupom, subtotal/desconto/gas/total, persistência, mudanças live |
| `/checkout` | Pagamento | Login obrigatório, dados, carteira/rede, revisão, revalidação, idempotência, pending/rejected |
| `/orders/$orderId` | Confirmação | Só mostrar recibo se API informar confirmação; snapshot imutável, refresh e consulta |
| `/login` | Login | Autenticação MSW, erros, retorno para `redirect` seguro |
| `/register` | Cadastro | Validação, conflito, login posterior |
| `/profile` | Perfil | Usuário atual, avatar, edição, alteração de senha, persistência, erros |
| `/wallets` | Carteiras | Wallet principal/secundária, rede, criação e edição, validação |
| `*` | Not found | Página 404 e navegação de volta |

Telas de confirmação, perfil e carteiras devem funcionar em mobile mesmo sem frame mobile explícito no Figma. Sem links falsos nem cliques silenciosos. Páginas não solicitadas não precisam ser implementadas.

## 5. Estrutura de diretórios recomendada

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
    query-client.ts
  routes/
    __root.tsx
    index.tsx
    nft.$nftId.tsx
    cart.tsx
    checkout.tsx
    orders.$orderId.tsx
    login.tsx
    register.tsx
    profile.tsx
    wallets.tsx
  components/
    ui/                    # shadcn/ui, temas do Figma
    layout/                # header, footer, mobile nav
    feedback/              # skeleton shimmer, error/empty, toast, modal
  features/
    catalog/               # filtros, queries, grid/cards
    nft/                   # galeria, favoritos, detalhe
    cart/                  # itens, cupom, totais
    checkout/              # wizard, cotação, pedidos
    auth/                  # sessão, guards, formulários
    account/               # perfil e carteiras
    realtime/              # conectar, reconectar, reconciliar, cleanup
  api/
    http.ts                # Axios único
    contracts.ts           # DTOs e validações
    endpoints.ts           # funções por recurso
    query-keys.ts          # chaves com usuário + parâmetros
  domain/
    money.ts               # Decimal/ETH (strings)
    order.ts               # máquina de estados + idempotência
    errors.ts
  mocks/
    browser.ts             # worker MSW
    handlers/
      auth.ts
      catalog.ts
      cart.ts
      quotes.ts
      orders.ts
      account.ts
    store/                  # estado central + persistência
    fixtures/               # NFTs, usuários fake, cenários
    scenarios.ts            # reset/set/delay/error/event injection
    socket.ts               # protocolo Socket.IO no MSW
  test-utils/
    selectors.ts
    fixtures.ts
public/
  mockServiceWorker.js
  assets/                   # preferir arquivos/export Figma
  ...
e2e/
  catalog.spec.ts
  auth.spec.ts
  cart.spec.ts
  checkout.spec.ts
  realtime.spec.ts
  account.spec.ts
  accessibility.spec.ts
  visual.spec.ts
  fixtures.ts
lighthouse/
  config.*
  scripts/
README.md
ARCHITECTURE.md
package.json
pnpm-lock.yaml
vercel.json
```

**Princípio:** UI não conhece fixtures de mocks nem chama diretamente funções de negócio do store fake. UI → hooks (TanStack Query) → API (Axios) → rede interceptada por MSW → repositório mock. Eventos: MSW Socket.IO → `socket.io-client` → feature realtime → invalidação/atualização Query e feedback. `useState` local só para estado visual/temporário.

## 6. Modelo de dados (contratos TypeScript)

```ts
type DecimalString = string;
type Edition = { id: string; nftId: string; stock: number; maxPerBuyer: number };
type Nft = {
  id: string; slug: string; title: string; creator: string;
  category: string; chain: string; imageUrls: string[];
  priceEth: DecimalString; edition: Edition; version: number;
  featured: boolean; available: boolean;
};
type CartLine = { nftId: string; editionId: string; quantity: number };
type Cart = { userId?: string; lines: CartLine[]; version: number };
type Quote = {
  quoteId: string; cartVersion: number; expiresAt: string;
  subtotalEth: DecimalString; discountEth: DecimalString;
  networkFeeEth: DecimalString; totalEth: DecimalString;
  itemSnapshots: Array<{ nftId: string; editionId: string; quantity: number; unitPriceEth: DecimalString; nftVersion: number }>;
};
type OrderStatus = 'pending' | 'confirmed' | 'rejected';
type Order = {
  id: string; userId: string; idempotencyKey: string;
  status: OrderStatus; quoteId: string; createdAt: string;
  txReference?: string; receiptSnapshot?: Quote;
};
type DomainEvent = {
  eventId: string; entityId: string; version: number;
  userId?: string; payload: unknown;
};
```

Usar tipos reais nos contratos e Zod para validar payloads e respostas críticas. **ETH nunca convertido para `number`/float no cálculo**; persistir e trafegar decimal como string; `decimal.js` faz operações. Quantidade é inteira positiva com limite do estoque/edição.

## 7. Contratos REST (MSW)

| Método | Endpoint | Contrato essencial |
|---|---|---|
| POST | `/api/auth/register` | Dados, conflito `409`, validação `422` |
| POST | `/api/auth/login` | Credenciais demo, sessão simulada |
| GET | `/api/auth/session` | Usuário atual/expiração, `401` |
| POST | `/api/auth/logout` | Revoga sessão fake |
| GET | `/api/nfts` | `q`, filtros repetíveis, `sort`, `page`, `pageSize`; envelope `{items, page, total}` |
| GET | `/api/nfts/:id` | Detalhe ou `404` |
| GET/POST/DELETE | `/api/favorites` e `/api/favorites/:id` | Favoritos por usuário |
| GET/POST/PATCH/DELETE | `/api/cart` e `/api/cart/items/:key` | Carrinho, estoque e merge do visitante |
| POST | `/api/quotes` | Cupom, revalidação, taxas e totais; `409` se desatualizado |
| POST | `/api/orders` | Header `Idempotency-Key`, compra `pending`, possível timeout recuperável |
| GET | `/api/orders/:id` | `pending`/`confirmed`/`rejected`, ownership e recibo |
| GET/PATCH | `/api/profile` | Perfil/alteração de senha/avatar com erros |
| GET/POST/PATCH | `/api/wallets` e `/api/wallets/:id` | Wallet principal/secundária, validação |
| POST | `/__demo/reset` | Restaura cenário determinístico, apenas em modo de demonstração |
| POST | `/__demo/scenario` | Seleciona latência, falhas e eventos, somente modo demo |

Os nomes das rotas podem mudar, desde que estejam documentados e sejam REST coerente. Erros padronizados: `{ code, message, fieldErrors?, requestId? }` e HTTP 400/401/403/404/409/422/500/503. Todos os dados precisam ser isolados por `userId` no store, nas consultas, nas mutations, na cache e nos listeners de eventos.

### Autenticação demo
- Dois usuários fictícios (ex.: `demo1@example.test`, `demo2@example.test`) com instruções no README.
- Não manter **senhas em claro** no store/browser; usar verificadores hash com salt de forma compatível com simulação, e documentar que não se trata de backend seguro.
- Sessão persistente para refresh, expiração simulável, navegação para `redirect` após login. Proteger checkout, pedidos, favoritos, perfil e carteiras.
- Ao deslogar/trocar usuário: cancelar queries, `queryClient.clear()` ou limpeza segmentada segura, desconectar socket e cancelar listeners, limpar dados privados, conectar nova sessão.

### Catálogo/URL
- TanStack Router: parâmetros `q`, `category`, `chain`, `sort`, `page`, `pageSize` validados por esquema; links são compartilháveis, back/forward e refresh preservam estado.
- TanStack Query key deve incluir todos filtros e usuário quando for dado privado.
- Cancelar requests com `AbortSignal` transmitido ao Axios; proteger UI de resposta fora de ordem; resetar página ao mudar filtro.

### Carrinho e cotação
- Carrinho do visitante persistido no mock local; no login, merge com regras de estoque, sem perder itens, e feedback de conflitos.
- A resposta REST é fonte da verdade para preços, descontos, taxas e disponibilidade. Não somar valores diretamente com float no frontend.
- Se `nft.updated` alterar preço/estoque, atualizar cache ou invalidar queries de detalhe/listagem/carrinho/quote, mostrar aviso e exigir cotação nova.
- Cupom inválido/expirado e alteração do carrinho mostram mensagens claras.

### Idempotência e checkout
- Clique no comprar gera **uma** `idempotencyKey` estável para a tentativa; bloquear clique duplo.
- Mock armazena mapa `idempotencyKey -> hash do payload, orderId`; repetir a mesma chave + payload retorna o MESMO pedido; chave igual com payload diferente retorna `409`.
- Em timeout após criar pedido, consultar por chave/identificador e recuperar o pedido, nunca criar outro silenciosamente.
- Pedido começa `pending`, caminha para `confirmed` ou `rejected` via estado MSW, com evento Socket.IO. `confirmed/rejected` são terminais; não regredir.
- Pedido só sai da etapa final quando a API confirmar. Recibo conserva snapshot de quantidade/preço/desconto/taxa da transação; mudanças posteriores no catálogo não alteram recibo.
- Falha/recusa/expiração preserva o carrinho. Sucesso remove apenas as quantidades efetivamente compradas.

## 8. Socket.IO + MSW: implementação verificável

- Instalar `socket.io-client` e `@mswjs/socket.io-binding`. Ler exemplos oficiais do pacote antes de usar: https://github.com/mswjs/socket.io-binding .
- Garantir que o `socket.io-client` realmente abra transporte WebSocket interceptado pelo MSW. Usar namespace padrão e eventos de texto (limitações conhecidas do binding).
- MSW emite `nft.updated` e `order.updated`, contendo `eventId`, ID estável, `version`, payload e `userId` para eventos privados.
- Realtime feature mantém `lastAppliedVersion` por recurso; descarta eventos duplicados/antigos, e verifica `userId` da sessão atual.
- Na reconexão, revalidar dados relevantes pela REST usando Query; nunca confiar exclusivamente nos eventos.
- Ao sair de telas, logout ou mudança de usuário, limpar listeners e subscriptions.
- **Prova exigida:** teste E2E dispara mudança de preço **pelo cenário MSW**, confere atualização visível e bloqueio do checkout; depois repete/desordena evento para mostrar que o estado não regride. Deve envolver `socket.io-client`, não chamadas diretas a `setState`.

## 9. Mocking reproduzível e painéis de cenário

Fixture determinística com catálogo suficiente para busca, categorias e paginação; pelo menos 2 usuários fictícios, carteiras, carrinhos, favoritos, cupons e pedidos. Estado MSW persistente em armazenamento local para refresh; reset total por cenário, incluindo caches quando necessário.

Cenários identificados por nomes estáveis, testáveis sem acoplar hooks a fixtures:

1. `happy-path`
2. `empty-results`
3. `slow-network`
4. `out-of-order-results`
5. `offline` / `timeout` / `http-4xx` / `http-5xx`
6. `expired-session`
7. `registration-conflict`
8. `invalid-coupon` / `expired-coupon`
9. `price-changed` / `edition-sold-out`
10. `post-create-order-timeout` (pedido criado + timeout + mesma chave)
11. `payment-rejected`
12. `payment-confirmed`
13. `duplicate-events` / `stale-events`
14. `disconnect-pending-order` / `reconnect-pending-order`

Documentar como selecionar e resetar cenários em ambiente dev **e no deploy**. Pode ser uma pequena área de demonstração (sem interferir no Figma) ou parâmetros controlados; sem endpoints reais sensíveis. Usar relógio e delays controláveis para testes.

## 10. Figma, responsividade e UX

**Antes de implementar o layout:** listar frames desktop/mobile, criar checklist por frame, registrar tipografia, tokens de cor, grid, spacing, estados e assets. Extrair imagens do arquivo original se permitido. Não substituir por imagens aleatórias sem registrar o desvio.

- Layout e identidade definidos pelo Figma, não pela preferência pessoal do candidato. shadcn/ui deve ser customizado conforme Figma.
- Testar larguras **390, 768 e 1440px**; sem overflow horizontal nem conteúdo escondido com zoom.
- Skeleton shimmer no catálogo, detalhes e resumo do carrinho, mantendo dimensões para evitar layout shift; `prefers-reduced-motion` deve desligar o movimento.
- Forms com labels associadas, erros claros e acessíveis, `aria-live` para feedback relevante; teclado funcional, foco visível e focus trap em dialogs/drawers; alt nas imagens, contraste adequado.
- Links auxiliares sem funcionalidade pedida não devem fingir sucesso. Preferir desabilitar/rotular como não disponível a criar um falso sucesso.

## 11. Testes Playwright: matriz mínima do README

Criar fixtures Playwright que selecionam cenário e resetam store antes de cada teste; evitar estado compartilhado; controlar relógio, latência e disparo de eventos.

| ID | E2E obrigatório | Evidência |
|---|---|---|
| E01 | Busca, filtros combinados, ordenação, paginação, URL/back/refresh | Query REST correta e URL mantida |
| E02 | Detalhe direto e NFT inexistente | 200 vs 404 acessível |
| E03 | Cadastro, login, expiração, logout e troca de conta | dados privados isolados |
| E04 | Favoritos com erro de mutation e rollback | UI corrige após falha |
| E05 | Carrinho, limites, cupom e persistência em refresh/login | store e UI consistentes |
| E06 | Compra completa do catálogo ao recibo | confirmação só via API |
| E07 | Recusa, clique duplo, timeout pós-criação | único pedido por chave |
| E08 | Perfil, avatar, senha e carteiras | validações e persistência |
| E09 | Mudança de preço/estoque por Socket.IO no checkout | cotação antiga bloqueada |
| E10 | Evento duplicado/antigo e reconexão de pedido pendente | sem regressão/duplicação |
| E11 | Navegação por teclado e foco; erros em formulário | acessibilidade funcional |
| E12 | Skeleton, falha e recuperação por retry | estados confiáveis |

**Configuração:** Chromium desktop e mobile (ao menos 390px e 1440px); testes visuais snapshot versionados para Home, Detalhe, Carrinho, Checkout; estáveis com dados e fontes determinísticos. Incluir HTML report, traces de falhas e comando reproduzível. Se um teste falhar, corrigir o produto, não simplesmente remover o teste.

## 12. Lighthouse

- Auditar **Home e Detalhes**, tanto **mobile quanto desktop**, no **build otimizado**, com cenário padrão e assets reais.
- Rodar **3 vezes** por página/perfil, registrar **mediana** para Performance ≥90, Acessibilidade ≥95, Boas Práticas ≥95, SEO ≥90.
- Guardar relatórios HTML/JSON; anotar versões, máquina/ambiente, LCP, CLS e TBT. Se meta não atingida, registrar causas e ações, sem mascarar valores nem simplificar o app só para subir pontuação.
- Foco em imagens otimizadas, fontes carregadas localmente, bundles, lazy loading, tamanhos fixos e `aria`/semântica.

## 13. Deploy e documentação

- Deploy **obrigatório**; sugerida Vercel ou Netlify. Precisa rodar **sem backend privado** e com MSW ativo também no ambiente publicado.
- Configurar fallback SPA para rotas diretas (`vercel.json` ou equivalente) e testar refresh em `/nft/:id`, `/checkout`, `/orders/:id`.
- Validar que SW MSW carrega em HTTPS, que mock `/api/` funciona e que Socket.IO mock dispara eventos no deploy. Não depender de localhost.
- `README.md` da solução: instalação Node/pnpm, scripts, envs, credenciais fictícias, rotas, cenários e reset, comandos de teste, auditoria, URLs, limitações.
- `ARCHITECTURE.md`: fluxograma textual UI→REST→MSW, contratos, sessão, carrinho, idempotência, Query keys, reconciliação Socket.IO/REST, acessibilidade, decisões do Figma e desvios justificados.
- Scripts recomendados: `dev`, `build`, `preview`, `typecheck`, `lint`, `test:e2e`, `test:e2e:ui`, `lighthouse`.
- Versionar lockfile, mocks, fixtures, test baselines, config e relatórios. Fazer verificação em **checkout limpo** (`pnpm install --frozen-lockfile && pnpm build && pnpm test:e2e`).
- **Não publicar nem enviar entrega final sem OK explícito do Cauã**. Pode preparar Git local, commits e deploy de teste privado quando viável; se deploy público for necessário para avaliação, solicitar aprovação do Cauã antes.

## 14. Execução em etapas (gates)

### Fase 0 — Inspecionar (30–60min; não pular)
- Ler README e Figma; identificar nós, frames, assets e regras. Se Figma indisponível, pedir screenshot/acesso.
- Criar matriz `requisito -> arquivo/rota -> teste -> status` e `TASKS.md` com checkboxes.
- Criar repositório de trabalho próprio (não editar o repositório da Jungle), rodar build inicial e configurar lint/types/Playwright/MSW.
**Gate:** rotas base compilando, worker MSW levantando, screenshots/medidas extraídos do Figma ou bloqueio documentado.

### Fase 1 — Fundação técnica e integração real (3–5h)
- Criar tipagens, store mock, API Axios+MSW, Query, Router, cenário reset, 2 usuários; testar sessão e persistência.
- Criar vertical slice mínimo catalog→detail→cart→checkout→order com API real simulada, antes de detalhar todo visual.
- **Provar cedo** que `socket.io-client` funciona com binding MSW (alto risco): um evento `nft.updated` atualiza UI.
**Gate:** reload mantém sessão/carrinho, API e Socket.IO simulados executam no navegador.

### Fase 2 — Interface e fluxos (6–10h)
- Implementar componentes do Figma, Home/detalhe e responsividade; depois carrinho, login/cadastro, checkout/recibo, perfil/carteiras.
- Hooks usam Axios + TanStack Query; mocks são fonte única de dados.
- Estados loading/error/empty, skeleton, formulários, fluxo visitor→login, dados isolados.
**Gate:** demo manual completa desde catálogo até pedido, com happy path e pagamento recusado.

### Fase 3 — Resiliência e testes (6–9h)
- Idempotência real no mock, timeout pós-criação, revalidação de cotação, merge de carrinho e eventos fora de ordem.
- E2E da tabela (todos executáveis; fazer primeiro happy path/eliminação e ampliar).
- Accessibility e visual tests; testes reais em 390/768/1440.
**Gate:** `typecheck`, `lint`, `build`, `test:e2e` passam, sem todos os erros ocultados.

### Fase 4 — Evidências e entrega (3–5h)
- Deploy com MSW/socket reais simulados, reload nas rotas profundas; Lighthouse 3x por cenário, registrar medianas.
- Gerar README/ARCHITECTURE/relatórios, validar checkout limpo, vídeo/screenshots curtos de evidência se úteis.
- Mostrar ao Cauã URLs, testes e lista honesta de pendências. **Pedir OK antes de publicar/entregar**.
**Gate:** artefatos verificáveis, links funcionando, requisitos e lacunas explicitados.

**Se o tempo apertar:** NÃO ocultar critérios eliminatórios. Cortar polimento não exigido, animações decorativas e features extras. Concentrar em todas as 9 telas com fluxos reais mockados e garantir MSW/Socket.IO/Query/Router/Playwright e deploy. Registrar qualquer lacuna em `ARCHITECTURE.md`. O cronograma é agressivo e não garante cumprir tudo; escalonar riscos cedo.

## 15. Regra de trabalho autônomo para o agente

1. Executar por marcos curtos. A cada marco: `git status`, `typecheck`, `lint`, `build`, teste relacionado, screenshot de 390/1440 se houve UI e resumo de pendências. Commits pequenos.
2. Trabalhar no próprio repo de entrega, não alterar `junglegaming/frontend-challenge` (somente leitura). Não colar segredos ou dados reais. Usar credenciais inventadas `.test`.
3. Manter `TASKS.md` atualizado. Não declarar pronto por aparência nem inventar métricas, testes ou links.
4. Nunca burlar teste removendo asserts ou com `sleep` arbitrário; fixtures determinísticas e traces.
5. Pode usar subagentes de modo paralelo para UI, mocks/API e testes, **com arquivos não sobrepostos**. Agente principal integra continuamente e resolve contratos; evite múltiplos agentes editando o mesmo arquivo.
6. Ao encontrar bloqueio de Figma, incompatibilidade do MSW Socket.IO ou prazo, avisar com evidência e alternativa antes de consumir horas.
7. Cauã deve conseguir explicar o código. No final de cada etapa, gerar 5–8 frases simples explicando o que foi implementado e por quê.
8. Solicitar confirmação do Cauã para publicação pública, envio do formulário, e-mail, alteração de permissões ou gasto.

## 16. Checklist de aceite final

- [ ] Layout validado contra Figma desktop/mobile, com assets locais ou desvios registrados
- [ ] Nove telas e navegação em rotas diretas funcionando
- [ ] TanStack Router, Query, Axios, Tailwind, shadcn/ui, MSW, Socket.IO, Playwright, Lighthouse usados de verdade
- [ ] Busca/filtro/sort/paginação na URL; refresh/back preservam estado
- [ ] Erros/loading/empty/skeletons com shimmer + reduced motion
- [ ] Cadastro/login/logout/sessão/expiração/troca de usuário sem dados cruzados
- [ ] Carrinho/cupom/limites/persistência/merge de visitante
- [ ] Valor ETH sem float; cotação atualizada e revalidada
- [ ] Checkout sem duplo pedido; mesma chave retorna mesmo pedido após timeout
- [ ] Pedido pendente, confirmado e recusado; recibo imutável
- [ ] Socket.IO pelo cliente real e mock MSW; atualização de NFT + pedido; deduplicação/reconexão
- [ ] Cenários e reset determinísticos disponíveis no deploy
- [ ] Playwright E2E executáveis para os 12 grupos; snapshots e traces
- [ ] Lighthouse com 3 medições por página/perfil; medianas, relatórios e métricas
- [ ] A11y, teclado, foco, labels, contraste, zoom e viewports 390/768/1440
- [ ] Deploy público após OK de Cauã, com refresh deep links e mocks funcionando
- [ ] `README.md`, `ARCHITECTURE.md`, lockfile, fixtures, configs e scripts completos
- [ ] Build/teste de clone limpo verificados; resultado reportado sem exageros

---

**Links oficiais:** [desafio](https://github.com/junglegaming/frontend-challenge) · [Figma](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1) · [entrega](https://entrevistas.45-55-130-35.sslip.io/testes/front-remoto) · [binding MSW/Socket.IO](https://github.com/mswjs/socket.io-binding).
