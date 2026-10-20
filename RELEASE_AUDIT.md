# Auditoria de release

Revisão feita em 20/10/2026 sobre a branch `cursor/fundacao-tecnica-145e` (commit `991b856`), em uma branch separada: `claude/revisao-final-jungle`. A branch original e o PR #2 não foram alterados. Nada foi publicado, implantado ou enviado à empresa.

Status: **verificado** (executado e aprovado), **falhou** (executado e reprovado), **pendente** (ainda não feito), **não testável** (depende de algo fora deste ambiente).

## Auditoria externa (Téo, 20/10/2026)

Branch das correções: `claude/correcoes-auditoria-teo`, criada a partir de `claude/revisao-final-jungle`. Cada achado foi conferido no código antes da correção.

| Achado | Causa conferida | Correção | Teste de regressão | Status |
| --- | --- | --- | --- | --- |
| B-01 (P0) catálogo preso em "Algo deu errado" | Confirmada: `persist()` gravava o cenário com os dados no `localStorage`; `offline` sem `remaining` falhava para sempre, em qualquer aba | Cenário em `sessionStorage` (só a aba), migração do esquema 1 descartando o cenário antigo, faixa de cenário ativo com "Restaurar condições normais", "Restaurar tudo" no `/dev/mocks`, `?mock-reset=1`, mensagem específica para falha de rede. Mantive `remaining` sem limite por padrão: um `offline` que se cura sozinho não simularia queda; a saída agora é visível e a aba nova começa limpa | `mock-persistence.spec.ts` (cenário ativo + reload + aba nova + restaurar; dados v1 com falha embutida; `?mock-reset=1`) | corrigido |
| B-02 (P1) tela em branco por HTTP no IP | Confirmada: `crypto.subtle` e `randomUUID` inexistentes fora de contexto seguro; `bootstrap()` sem `catch` | Hash do mock e ids sem depender de contexto seguro (SHA-256/PBKDF2 em JS com bytes idênticos ao WebCrypto); aviso de falha de inicialização no lugar de tela em branco; `pnpm dev:lan`. O app funciona por HTTP no IP, exceto o tempo real (limitação do MSW 2.15 sem service worker, avisada na tela) | `sha256.test.ts` (compara com WebCrypto) e verificação manual pelo IP do container: compra completa até "confirmado" | corrigido |
| B-03 (P1) botões do erro estouram em 320–390 | Confirmada: `flex gap-3` sem quebra dentro de dois paddings | `ErrorActions` empilha abaixo de 640 px; aplicado no catálogo, detalhe e recibo | `responsive.spec.ts` "estados de erro em 320/375/390px" (rolagem lateral e cada botão dentro da tela) | corrigido |
| B-04 (P0 de entrega) sem deploy | Não é defeito de código | Configuração e guia prontos | — | depende de autorização |
| B-05 (P1) regressão visual pulada | Confirmada: skip por versão do Chromium | Playwright fixado em 1.56.1 (Chromium 141, o mesmo das baselines); skip removido | os 8 testes visuais | corrigido |
| B-06 (P2) erro sem teste de layout | Confirmada | Ver B-01 e B-03 | idem | corrigido |
| B-07 (P2) `/dev/mocks` sem indicação | Confirmada | Aviso de painel técnico, restauração no topo, faixa global | `mock-persistence.spec.ts` | corrigido |
| B-08 (P2) performance mobile no limite | Medido: mediana de 3 execuções 93 (início) e 92 (detalhe) | `modulepreload` testado e descartado (piorou para 83); ver ARCHITECTURE | Lighthouse | dentro da meta |
| B-09 (P3) diferenças de Figma | Frames mobile de login e cadastro obtidos nesta rodada | "Criar perfil" no mobile, ícone de carteira oficial e ordem das carteiras do frame; demais desvios documentados em ARCHITECTURE | baselines `pagamento-*` | corrigido / documentado |
| B-10 (P3) testes pulados no mobile | Confirmada; a ordenação **não existia** no mobile | Ordenação no painel de filtros mobile; lista do catálogo mobile em ordem de leitura correta; testes de ordenação, teclado e foco rodando no mobile | `catalog.spec.ts`, `realtime-ui.spec.ts`, `responsive.spec.ts` | corrigido |
| Controle de relógio (README §9) | Nenhum uso de `page.clock` | Teste da cotação que vence em 5 min com `page.clock.fastForward` | `checkout.spec.ts` | corrigido |

## Ambiente

| Item | Valor |
| --- | --- |
| Sistema | Linux 6.18 x64, 4 CPUs (container) |
| Node / pnpm | 22.22.0 / 10.33.4 |
| Playwright | 1.56.1 (fixado no lockfile) com o Chromium 141.0.7390.37 que ele instala |
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
| Detalhe desktop com CLS 0,079: o rodapé aparecia e era empurrado enquanto o chunk lazy da rota carregava | Fallback de rota ocupa a tela | `src/app/layout.tsx` | Lighthouse detalhe desktop: CLS 0, Performance 98 → 100 |
| Baselines visuais dependentes do Chromium | Regeradas depois de conferir cada diff; em outro ambiente os testes visuais são pulados com o motivo e o comando para gerar baselines locais | `e2e/responsive.spec.ts` | ver "Execução final" |

## Lighthouse

`pnpm lighthouse` contra `pnpm preview` do build final, 3 execuções por combinação, medianas. Relatório HTML/JSON da execução mediana em `lighthouse/<página>-<perfil>.report.*`; ambiente e todas as execuções em `lighthouse/summary.json`.

| Página | Perfil | Perf | A11y | BP | SEO | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Início | mobile | 93 | 100 | 100 | 100 | 2,68 s | 172 ms | 0 |
| Detalhe | mobile | 92 | 100 | 100 | 100 | 3,10 s | 17 ms | 0 |
| Início | desktop | 100 | 100 | 100 | 100 | 0,78 s | 0 ms | 0,0002 |
| Detalhe | desktop | 99 | 100 | 100 | 100 | 0,84 s | 0 ms | 0 |

## Execução final

Após as correções da auditoria externa (commit da branch `claude/correcoes-auditoria-teo`):

| Verificação | Resultado |
| --- | --- |
| Clone novo + `pnpm install --frozen-lockfile` | ok; Playwright 1.56.1 resolve o Chromium 141 (revisão 1194) |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | sem erros |
| `pnpm test` | 7 arquivos, 65 testes passando |
| `pnpm test:e2e` (desktop 1440 e mobile 390) | **178 passaram, 0 pulados, 0 falhas**, 5,2 min |
| Testes visuais no clone limpo | 8 de 8 passaram contra as baselines versionadas |
| App aberto pelo IP da rede em HTTP | carrega, login e compra até "confirmado" (verificação manual por script) |
| `pnpm lighthouse` | metas atingidas nas 4 combinações (tabela acima) |

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
