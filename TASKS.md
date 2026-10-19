# TASKS

Status: `todo`, `doing`, `done`, `blocked`. `done` só com evidência (comando executado ou arquivo).
Branch de trabalho: `cursor/fundacao-tecnica-145e` (PR em rascunho). Nada foi publicado, enviado à empresa ou implantado.

## Resumo das verificações (última execução)

| Verificação | Resultado | Evidência |
| --- | --- | --- |
| `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build` | Sem erros; Vitest: 6 arquivos, 63 testes passando | [log](/opt/cursor/artifacts/verificacao-unidade-build.log) |
| `pnpm test:e2e` (Chromium, 1440 e 390) | 161 passaram, 3 puladas (mobile), 0 falhas, 3,9 min | [log](/opt/cursor/artifacts/playwright-e2e.log) |
| `pnpm lighthouse` (3 execuções, mediana) | Todas as metas atingidas | [lighthouse/summary.json](lighthouse/summary.json) e relatórios em `/opt/cursor/artifacts/lighthouse/` |

Lighthouse 13.5.0 contra `pnpm preview` (build com mocks ligados), medianas de Performance / Accessibility / Best Practices / SEO. Metas: 90 / 95 / 95 / 90.

| Página | Perfil | Perf | A11y | BP | SEO |
| --- | --- | --- | --- | --- | --- |
| Início (`/`) | mobile | 91 | 100 | 100 | 100 |
| Detalhe (`/nft/nft_12`) | mobile | 92 | 100 | 100 | 100 |
| Início | desktop | 100 | 100 | 100 | 100 |
| Detalhe | desktop | 98 | 100 | 100 | 100 |

A margem de Performance em Início mobile é pequena (execuções 95, 91, 91; LCP ~2,7 s, TBT 140 a 234 ms): o build de demonstração carrega o MSW. O Lighthouse 13 também reporta `agentic-browsing` (50), categoria que o desafio não pede.

## Fase 0 — Inspeção

| # | Tarefa | Status | Evidência |
| --- | --- | --- | --- |
| 0.1 | Ler AGENTS.md, START_HERE.md, PROMPT_CURSOR_CLOUD.md, docs/ e README oficial | done | Lidos integralmente |
| 0.2 | Organizar regras em `.cursor/rules/` | done | [.cursor/rules/](.cursor/rules/) |
| 0.3 | Acesso ao Figma, frames e assets | done | Original inacessível (assento "View"); a cópia do Cauã abriu. 15 frames, ver [FIGMA_AUDIT.md](FIGMA_AUDIT.md) |
| 0.4 | Comparar documentação com o README oficial | done | [docs/DIVERGENCIAS_README_OFICIAL.md](docs/DIVERGENCIAS_README_OFICIAL.md) |
| 0.5 | Criar TASKS.md | done | este arquivo |

## Fase 1 — Fundação técnica

| # | Tarefa | Status | Evidência |
| --- | --- | --- | --- |
| 1.1 | Vite + React + TS strict, pnpm, Tailwind, ESLint | done | `pnpm typecheck` e `pnpm lint` sem erros |
| 1.2 | Contratos tipados com Zod | done | [src/api/contracts.ts](src/api/contracts.ts) |
| 1.3 | Axios, endpoints, chaves de query com dono | done | [src/api](src/api) |
| 1.4 | Dinheiro com decimal.js | done | [src/domain/money.test.ts](src/domain/money.test.ts) |
| 1.5 | MSW: auth, catálogo, favoritos, carrinho, cotação, pedidos, perfil e carteiras | done | `pnpm test` |
| 1.6 | Cenários determinísticos e reset | done | [src/mocks/scenarios.ts](src/mocks/scenarios.ts); README lista os cenários |
| 1.7 | Idempotência, 409 por payload diferente, timeout pós-criação, cotação desatualizada | done | [src/mocks/checkout.test.ts](src/mocks/checkout.test.ts) |
| 1.8 | Isolamento entre usuários, senha sem texto claro | done | [src/mocks/auth.test.ts](src/mocks/auth.test.ts) |
| 1.9 | Spike Socket.IO + MSW | done | [e2e/realtime-transport.spec.ts](e2e/realtime-transport.spec.ts); detalhes em ARCHITECTURE.md |
| 1.10 | Cliente Socket.IO: dedupe, versão, usuário, reconexão com reconciliação REST | done | mesmo arquivo de testes |
| 1.11 | Persistência após refresh (sessão, carrinho, pedido pendente) | done | [e2e/mock-persistence.spec.ts](e2e/mock-persistence.spec.ts) |

## Fase 2 — Telas e fluxos

