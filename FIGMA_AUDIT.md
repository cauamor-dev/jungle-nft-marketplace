# Auditoria do Figma

Arquivo: https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1 (file key `Ff0SksUi7UFtPWUO8kyNtw`)

**Estado: BLOQUEADO.** Nenhum frame, token ou asset foi lido. Esta tabela está vazia de propósito: nada abaixo foi inferido ou imaginado.

## Tentativas de acesso (19/10/2026, somente leitura)

| Chamada (Figma MCP) | Resultado | Debug UUID |
| --- | --- | --- |
| `whoami` | OK: conta `caua3595@gmail.com`, plano Starter, assento "View" | n/d |
| `get_metadata` sem `nodeId` (lista de páginas) | Erro: "Looks like you don't have edit access to this file" | `2557f878-e189-4d4a-ba05-a2c4c9b2a506` |
| `get_metadata` nó `0:1` | Mesmo erro | `2f77d709-da00-4d53-bef9-6fe748256f6d` |
| `get_screenshot` nó `0:1` | Mesmo erro | `f39722ca-1469-4843-b50d-5359d0dff659` |
| `create_session` | Mesmo erro | `8c6b9285-3363-4e2e-92c2-58e570b7a982` |
| `get_design_context` nó `0:1` | Mesmo erro | `81de0481-d5f6-4927-ad95-256658c36465` |
| `curl` na URL pública do arquivo | HTTP 403 | n/d |

A autenticação do MCP funciona (o `whoami` respondeu). O que falha é a permissão sobre o arquivo: a conta conectada tem assento "View" e o servidor exige acesso de edição para ler o conteúdo. Nenhuma tentativa de escrita foi feita.

## O que desbloqueia

Qualquer uma destas opções, a critério do Cauã:

1. Duplicar o arquivo para o próprio rascunho do Figma (Duplicate to your drafts) em uma conta com assento Full/Dev, e passar a nova URL. O arquivo original da empresa não é tocado.
2. Passar exportações dos frames (PNG/SVG) e dos assets que ele tenha permissão de usar, junto com tipografia e cores anotadas.
3. Conectar uma conta Figma com assento que permita leitura via MCP.

## Inventário (a preencher após o desbloqueio)

| Page | Frame e ID | Desktop/mobile | Largura × altura | Conteúdo | Assets | Fonte/cores | Estado | Evidência |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | não lido | — |

Conforme `docs/FIGMA_GATE.md`, o gate "fidelidade Figma" permanece `blocked`.
