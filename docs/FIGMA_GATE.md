# Etapa de Figma obrigatória — definição de pronto visual

**Arquivo da Jungle:** https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1

A análise anterior tentou ler metadados do Figma, mas recebeu erro de permissão. O layout **não foi inspecionado**. Logo, nenhuma especificação de cor, tipografia, imagem, tamanho ou espaçamento neste pacote é uma afirmação sobre o arquivo.

## Acesso via Cursor Cloud
- Acesse https://cursor.com/agents e abra MCP → adicionar Figma; complete o OAuth na sua conta Figma. Se necessário, configurar servidor HTTP `https://mcp.figma.com/mcp`.
- O agent deve consultar `get_metadata`/`get_design_context`, `get_screenshot` e `download_assets` conforme disponíveis. Confirmar permissões antes de insistir.
- Somente leitura: não criar anotações, comentários, layers ou edições no arquivo da empresa. MCP pode registrar acessos/autorização; NÃO prometer invisibilidade.
- Se retornar erro de acesso, avise o Cauã e solicite capturas/exportações dos frames/ícones/assets que ele tem permissão para acessar; não forçar edição do original.

## Inventário obrigatório
Criar `FIGMA_AUDIT.md` com tabela para cada frame, preenchida com dados lidos (não imaginados):
| Page | Frame e ID | Desktop/mobile | Largura × altura | Conteúdo | Assets | Fonte/cores | Estado | Evidência |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Identificar quais telas possuem frames desktop/mobile; extrair medidas dos containers, navegação, cards, top/bottom bar, grid, filtros, hierarquia, botões, formulários, tipografia, hover/active; variáveis do design system, assets e estados. Em páginas sem frame mobile específico, compor adaptação consistente e documentar decisões.

## Processo de implementação e avaliação
1. Capturar referência de cada frame (screenshot original) e medidas pelo MCP.
2. Criar tokens CSS e componentes adaptados do shadcn/ui.
3. Implementar páginas relevantes e capturar prints reais no navegador nas larguras 390, 768, 1440.
4. Comparar lado a lado, ajustar espaçamento, proporção, tipografia, imagens e estados.
5. Acrescentar evidência às tarefas; registrar desvios em ARCHITECTURE.md.

**Bloqueante:** não declarar `fidelidade Figma = validada` sem screenshots dos layouts originais e comparações do produto real. Se não houver acesso, implementar as funções e manter esse gate marcado `blocked`.
