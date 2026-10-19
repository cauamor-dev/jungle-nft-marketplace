# Como começar no Cursor pelo navegador

## O que foi aproveitado do Drive
A Clara disponibilizou `pacote-jungle-frontend-challenge.md` no Google Drive. **Era um resumo de requisitos e checklist, não código React ou um protótipo funcional.** Seus pontos úteis estão registrados em `docs/CLARA_BASE_AVALIADA.md`; o restante deste pacote expande a execução.

## Etapa A — preparar um repositório
1. No GitHub, crie um repositório próprio para sua entrega, por exemplo `jungle-nft-marketplace`. Prefira **privado durante o desenvolvimento**. Não faça commits no repositório `junglegaming/frontend-challenge` (é o enunciado).
2. Envie todo o conteúdo deste ZIP mantendo `AGENTS.md`, `.cursor/`, `docs/` e os arquivos Markdown na raiz.
3. Abra https://cursor.com/agents e selecione esse repositório. O Cloud Agent trabalha na VM dele, não depende do computador corporativo.
4. Configure o Figma MCP no menu MCP do agente, autenticando sua conta. URL oficial do MCP remoto: `https://mcp.figma.com/mcp`. Confirme com uma tentativa de leitura de screenshot/metadata. Se estiver sem acesso, use exportações manuais ou capturas que você tenha permissão de usar; não simule que viu o layout.
5. Escolha o modelo conforme `docs/MODELO_E_EXECUCAO_CLOUD.md` e envie `PROMPT_CURSOR_CLOUD.md`.

## Etapa B — checkpoints que você precisa acompanhar
- Fase 0: mapa real do Figma, lista de frames, assets e capturas. Você valida o escopo visual.
- Fase 1: inicialização Vite/React/TS, servidor mock e prova concreta da ligação MSW + Socket.IO client.
- Fase 2: comprar um NFT de ponta a ponta via API simulada e voltar ao mesmo estado após refresh.
- Fase 3: nove telas, visual Figma, cenários de falhas, proteções e E2E.
- Fase 4: prova de funcionamento, relatórios, deploy após sua autorização e submissão manual.

**Prazo:** e-mail em 19/10/2026 às 07h11 BRT informa dois dias. Confirme o deadline exato com o recrutador se necessário. Alvo interno: concluir até 20/10, 22h BRT, para preservar folga. Nunca prometa completar algo sem teste e evidência.

## Atenção ao trabalho do candidato
Use código limpo, nomes autoexplicativos, commits pequenos e mensagens naturais. O objetivo não é mascarar autoria nem fingir que testes foram feitos: você deve revisar o código, entender o fluxo de compra e ser capaz de explicar decisões na avaliação. Não inclua menções desnecessárias a assistentes em comentários do projeto; documente tecnologia, decisões e limites de forma objetiva.

## Segurança e autorização
- Dados somente fictícios. Não usar credenciais pessoais/corporativas nem endpoints de produção.
- Não criar custos pagos nem divulgar código publicamente, abrir PR externo, enviar e-mail ou submeter teste sem autorização explícita do Cauã.
- O agente pode gerar commits/branch e preparar PR no **repositório privado do próprio candidato** se o usuário já o autorizou como workspace; pedir autorização para publicar ou alterar visibilidade.
