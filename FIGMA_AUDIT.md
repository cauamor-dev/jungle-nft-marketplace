# Auditoria do Figma

Arquivo usado: cópia do Cauã, https://www.figma.com/design/Bb4Q88ctx6wy2ETFpDyJ23/Frontend-Challenge--Copy-?node-id=0-1 (file key `Bb4Q88ctx6wy2ETFpDyJ23`), canvas "Marketplace de NFTs GreenMint".

O arquivo original (`Ff0SksUi7UFtPWUO8kyNtw`) não foi lido: a conta conectada tinha assento "View" e o MCP respondia "you don't have edit access to this file". A cópia, criada na conta do Cauã, abriu normalmente. Só houve leitura (`get_metadata`, `get_design_context`, `get_screenshot`, `download_assets`); nada foi escrito no Figma. O acesso fica registrado no histórico da conta, como esperado.

## Frames

15 frames de topo, 9 desktop (1440 px) e 6 mobile (414 px). A tabela mostra a rota implementada e como foi conferido.

| Frame (ID) | Tamanho | Rota / componente | Conferência |
| --- | --- | --- | --- |
| Desktop / Início (`2:2`) | 1440 × 3668 | `/` e `/mercado`, `features/catalog` | Screenshot do app lado a lado com o frame; baseline Playwright |
| Desktop / Detalhes do NFT (`10:244`) | 1440 × 2246 | `/nft/$id`, `features/nft` | Idem |
| Desktop / Carrinho de NFTs (`11:1278`) | 1440 × 1754 | `/carrinho`, `features/cart` | Idem |
| Desktop / Pagamento (`11:2862`) | 1440 × 1657 | `/pagamento`, `features/checkout` | Idem |
| Desktop / Confirmação de Pedido (`11:4385`) | 1440 × 1657 | `/pedido/$orderId`, `features/orders` | Screenshot do app |
| Desktop / Login (`9:115`) | 1440 × 1981 | diálogo em `features/auth` | Screenshot do app |
| Desktop / Cadastro (`9:1022`) | 1440 × 1981 | diálogo em `features/auth` | Screenshot do app |
| Desktop / Perfil do Colecionador (`9:1238`) | 1440 × 1080 | `/perfil`, `features/account` | Screenshot do app |
| Desktop / Carteiras (`9:1670`) | 1440 × 1080 | `/perfil/carteiras` | Screenshot do app |
| Mobile / Início (`14:5226`) | 414 × 896 | `/` em < 768 px | Screenshot do app; baseline Playwright |
| Mobile / Detalhes do NFT (`15:5536`) | 414 × 896 | `/nft/$id` em < 768 px | Idem |
| Mobile / Carrinho de NFTs (`16:360`) | 414 × 896 | `/carrinho` em < 768 px | Idem |
| Mobile / Pagamento (`16:748`) | 414 × 896 | `/pagamento` em < 768 px | Idem |
| Mobile / Login (`16:1022`) | 414 × 896 | diálogo em < 768 px | Screenshot do app |
| Mobile / Cadastro (`16:1228`) | 414 × 896 | diálogo em < 768 px | Screenshot do app |

## Revisão de 20/10/2026

Nova leitura da cópia pelo Figma MCP (somente leitura: `get_screenshot`, `get_metadata`, `download_assets`). Os 15 frames foram baixados e comparados: 13 na primeira rodada e Mobile / Login (`16:1022`) e Mobile / Cadastro (`16:1228`) numa segunda, depois que o limite de chamadas do plano Starter liberou.

Cada frame foi comparado com a tela do build (`pnpm build` + `pnpm preview`) em 1440 px e 414 px, além das baselines do Playwright em 390 px. Desvios corrigidos nesta revisão:

