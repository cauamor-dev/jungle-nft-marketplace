# Diretrizes permanentes para agentes de código

## Prioridade
1. `https://github.com/junglegaming/frontend-challenge/blob/main/README.md` é o contrato de avaliação.
2. `docs/FIGMA_GATE.md` define validação visual: nenhuma cor/asset do Figma deve ser inventada.
3. `docs/CONTRATOS_E_INVARIANTES.md` detalha invariantes de negócio.
4. `docs/PLANO_ARQUITETURA_COMPLETO.md` oferece arquitetura e fases.
5. `docs/MATRIZ_DE_ACEITE.md` lista evidências.

## Padrões
- React/TS strict, Vite, pnpm, componentização simples, imports consistentes.
- TanStack Router e TanStack Query de verdade; Axios como cliente HTTP; MSW como fronteira de rede; `socket.io-client` + binding com eventos reais do mock.
- Autenticação fake, carteira e pagamento fake, sem blockchain real. Apenas fixtures fictícias, nunca credenciais reais.
- Armazenar ETH como string decimal; operações com decimal.js; nunca Number/parseFloat para total.
- Cache privado segmentado por usuário; sessão trocada limpa caches/listeners.
- Checkout: cotação sempre conferida pelo mock; mesma chave de idempotência + payload => mesmo pedido; resultado do pedido vindo do mock; snapshot do recibo imutável.
- Playwright tests observam UI e operações de rede; não contornar testes com estados artificiais no componente. Logs e relatórios honestos.
- Responsividade: 390/768/1440. Sem overflow nem scroll lateral espúrio; foco visível, semântica e reduced motion.
- Código natural e legível; evitar abstrações em excesso, arquivos gigantes, jargão decorativo e comentários supérfluos. Manter README factual.
- Tudo registrado em `TASKS.md` com evidência, links e bloqueios. Jamais afirmar que validou algo sem execução concreta.

## Limites
Nunca publicar deploy, abrir PR público, submeter candidatura, enviar e-mail, solicitar cartão de crédito, comprar assinatura ou mudar permissões sem confirmação do Cauã. A leitura de ferramentas de design deve ser somente leitura. Nenhuma tentativa de ocultar registros de acesso do proprietário de arquivo.
