# Documentação do pacote vs. README oficial

Comparação feita em 19/10/2026 entre `docs/` e o README oficial. O item 9 (assets bloqueados pelo Figma) ficou desatualizado: a cópia do arquivo abriu e as artes usadas nas telas vieram dela. O restante desta tabela registra a decisão daquela leitura. (https://github.com/junglegaming/frontend-challenge/blob/main/README.md). Onde há diferença, o README oficial prevalece. A coluna "Decisão" indica o que o código segue.

| # | Tema | O que o README oficial exige | O que a documentação diz | Decisão |
| --- | --- | --- | --- | --- |
| 1 | Carteiras no checkout | Seleção de rede e simulação de **conexão, recusa e desconexão** da carteira | Só cita carteira principal/secundária e rede | Adicionar estado de conexão da carteira ao mock e ao fluxo de checkout (`wallet.connect` com cenário de recusa/desconexão) |
| 2 | Expiração no checkout | Tratar expiração durante navegação **e durante o checkout**, preservando o contexto para retomada | `expired-session` existe, mas sem retomada do checkout | Guardar o contexto do checkout (itens, carteira, rede) e retomar após novo login |
| 3 | Cupom | Aplicar **e remover** cupom | Contratos só têm cotação; não há remoção | `PUT/DELETE /api/cart/coupon` no mock; cotação continua validando |
| 4 | Recuperação do pedido | Recuperar o mesmo pedido após timeout/refresh | "Chave ou identificador definido na arquitetura" | `GET /api/orders?idempotencyKey=` além de `GET /api/orders/:id` |
| 5 | Eventos | Identidade estável, **recurso afetado** e versão | `DomainEvent{eventId,entityId,version,userId?,payload}` | Acrescentar `type` e `entity` (`nft` ou `order`) ao envelope |
| 6 | Transporte do socket | Documentar transporte e limitações no ambiente de mocks | Cita limitações do binding (namespace padrão, texto) | Documentar no `ARCHITECTURE.md` o que o spike comprovar (ver `TASKS.md`) |
| 7 | Atualização otimista | Pelo menos uma interação com rollback; política de cache/retry documentada | Favoritos (E04) | Favoritos otimistas; política em `ARCHITECTURE.md` |
| 8 | Zod | Contratos tipados entre transporte, estado e interface | "Opcional e recomendado" | Usar Zod nas respostas da API (tipos derivados do schema) |
| 9 | Assets e fontes | Imagens e fontes acessíveis à execução local | "Preferir exportações do Figma" | Bloqueado pelo Figma; nenhuma imagem inventada entra como asset final |
| 10 | Playwright | Chromium desktop e mobile, regressão visual com baselines de Início, Detalhe, Carrinho, Pagamento | Igual | Baselines só depois do layout do Figma existir |
| 11 | Lighthouse | 3 execuções por página/perfil, medianas, HTML/JSON, versões e ambiente | Igual | Igual |
| 12 | Entrega | Link do repositório + URL pública; deploy obrigatório | Igual, com ressalva de pedir OK | Deploy só com autorização do Cauã |
| 13 | Senha | "Não armazene senhas em claro" | Hash com salt | PBKDF2 (WebCrypto) no mock; documentar que não é backend seguro |
| 14 | Prazo | Não consta no README | E-mail de 19/10/2026 07h11 BRT; meta interna 20/10 22h BRT | Não verificável aqui; confirmar com o recrutador |

## Pontos em que o pacote e o README coincidem

Nove telas e rotas, stack obrigatória, MSW na camada de rede, REST com Idempotency-Key e 409 por payload diferente, eventos `nft.updated` e `order.updated`, reconciliação por REST após reconexão, viewports 390/768/1440, metas do Lighthouse, 12 grupos de E2E, README + ARCHITECTURE.md, checkout limpo sem serviço privado.

## Observação sobre o `START_HERE.md`

Ele cita `.cursor/` na raiz do repositório, mas o pacote trazia as regras em `rules/`. Foram movidas para `.cursor/rules/` e divididas por assunto.
