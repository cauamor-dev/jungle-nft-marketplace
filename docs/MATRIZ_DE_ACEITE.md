# Requisitos -> evidência de aceite

| Área | Aceite | Prova esperada | Estado inicial |
| --- | --- | --- | --- |
| Figma | Frames desktop/mobile identificados, assets e medidas reais | FIGMA_AUDIT.md + screenshots | BLOQUEADO até conexão |
| Home/catalog | filtros combinados, busca, sort, paginação URL | Playwright E01 | TODO |
| Detail | galeria, editions, sold out, 404, favorito | Playwright E02 + E04 | TODO |
| Auth | register/login/logout/refresh/expiry/merge | Playwright E03 | TODO |
| Cart | quantidade, cupom, persistência, estoque | Playwright E05 | TODO |
| Checkout | cotação válida, wallet, idempotência | Playwright E06-E07 | TODO |
| Receipt | só confirmed, snapshot preservado | Playwright E06-E07 | TODO |
| Account | profile, avatar, password, 2 wallets | Playwright E08 | TODO |
| Socket | nft.updated/order.updated, old/duplicates, reconnect | Playwright E09-E10 | TODO |
| Mocks | 2 users, deterministic scenarios, reset | Playwright + scenario guide | TODO |
| A11y | teclado, foco, labels, reduced motion | Playwright E11 | TODO |
| UX states | skeleton shimmer, errors, retry | Playwright E12 | TODO |
| Visual | 390, 768, 1440 sem overflow | screenshots + visual baselines | TODO |
| Lighthouse | 3x Home+Detail mobile+desktop, metas e medianas | report HTML/JSON | TODO |
| Deploy | HTTPS, refresh nested routes, mock/socket intactos | browser video/screenshots | TODO |
| Docs | README, ARCHITECTURE, APIs, scripts, lockfile | clean clone test | TODO |

**Testes solicitados:** E01–E12 completos no README oficial. Não chamar placeholder de teste executável. O agente cria TASKS.md com links concretos para arquivos e logs. Metas Lighthouse: Performance >=90, Accessibility >=95, Best Practices >=95, SEO >=90. Caso falhe, documentar medições reais e causas, sem falsificar resultados.
