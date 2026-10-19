# Requisitos -> evidência de aceite

| Área | Aceite | Prova esperada | Estado |
| --- | --- | --- | --- |
| Figma | Frames desktop/mobile identificados, assets e medidas reais | FIGMA_AUDIT.md + screenshots | Cópia lida; conferência visual, sem métrica automática |
| Home/catalog | filtros combinados, busca, sort, paginação URL | Playwright E01 | `e2e/catalog.spec.ts` |
| Detail | galeria, editions, sold out, 404, favorito | Playwright E02 + E04 | `e2e/catalog.spec.ts`, `e2e/account.spec.ts` |
| Auth | register/login/logout/refresh/expiry/merge | Playwright E03 | `e2e/auth.spec.ts` |
| Cart | quantidade, cupom, persistência, estoque | Playwright E05 | `e2e/checkout.spec.ts`, `e2e/auth.spec.ts` |
| Checkout | cotação válida, wallet, idempotência | Playwright E06-E07 | `e2e/checkout.spec.ts` |
| Receipt | snapshot preservado; confirmação só depois do mock | Playwright E06-E07 | `e2e/checkout.spec.ts`, `e2e/realtime-ui.spec.ts` |
| Account | profile, avatar, password, 2 wallets | Playwright E08 | `e2e/account.spec.ts` |
| Socket | nft.updated/order.updated, old/duplicates, reconnect | Playwright E09-E10 | `e2e/realtime-ui.spec.ts`, `e2e/realtime-transport.spec.ts` |
| Mocks | 2 users, deterministic scenarios, reset | Playwright + scenario guide | README e `e2e/mock-persistence.spec.ts` |
| A11y | teclado, foco, labels, reduced motion | Playwright E11 | `e2e/realtime-ui.spec.ts`, `e2e/responsive.spec.ts` |
| UX states | skeleton shimmer, errors, retry | Playwright E12 | `e2e/realtime-ui.spec.ts`, `e2e/catalog.spec.ts` |
| Visual | 390, 768, 1440 sem overflow | screenshots + visual baselines | `e2e/responsive.spec.ts` |
| Lighthouse | 3x Home+Detail mobile+desktop, metas e medianas | report HTML/JSON | `lighthouse/summary.json`; metas atingidas |
| Deploy | HTTPS, refresh nested routes, mock/socket intactos | browser video/screenshots | blocked: sem autorização |
| Docs | README, ARCHITECTURE, APIs, scripts, lockfile | clean clone test | README e ARCHITECTURE atualizados; clone limpo ainda não executado |

**Testes solicitados:** E01–E12 completos no README oficial. Não chamar placeholder de teste executável. O agente cria TASKS.md com links concretos para arquivos e logs. Metas Lighthouse: Performance >=90, Accessibility >=95, Best Practices >=95, SEO >=90. Caso falhe, documentar medições reais e causas, sem falsificar resultados.
