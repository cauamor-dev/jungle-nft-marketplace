# TASKS

Status: `todo`, `doing`, `done`, `blocked`. `done` só com evidência (comando executado ou arquivo).
Branch de trabalho: `cursor/fundacao-tecnica-145e`. Nada foi publicado, enviado à empresa ou implantado.

## Bloqueio atual

**Figma inacessível.** A conta conectada (`caua3595@gmail.com`) tem assento "View" e o MCP responde "you don't have edit access to this file" a `get_metadata`, `get_screenshot`, `get_design_context` e `create_session`. Detalhes e UUIDs de depuração em [FIGMA_AUDIT.md](FIGMA_AUDIT.md).

Consequência: as nove telas, tokens, assets, fidelidade visual, baselines de regressão visual e Lighthouse com layout final ficam `blocked`. Seguindo a instrução do Cauã, nenhuma tela foi implementada. Só o que independe do visual foi feito.

**O que desbloqueia** (decisão do Cauã): duplicar o arquivo para um rascunho próprio com assento de edição e passar a nova URL, ou enviar exportações (PNG/SVG) dos frames e dos assets que ele tem permissão de usar, ou conectar outra conta Figma com acesso.

## Fase 0 — Inspeção

| # | Tarefa | Status | Evidência |
| --- | --- | --- | --- |
| 0.1 | Ler AGENTS.md, START_HERE.md, PROMPT_CURSOR_CLOUD.md, docs/ e README oficial | done | Lidos integralmente |
| 0.2 | Organizar regras em `.cursor/rules/` | done | [.cursor/rules/](.cursor/rules/) (5 arquivos) |
| 0.3 | Acesso ao Figma, frames e assets | blocked | [FIGMA_AUDIT.md](FIGMA_AUDIT.md) |
| 0.4 | Comparar documentação com o README oficial | done | [docs/DIVERGENCIAS_README_OFICIAL.md](docs/DIVERGENCIAS_README_OFICIAL.md) |
| 0.5 | Criar TASKS.md | done | este arquivo |

## Fase 1 — Fundação técnica

| # | Tarefa | Status | Evidência |
| --- | --- | --- | --- |
| 1.1 | Vite + React + TS strict, pnpm, Tailwind, ESLint | done | `pnpm typecheck` e `pnpm lint` sem erros ([log](/opt/cursor/artifacts/verificacao-unidade-build.log)) |
| 1.2 | `pnpm build` | done | Build gerado; aviso do Vite sobre chunks acima de 500 kB (`browser` e `mount`), ainda sem code splitting por rota |
| 1.3 | Contratos tipados com Zod | done | [src/api/contracts.ts](src/api/contracts.ts) |
| 1.4 | Axios, endpoints, chaves de query com dono | done | [src/api](src/api) |
| 1.5 | Dinheiro com decimal.js | done | [src/domain/money.test.ts](src/domain/money.test.ts) (8 testes) |
| 1.6 | MSW: REST de auth, catálogo, favoritos, carrinho, cotação, pedidos, perfil e carteiras | done | `pnpm test`: 5 arquivos, 60 testes passando |
| 1.7 | Cenários determinísticos e reset | done | [src/mocks/scenarios.ts](src/mocks/scenarios.ts); README lista os cenários |
| 1.8 | Idempotência, 409 por payload diferente, timeout pós-criação, cotação desatualizada | done | [src/mocks/checkout.test.ts](src/mocks/checkout.test.ts) |
| 1.9 | Isolamento entre usuários, senha sem texto claro | done | [src/mocks/auth.test.ts](src/mocks/auth.test.ts) |
| 1.10 | **Spike Socket.IO + MSW** | done | [e2e/realtime-transport.spec.ts](e2e/realtime-transport.spec.ts); screenshot [painel-mocks-socket.png](/opt/cursor/artifacts/painel-mocks-socket.png) |
| 1.11 | Cliente Socket.IO: dedupe, versão, usuário, reconexão com reconciliação REST | done | mesmos testes E2E: duplicado, antigo, troca de usuário, queda e reconexão |
| 1.12 | Persistência após refresh (sessão, carrinho, pedido pendente) | done | [e2e/mock-persistence.spec.ts](e2e/mock-persistence.spec.ts) |
| 1.13 | `pnpm dev` com mocks | done | Verificado no navegador (Chromium): socket mockado conecta; o único WebSocket real é o HMR do Vite |

### Resultado do spike (1.10)

Funciona com `msw@2.15.0` + `@mswjs/socket.io-binding@0.2.0` + `socket.io-client@4.8.4`, com três ajustes que não estão óbvios na documentação do binding:

1. O `socket.io-client` precisa ser importado depois do MSW ativar (ele guarda `globalThis.WebSocket` no import). Primeira tentativa falhou: o socket abriu conexão real. Corrigido ativando os mocks e só então importando a aplicação.
2. O MSW 2.15 remove o prefixo `/socket.io/` da URL antes de comparar; o handler `ws.link('*/socket.io/')` não casa. Usa-se `ws.link('*')` e descarta-se (passa adiante) conexões sem `EIO`, como o HMR do Vite.
3. O binding não envia pings e usa `sid` fixo; foi preciso enviar o pacote `2` periodicamente.

Limitações do transporte documentadas em [ARCHITECTURE.md](ARCHITECTURE.md).