| Tela | Desvio | Correção |
| --- | --- | --- |
| Carrinho (desktop) | Colunas Preço/Edições/Total estreitas; o preço quebrava em duas linhas | Larguras do Figma em `xl` (138/136/145 px) e valores sem quebra |
| Pagamento e Carteiras | Rádios e checkbox nativos (brancos) | Anel cor de cobre do Figma (`radio-control`, `check-control` em `styles.css`) |
| Pagamento (desktop) | Título do NFT no resumo quebrava sem limite | Até duas linhas, preço e quantidade sem quebra |
| Início (mobile e promos) | Ícone "Arrow - Right" exportado na vertical: aparecia "EXPLORAR ↓"; nas promos, seta cobre sobre botão cobre | Rotação de -90° como no frame; promos usam a versão escura do ícone |
| Início (mobile) | Título do hero quebrava em três linhas em 390 px; faltavam os pontos do carrossel | Título em duas linhas com tamanho proporcional à largura; pontos do frame (`hero-dots-mobile.svg`) |
| Confirmação | Botão "Ver no Etherscan" menor que no frame (30 px) | 47 px, texto 15 px |
| Perfil e Carteiras | Barra lateral esticava até o fim do formulário | Altura do conteúdo, como no frame |
| Cadastro (mobile) | Botão "Criar conta"; o frame mobile usa "Criar perfil" (o desktop usa "Criar conta") | Rótulo de cada frame |
| Pagamento (mobile) | Coinbase com a letra "C" e ordem MetaMask/WalletConnect/Coinbase | Ícone "Iconly/Curved/Wallet" exportado do frame (`src/assets/icons/wallet.svg`) e ordem WalletConnect, MetaMask, Coinbase |

## Como as referências foram obtidas

- Contexto de design e screenshots por frame foram baixados para um diretório temporário fora do repositório (`/tmp/figma`). A comparação foi feita abrindo o app em 1440 e 390 e conferindo posição, tamanho, tipografia e cores com o frame correspondente.
- Cores, tipografia (Roboto Mono variável) e espaçamentos viraram tokens em `src/styles.css`. Valores que o Figma não define não foram inventados.
- Imagens de NFT: as quatro artes usadas nos frames (dourado, esmeralda, ivory e violeta, em 400 e 800 px WebP) estão em `src/assets/nfts`. As 36 fixtures reaproveitam essas artes; não há imagem criada fora do Figma. Ícones SVG vêm dos assets exportados do arquivo e estão em `src/assets/icons`.

## Divergências e decisões onde o Figma é omisso

- **Contagens da barra lateral**: o Figma mostra números estáticos por coleção e rede. O app usa as facetas reais calculadas pela API sobre o resultado filtrado, então os números mudam com a busca.
- **Carrosséis**: o Figma mostra pontos estáticos; o app usa rolagem nativa com os pontos como indicador.
- **Perfil no mobile**: não há frame mobile de perfil nem de carteiras. As abas viram uma faixa horizontal rolável; os formulários empilham.
- **Avaliações**: o Figma mostra apenas nota média; não existe lista de avaliações.
- **ID do token**: o Figma exibe "ID do token"; o domínio do app trabalha com edições, então aparece "Edição X".
- **Tablet (768 px)**: não há frame. Abaixo de 1024 px os layouts de detalhe, carrinho e pagamento empilham; a troca entre variante mobile e desktop acontece em 768 px.
- **Continuar explorando**: no Figma não há destino; leva ao mercado.
- **Ver no Etherscan**: não existe transação real, então o botão abre um diálogo "Explorador simulado" com o hash, a rede e os valores que a API devolveu, em vez de um link externo que não teria o registro.
- **Ordem das carteiras no pagamento**: o Figma mostra um chip combinado e só duas opções na lista; o app lista as três carteiras aceitas pela API (MetaMask, WalletConnect, Coinbase Wallet), cada uma selecionável.
- **Carteira selecionada no mobile**: ganha borda cor de cobre, para o estado não depender só do rádio.

O gate de fidelidade visual não é "validado" por métrica automática: a conferência foi visual, por screenshot, e a regressão visual do Playwright só protege contra mudanças futuras (baselines geradas pelo próprio app).
