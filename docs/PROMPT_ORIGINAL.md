# PROMPT — COLAR NO CLAUDE CODE OU CURSOR AGENT

Você é o engenheiro principal encarregado de implementar meu teste técnico de Frontend Developer da Jungle Gaming. Eu sou o Cauã, desenvolvedor júnior. Preciso que você construa uma solução completa, honesta, reproduzível e publicável com **React + TypeScript**, guiada pelos requisitos oficiais.

**Ação inicial obrigatória:** leia integralmente `PLANO_ARQUITETURA_JUNGLE.md` (anexo ou copiado para a raiz do workspace) e depois abra o README oficial https://github.com/junglegaming/frontend-challenge/blob/main/README.md . Confira divergências: o README oficial manda. Analise o Figma https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1 . Não invente telas, tokens ou assets; se não tiver acesso ao Figma, avise imediatamente e peça screenshots, mas prossiga na fundação técnica. O repositório da empresa serve apenas de referência, não é destino de commits.

**Objetivo:** marketplace de NFT com as nove telas, fluxos verdadeiramente funcionais com APIs/mocks, React, TS, TanStack Router, TanStack Query, Axios, Tailwind, shadcn/ui, MSW, socket.io-client com @mswjs/socket.io-binding, Playwright, Lighthouse e deploy. Blockchain e pagamentos reais estão fora do escopo. Os 12 grupos de testes, eventos, idempotência, precisão de ETH, segurança de sessão e documentação são exigências reais. Evite soluções apenas visuais ou simular eventos chamando setters diretamente.

**Prazo:** o e-mail chegou em 19/10/2026 às 07h11 BRT, prazo de dois dias; meta interna é terminar e pedir meu OK para envio até terça, 20/10, às 22h BRT. Não prometa que tudo cabe no prazo sem medir progresso. Reduza apenas enfeites/extras se necessário, nunca silencie requisitos eliminatórios.

## Seu modo de execução

1. Crie `TASKS.md` com matriz de requisitos e checkpoints, contendo referências a arquivos, testes e status real. Faça uma arquitetura curta baseada no arquivo anexo.
2. Inicialize Vite/React/TS strict com pnpm, teste `pnpm dev` e `pnpm build`, configure roteamento/Query/Axios/MSW/skeleton/a11y. **Antes de grande implementação, faça um spike de compatibilidade entre `socket.io-client`, MSW e `@mswjs/socket.io-binding`** e demonstre o recebimento de `nft.updated` real no client.
3. Implemente uma fatia vertical funcional do catálogo ao pedido (sem passar por dados fakes colocados diretamente em componentes). Só depois refine layout e complete perfil/carteiras, mantendo responsividade e fidelidade Figma.
4. Inclua todas as condições de erro e cenários reproduzíveis. Logout/troca de usuário limpa Query caches e listeners. Checkout tem cotação revalidada, chave idempotente, pending/confirmed/rejected, refresh/reconexão e recibo imutável. ETH é string decimal, operações via lib decimal.
5. Faça Playwright E2E reais, screenshots/snapshots com fixtures determinísticas e Lighthouse 3x por página/perfil; prepare relatórios e documentação de decisões/limitações, sem inventar resultado de testes.
6. Prepare deploy conforme critério da empresa, mas **peça meu OK antes de publicar em URL pública, enviar formulário ou e-mail, ou assumir custos**. Use dados fictícios e nenhuma credencial real.
7. Ao final de cada etapa, reporte objetivamente: concluído, pendente, testes executados (com saída), risco mais urgente e próximo passo. Continue implementando quando não houver bloqueio real; só me pergunte o indispensável.

## Regras de qualidade

- Código simples, organizado, sem comentários desnecessários; commits pequenos; não colocar IA como coautor dos commits.
- Use a stack obrigatória em execução real, não apenas instalada no `package.json`.
- Conteúdo coerente com Figma, inclusive loading/error/empty/skeleton e mobile 390px, tablet 768px, desktop 1440px.
- Teste todos os fluxos e rotas diretas em build publicado; MSW e eventos Socket.IO também devem funcionar no deploy.
- Não gere fake pass para Lighthouse/E2E, não esconda testes falhos, não omita limitações.
- Se houver paralelismo/subagentes, divida por pastas sem sobrepor arquivos e integre a cada marco. Evite arquitetura exagerada.

**Comece agora pela Fase 0 do plano: inspeção, `TASKS.md`, conferência do Figma e inicialização do projeto.**
