# Modelo e execução no Cursor Cloud Agent

## Seleção recomendada
O seletor depende do plano Cursor e pode mudar. Para uma entrega complexa de interfaces + arquitetura + mocks + testes, priorizar no seletor **Claude Opus 5**, se aparecer e se o consumo/custo for viável; boa alternativa **GPT-5.6 Sol**. No plano com somente modelos próprios, selecionar **Grok 4.7** para o trabalho de múltiplos passos ou **Composer 2.5** para ajustes rápidos. Preferir modelos capazes de uso de ferramentas e revisão longa. O modo Auto ajuda no custo, mas pode mudar de modelo entre subtarefas.

## Cloud Agent
- Cada agente usa sua própria VM e navegador, não instala nada no PC da empresa.
- Deve executar `pnpm install`, rodar dev server, validar UI no browser, salvar screenshots e outputs de teste, depois commitar em branch.
- Não repartir em vários agentes alterando o mesmo arquivo; usar um principal e sub-tarefas com fronteiras claras.
- O Cloud Agent suporta MCP HTTP/OAuth; plugin Figma pode exigir login/autorização separado e permissões do arquivo.

Fontes: https://prod.cursor.com/docs/cloud-agent/capabilities e https://prod.cursor.com/help/models-and-usage/available-models e https://help.figma.com/hc/en-us/articles/39889260656407-Cursor-and-Figma-Set-up-the-MCP-server