## Fase 2 — Telas e fluxos de UI

Tudo `blocked` pelo Figma, exceto onde indicado. A API e o estado já suportam cada item; falta a tela.

| # | Tarefa | Status | Observação |
| --- | --- | --- | --- |
| 2.1 | Tokens e componentes shadcn/ui adaptados | blocked | Figma |
| 2.2 | Início (destaques, busca, filtros, ordenação, paginação, URL) | blocked | API pronta (`GET /api/nfts`) |
| 2.3 | Detalhe do NFT (galeria, edição, quantidade, favorito, 404) | blocked | |
| 2.4 | Carrinho (quantidades, remoção, cupom, resumo) | blocked | |
| 2.5 | Pagamento (colecionador, carteira, rede, revisão) | blocked | Campos do formulário vêm do Figma; hoje `collector = { fullName, email }` |
| 2.6 | Confirmação do pedido (pending, confirmed, rejected) | blocked | |
| 2.7 | Login e cadastro, com `redirect` seguro | blocked | |
| 2.8 | Perfil (dados, avatar, senha) | blocked | |
| 2.9 | Carteiras (principal e secundária) | blocked | |
| 2.10 | 404 e acesso direto às rotas | todo | Existe só a 404 mínima do roteador |
| 2.11 | Skeletons com shimmer e reduced motion | blocked | |
| 2.12 | Favoritos com atualização otimista e rollback | blocked | Cenário `http-5xx` com `match` já permite forçar a falha |
| 2.13 | Retomada do checkout após expiração de sessão | todo | `SESSION_EXPIRED` e `dropInvalidSession` existem; falta guardar e restaurar o contexto |

## Fase 3 — Testes e evidências

| # | Tarefa | Status | Evidência / observação |
| --- | --- | --- | --- |
| 3.1 | Playwright configurado (Chromium desktop 1440 e mobile 390, trace, relatório HTML) | done | [playwright.config.ts](playwright.config.ts) |
| 3.2 | E2E de infraestrutura (socket, persistência, reset) | done | `pnpm test:e2e`: 14 passando (7 testes x 2 projetos) ([log](/opt/cursor/artifacts/playwright-e2e.log)) |
| 3.3 | E01 busca/filtros/ordenação/paginação na UI | blocked | Cobertura de API em `catalog.test.ts`; falta a UI |
| 3.4 | E02 detalhe direto e inexistente | blocked | API coberta (404) |
| 3.5 | E03 cadastro/login/expiração/logout/troca | blocked | API e limpeza de cache cobertas; E2E de troca de usuário existe no painel técnico |
| 3.6 | E04 favoritos com falha e rollback | blocked | |
| 3.7 | E05 carrinho/cupom/persistência | blocked | API coberta em `cart.test.ts` |
| 3.8 | E06 compra completa até o recibo | blocked | API coberta em `checkout.test.ts` |
| 3.9 | E07 recusa, clique duplo, timeout | blocked | Lógica coberta em `checkout.test.ts`; falta a UI |
| 3.10 | E08 perfil, avatar, senha, carteiras | blocked | API coberta em `auth.test.ts` |
| 3.11 | E09 preço/disponibilidade por Socket.IO no checkout | blocked | Evento e cache cobertos; falta o bloqueio visual do checkout |
| 3.12 | E10 duplicados/antigos, queda e retomada de pedido pendente | doing | Socket coberto no painel técnico; falta o fluxo de UI do pedido |
| 3.13 | E11 teclado, foco, formulários | blocked | |
| 3.14 | E12 skeleton, falha e retry | blocked | |
| 3.15 | Regressão visual (Início, Detalhe, Carrinho, Pagamento) | blocked | Sem layout |
| 3.16 | Lighthouse 3x por página/perfil, medianas, HTML/JSON | blocked | Sem páginas finais. Nenhuma medição foi feita |
| 3.17 | Verificação em clone limpo | todo | Fazer ao fechar a fase de UI |

## Fase 4 — Entrega

| # | Tarefa | Status | Observação |
| --- | --- | --- | --- |
| 4.1 | README e ARCHITECTURE.md | doing | Escritos para o estado atual; atualizar com telas, desvios do Figma e Lighthouse |
| 4.2 | `vercel.json` com fallback de SPA | done | Arquivo criado; **não testado** em ambiente publicado |
| 4.3 | Deploy público e teste de rotas diretas em HTTPS | blocked | Exige autorização do Cauã |
| 4.4 | Envio à empresa | blocked | Exige autorização do Cauã. Não feito |

## Riscos atuais

1. Figma sem acesso: maior risco para as notas de fidelidade visual (20 pts) e para toda a Fase 2.
2. Bundle: o chunk do mock (MSW + zod + binding) passa de 500 kB e entra no build de demonstração, o que pressiona o Lighthouse de performance. Avaliar code splitting quando houver telas.
3. Fixtures com imagens que ainda não existem (`/assets/nfts/...`), esperando os assets do Figma.
4. Prazo informado em e-mail (19/10/2026): não verificável aqui; confirmar com o recrutador.

## Próximo passo

Cauã libera o Figma (ou envia as exportações). Em seguida: `FIGMA_AUDIT.md` real, tokens, componentes e a vertical slice catálogo -> detalhe -> carrinho -> login -> checkout -> recibo.
