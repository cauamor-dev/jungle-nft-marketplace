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

## Cursor Cloud

Este repositório ainda não tem `package.json` nem servidor de aplicação. Em login shell (`bash -lc`), Node.js 22.23.3 e pnpm 10.33.4 já estão no PATH. Chrome para verificação visual: `/usr/local/bin/google-chrome`.

O install do ambiente executa `pnpm install --frozen-lockfile` quando existe `pnpm-lock.yaml`, ou `pnpm install` quando existe só `package.json`. Sem esses arquivos, o install termina sem instalar dependências.

O start sobe `pnpm run dev --host 0.0.0.0 --port 5173` somente se `package.json` definir o script `dev`. Sem `--host`, o Vite 6 escuta apenas em IPv6 (`::1`) e `curl http://127.0.0.1:5173` falha. Não colocar um `--` extra antes de `--host`: o pnpm 10 repassa esse `--` ao Vite e ignora o host. Se `127.0.0.1:5173` já responder, o start não sobe outro processo.

O pnpm 10 não executa lifecycle scripts de dependências sem aprovação no projeto (`pnpm.onlyBuiltDependencies` ou `pnpm approve-builds`).
