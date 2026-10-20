# Auditoria de release

Revisão feita em 20/10/2026 sobre a branch `cursor/fundacao-tecnica-145e` (commit `991b856`), em uma branch separada: `claude/revisao-final-jungle`. A branch original e o PR #2 não foram alterados. Nada foi publicado, implantado ou enviado à empresa.

Status: **verificado** (executado e aprovado), **falhou** (executado e reprovado), **pendente** (ainda não feito), **não testável** (depende de algo fora deste ambiente).

## Simulação completa por usuário (20/10/2026, noite)

Bug do teste manual: conta nova criada, nome de usuário trocado para "Cauã.Moreira", e o perfil continuava o antigo.

| Item | Causa conferida | O que foi feito | Prova |
| --- | --- | --- | --- |
| Perfil não salvava | A conta nova nascia sem nome ENS e sem apelido da carteira, que o formulário do perfil exige; a validação falhava no cliente sem mensagem perto do botão e nenhuma requisição saía. O nome de usuário também recusava acento no perfil, mas o cadastro aceitava regras diferentes | Cadastro preenche ENS (derivado do nome de usuário) e apelido "Principal"; contas já gravadas são migradas ao carregar o banco do mock; regra única de nome de usuário (aceita letras acentuadas) no cadastro, no perfil e no mock; resumo "Nada foi salvo" e foco no primeiro campo inválido | `auth.test.ts` (conta nova salva "Cauã.Moreira"; migração v1 → v2); `user-journey.spec.ts` |
| Cadastro, login, logout, sessão | Já funcionavam; faltava teste de ponta a ponta com conta nova | Nenhuma mudança de código | `user-journey.spec.ts` (desktop e mobile) |
| Histórico, carteiras, favoritos e carrinho por usuário | Já separados por `userId` no mock e persistidos no localStorage | Nenhuma mudança de código | `user-journey.spec.ts`: a conta nova vê o próprio pedido, favorito, carteira digitada no pagamento e carrinho depois de logout e novo login; a demo2 não vê nada disso e recebe 403 no pedido da outra conta |
| Google/Facebook | Botões já mostravam aviso, sem teste | Texto mais claro ("não faz parte desta demonstração... entre com e-mail e senha ou crie uma conta"). Não simulei login social com sucesso: o README do desafio pede que ações fora do escopo não pareçam funcionar | `auth.spec.ts`: aviso visível, diálogo continua aberto e nenhuma chamada de login sai |
| Teste com nome enganoso | "carteira nova digitada no pagamento" não digitava carteira | Renomeado para o que ele testa; a carteira digitada é coberta pela jornada nova | `account.spec.ts` |

Recibos são cópias imutáveis: editar o perfil não muda pedidos antigos, só os próximos.

| Verificação | Resultado |
| --- | --- |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | sem erros |
| `pnpm test` | 7 arquivos, 67 testes passando |
| `pnpm test:e2e` (Linux, Chromium 141) | 188 passaram, 0 pulados, 0 falhas, 5,9 min; baselines visuais inalteradas |

Clone limpo e Docker não foram repetidos nesta rodada.

## Revisão independente de 20/10/2026 (noite)

Commits locais na branch `claude/correcoes-auditoria-teo`; sem push, PR ou deploy.

| Tarefa | O que foi encontrado | O que foi feito | Prova |
| --- | --- | --- | --- |
| 1. Regressão visual | Na imagem oficial `v1.56.1-noble`, 8 de 8 testes visuais falhavam com as baselines versionadas. Causa medida: o Chromium seguia o fontconfig de cada sistema (hinting e antialiasing subpixel), a largura dos glifos mudava e a quebra de linha também. Ruído entre ambientes: 0,51% a 1,68% dos pixels, maior que o sinal de 1 px de padding num card (0,065% a 0,7%) | `--font-render-hinting=none` e `--disable-lcd-text` no `playwright.config.ts`: ruído caiu para 0 px nas 8 telas. Baselines geradas na imagem oficial (idênticas às versionadas). Tolerância 0,0005, abaixo do menor sinal medido; 2–3% esconderiam a mudança | 1 px de padding num único card: início desktop (1.260 px) e início mobile (2.029 px) falham; as outras 6 telas, sem card no viewport, passam |
| 2. Skeleton do resumo do pagamento | Coluna vazia durante a cotação | `PaymentSummarySkeleton` com a mesma estrutura do resumo | `checkout.spec.ts`: skeleton visível, confirmar desabilitado, CLS da troca < 0,01. Sabotagem (sem as linhas de totais): CLS 0,0193, teste falha |
| 3. Alvos de toque | ~40 tipos de controle abaixo de 44 px em 390 px | `h-11` abaixo de `md` em botões e campos; utilitário `touch-target` (`::after`) em ícones, chips, stepper e paginação; altura real em listas densas e abas roláveis | `responsive.spec.ts` "alvos de toque em 390px", 7 telas |
| 4. Performance mobile | MSW carregava `tough-cookie` + `tldts` (~340 kB) sem usar cookies; LCP desktop da home esperava o JS para descobrir a imagem | Substituto mínimo do `tough-cookie`; chunks `msw`, `socket`, `socket-protocol`, `radix` (a primeira versão quebrou o tempo real; os testes pegaram e os parsers foram separados); preload do hero na home desktop | Lighthouse abaixo |
| 5. Cosméticos | 18 cards no DOM para 9 visíveis; nome cortado no carrinho; `engines` ausente | Só o grid da largura atual; nome completo no mobile e até 2 linhas com `title` no desktop, colunas menos apertadas entre 1024 e 1279 px; README com começo rápido; `engines.node >=22.19` | Capturas em 320 e 1024 px |

Execução final desta rodada (commit `5ef0c7a` + documentação):

| Verificação | Resultado |
| --- | --- |
| `pnpm typecheck`, `pnpm lint`, `pnpm build` | sem erros |
| `pnpm test` | 7 arquivos, 65 testes passando |
| `pnpm test:e2e` no repositório (Linux, Node 22.22, Chromium 141) | 182 passaram, 0 pulados, 0 falhas, 5,4 min |
| `pnpm test:e2e` num clone limpo (`pnpm install --frozen-lockfile`), mesmo Linux | 182 passaram, 0 pulados, 0 falhas, 5,5 min |
| Comando Docker do README, clone limpo, imagem `v1.56.1-noble` (Node 22.20) | 182 passaram, 0 pulados, 0 falhas, 5,5 min |
| `pnpm lighthouse` (3 execuções, mediana) | home mobile 98 (99, 97, 98), detalhe mobile 98 (98, 98, 97), desktop 100 e 100 |

`engines.node` ficou em `>=22.19`, não em `>=20.19`: o Lighthouse 13 declara `>=22.19` e o Vitest 5 `^22.12`. A observação de que a suíte roda em Node 20.19 não foi verificada aqui.

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
| Início | mobile | 98 | 100 | 100 | 100 | 2.001 ms | 135 ms | 0 |
| Detalhe | mobile | 98 | 100 | 100 | 100 | 2.325 ms | 14 ms | 0 |
| Início | desktop | 100 | 100 | 100 | 100 | 548 ms | 0 ms | 0,000175 |
| Detalhe | desktop | 100 | 100 | 100 | 100 | 665 ms | 0 ms | 0 |

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