| # | Tarefa | Status | Onde |
| --- | --- | --- | --- |
| 2.1 | Tokens e componentes base adaptados ao Figma | done | [src/styles.css](src/styles.css), [src/components](src/components) |
| 2.2 | Início: destaques, busca, filtros, ordenação, paginação, URL | done | [src/features/catalog](src/features/catalog) |
| 2.3 | Detalhe: galeria, edição, quantidade, favorito, 404, esgotado | done | [src/features/nft](src/features/nft) |
| 2.4 | Carrinho: quantidades, remoção, cupom, resumo | done | [src/features/cart](src/features/cart) |
| 2.5 | Pagamento: colecionador, carteira, rede, revisão, cotação aceita | done | [src/features/checkout](src/features/checkout) |
| 2.6 | Recibo: pending, confirmed, rejected | done | [src/features/orders](src/features/orders) |
| 2.7 | Login e cadastro com retorno ao destino | done | [src/features/auth](src/features/auth) |
| 2.8 | Perfil: dados, avatar, senha | done | [src/features/account](src/features/account) |
| 2.9 | Carteiras (principal e secundária), atividade, favoritos | done | idem |
| 2.10 | 404 e acesso direto às rotas | done | `NotFoundPage`; testes de 404 em `catalog.spec.ts` |
| 2.11 | Skeletons com shimmer e reduced motion | done | `realtime-ui.spec.ts`, `responsive.spec.ts` |
| 2.12 | Favoritos otimistas com rollback | done | [e2e/account.spec.ts](e2e/account.spec.ts) |
| 2.13 | Retomada do checkout após expiração de sessão | done | [e2e/checkout.spec.ts](e2e/checkout.spec.ts) |

## Fase 3 — Testes e evidências

Mapeamento E01–E12 do enunciado para os testes (nomes completos nos arquivos).

| Item | Cobertura | Arquivo |
| --- | --- | --- |
| E01 busca, filtros, ordenação, paginação na URL, histórico e reset de página | done | `e2e/catalog.spec.ts` (catálogo) |
| E02 detalhe direto, inexistente, esgotado | done | `e2e/catalog.spec.ts` (detalhe) |
| E03 cadastro, login, expiração, logout, troca de usuário, merge de carrinho | done | `e2e/auth.spec.ts` |
| E04 favoritos com falha e rollback | done | `e2e/account.spec.ts` |
| E05 carrinho, cupom, persistência, estoque, aviso de merge | done | `e2e/checkout.spec.ts` (carrinho), `e2e/auth.spec.ts` |
| E06 compra completa até o recibo | done | `e2e/checkout.spec.ts` |
| E07 recusa, clique duplo, timeout, idempotência | done | `e2e/checkout.spec.ts` |
| E08 perfil, avatar, senha, carteiras | done | `e2e/account.spec.ts` |
| E09 preço e disponibilidade por Socket.IO, com aviso do preço antigo e do novo | done | `e2e/realtime-ui.spec.ts`, `e2e/checkout.spec.ts`, `e2e/realtime-transport.spec.ts` |
| E10 duplicados, antigos, queda e retomada de pedido pendente | done | `e2e/realtime-ui.spec.ts`, `e2e/realtime-transport.spec.ts` |
| E11 teclado, foco, rótulos | done | `e2e/realtime-ui.spec.ts`, `e2e/responsive.spec.ts` |
| E12 skeleton, falha, retry | done | `e2e/realtime-ui.spec.ts`, `e2e/catalog.spec.ts` |
| Responsividade 390 / 768 / 1440 sem overflow | done | `e2e/responsive.spec.ts` |
| Regressão visual (início, detalhe, carrinho, pagamento; desktop e mobile) | done | `e2e/responsive.spec.ts` e baselines em `e2e/responsive.spec.ts-snapshots` |
| Lighthouse 3x, medianas, JSON e HTML | done | tabela acima, `pnpm lighthouse` |
| Verificação em clone limpo | todo | não executada |

Os 3 testes pulados no mobile estão justificados no próprio `test.skip` (ordenação só existe a partir de 768 px; teclado do header e foco por Tab são de desktop).

## Fase 4 — Entrega

| # | Tarefa | Status | Observação |
| --- | --- | --- | --- |
| 4.1 | README e ARCHITECTURE.md | done | Atualizados com o estado real |
| 4.2 | `vercel.json` com fallback de SPA | done | Arquivo criado; **não testado** em ambiente publicado |
| 4.3 | Deploy público e teste de rotas diretas em HTTPS | blocked | Exige autorização do Cauã |
| 4.4 | Envio à empresa | blocked | Exige autorização do Cauã. Não feito |

## Riscos e lacunas

1. Fidelidade visual foi conferida por screenshot lado a lado com o Figma, sem métrica automática. As baselines do Playwright protegem contra regressão, mas foram geradas pelo próprio app. Divergências conhecidas em [FIGMA_AUDIT.md](FIGMA_AUDIT.md).
2. Lighthouse em Início mobile passa com pouca folga (91 contra meta 90).
3. Clone limpo e deploy ainda não foram testados; o `vercel.json` nunca rodou em ambiente publicado.
4. Prazo informado em e-mail (19/10/2026): não verificável aqui; confirmar com o recrutador.

## Próximo passo

Cauã revisa o PR e autoriza, se quiser, o deploy e a entrega. Antes disso, rodar a verificação em clone limpo.
