# Auditoria de release

Revisão feita em 20/10/2026 sobre a branch `cursor/fundacao-tecnica-145e` (commit `991b856`), em uma branch separada: `claude/revisao-final-jungle`. A branch original e o PR #2 não foram alterados. Nada foi publicado, implantado ou enviado à empresa.

Status: **verificado** (executado e aprovado), **falhou** (executado e reprovado), **pendente** (ainda não feito), **não testável** (depende de algo fora deste ambiente).

## Ambiente

| Item | Valor |
| --- | --- |
| Sistema | Linux 6.18 x64, 4 CPUs (container) |
| Node / pnpm | 22.22.0 / 10.33.4 |
| Playwright | 1.64.1 com Chromium 141.0.7390.37 já instalado no container (`PW_CHROMIUM_PATH`), não o 156 que o Playwright baixaria |
| Lighthouse | 13.5.0 |

## Baseline antes das mudanças

| Comando | Resultado |
| --- | --- |
| `pnpm install --frozen-lockfile` (clone novo, sem `node_modules`) | ok, 3,3 s |
| `pnpm typecheck`, `pnpm lint` | sem erros |
| `pnpm test` | 6 arquivos, 63 testes passando |
| `pnpm build` | ok |
| `pnpm test:e2e` | 154 passaram, 3 pulados, 7 falharam. As 7 falhas eram todas de regressão visual: as baselines vieram de outra versão do Chromium e os glifos deslocam frações de pixel (no início mobile isso mudava a quebra do título do hero). Nenhuma falha funcional |

## P0 — eliminatórios

| Requisito | Evidência | Status |
| --- | --- | --- |
| Stack usada de verdade (React, TS, Router, Query, Axios, REST, Socket.IO, Tailwind, shadcn/ui, MSW, Playwright, Lighthouse) | Código em `src/`; proteção das rotas privadas agora também no Router (layout `privado` com `beforeLoad`); `components.json` do shadcn | verificado |
| Fluxos principais funcionais, não só visuais | E2E de catálogo, detalhe, auth, carrinho, checkout, conta | verificado |
| Compra confirmada só após resposta do mock | `checkout.spec.ts` (recibo vai de `pending` a `confirmed` via `order.updated`; recusa mostra "não concluído") | verificado |
| Sem exposição de dados entre usuários | `auth.spec.ts` (troca de usuário), `checkout.spec.ts` (403 em pedido alheio), `realtime-transport.spec.ts` (`order.updated` só ao dono) e roteiro manual: logout limpa token e rascunhos; conta B não vê carrinho nem favoritos da A | verificado |
| Eventos pelo `socket.io-client` via MSW, não por setters | `realtime-transport.spec.ts` confirma que nenhum WebSocket real é aberto e que o evento chega pelo cliente | verificado |
| E2E executáveis | Ver "Execução final" | verificado |
| Deploy público | `vercel.json` e guia no README prontos | pendente (exige autorização do Cauã) |

## P1 — corrigidos nesta revisão

| Problema observado | Correção | Onde | Prova |
| --- | --- | --- | --- |
| Proteção das rotas privadas só por componente (o enunciado pede o Router) | Layout sem caminho com `beforeLoad` + `ensureQueryData` da sessão; textos do aviso por `staticData` | `src/app/router.tsx`, `src/app/layout.tsx` | `auth.spec.ts`, `checkout.spec.ts` (visitante em `/pagamento` vê o login e volta ao destino) |
| "Ver no Etherscan" abria `explorer.mock.test`, domínio inexistente | Diálogo de explorador simulado com o hash da API | `order-receipt-page.tsx` | `checkout.spec.ts` (compra completa) |
| Pedido de outro usuário oferecia "Tentar de novo" para um 403 | Botão só para falhas transitórias | `order-receipt-page.tsx` | `checkout.spec.ts` |
| Carrinho desktop: preço quebrando em duas linhas, colunas fora do Figma | Larguras do frame | `cart-page.tsx` | baseline `carrinho-desktop` |
| Rádios e checkbox nativos brancos | Estilo do Figma | `styles.css` | baseline `pagamento-*` |
| Setas "Explorar" para baixo; seta invisível nas promos | Rotação e ícone escuro | `hero.tsx`, `promos.tsx` | baseline `inicio-mobile` |
| Título do hero mobile frágil em 390 px | Tamanho proporcional, duas linhas | `hero.tsx` | baseline `inicio-mobile` |
| Avisos de recursos fora do escopo em toast fora do diálogo modal (ficavam ocultos para leitor de tela) | Aviso dentro do diálogo com `role=status` | `auth-dialog.tsx` | revisão manual |
| Foco inicial do login na aba, não no campo | Foco no primeiro campo | `auth-dialog.tsx` | revisão manual |
| Carrinho buscado antes de a sessão resolver (requisição dobrada e cache na chave do visitante) | Query espera a sessão | `features/cart/queries.ts` | E2E de carrinho e merge |
| `avatarUrl` aceitava qualquer string como `src` | Zod só aceita data URL PNG/JPEG/WebP | `api/contracts.ts` | `pnpm test` (upload de avatar) |
| Relatórios do Lighthouse fora do git (o enunciado pede HTML/JSON) | Execução mediana de cada combinação versionada; ambiente no `summary.json` | `scripts/lighthouse.mjs`, `lighthouse/` | ver "Lighthouse" |
| Baselines visuais dependentes do Chromium | Regeradas depois de conferir cada diff; em outro ambiente os testes visuais são pulados com o motivo e o comando para gerar baselines locais | `e2e/responsive.spec.ts` | ver "Execução final" |

## P2 — polimento feito

- Diálogos com abertura e fechamento em opacidade e escala; filtro mobile sobe da borda inferior.
- Cards: imagem aproxima no hover e a barra de ações sobe; coração pulsa ao favoritar.
- Botões reagem ao toque; toasts e recibo entram com deslocamento curto.
- Tudo em `transform`/`opacity` e desligado com `prefers-reduced-motion`.

## Pendências e limites

- Mobile / Login e Mobile / Cadastro não foram rebaixados do Figma nesta revisão: o MCP atingiu o limite de chamadas do plano Starter. Foram conferidos na rodada anterior.
- Baselines visuais valem para Linux + Chromium 141. Quem rodar com o Chromium baixado pelo Playwright 1.64 (156) verá os 8 testes visuais pulados até gerar baselines locais.
- `vercel.json` não foi exercitado em ambiente publicado.
- Autenticação, senhas (PBKDF2 no mock) e tokens em `localStorage` são de demonstração; não há backend seguro.
