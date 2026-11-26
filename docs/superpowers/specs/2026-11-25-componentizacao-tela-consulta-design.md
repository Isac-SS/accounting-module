# Design: Componentização da tela de consulta de lotes

## Intenção

Dividir o template da consulta de lotes em componentes Angular com responsabilidades claras, para facilitar leitura, manutenção e explicação em uma avaliação técnica. A tela deve manter o comportamento atual.

## Estado atual

`BatchConsultationPage` concentra a montagem do formulário de filtros, as regras de validação e conversão dos valores, os comandos da tela e o template de filtros, ações, tabela, paginação e diálogos. O editor de lançamentos já é um componente separado. A página conversa com `BatchConsultationStore`, que mantém os dados e operações da consulta.

## Objetivos

- Reduzir o tamanho do template e a quantidade de responsabilidades da página.
- Dar ao formulário de filtros uma responsabilidade própria, incluindo validação, conversão de valores e emissão dos filtros aplicados.
- Manter a página como coordenadora da interação com o store.
- Extrair componentes de apresentação para ações, resultados/tabela e paginação, usando entradas e eventos explícitos.
- Preservar acessibilidade, textos em português e comportamentos atuais.

## Fora de escopo

- Adotar Zod ou alterar a estratégia de validação nesta etapa.
- Alterar endpoints, store, modelos de domínio ou regras de negócio.
- Mover para componentes os diálogos de justificativa e exclusão, ou o editor de lançamentos já existente.
- Reestilizar ou mudar o fluxo da tela.

## Abordagens consideradas

1. **Componentes somente visuais:** a página continuaria dona do formulário, das validações e dos dados, passando valores para filhos de apresentação. É a opção de menor risco, mas manteria na página boa parte da lógica hoje concentrada.
2. **Componentes por responsabilidade (selecionada):** o formulário de filtros passa a ser dono do seu formulário e emite um objeto `BatchFilters`; ações, tabela e paginação recebem dados e emitem eventos; a página coordena esses eventos com o store. Isso reduz a concentração sem duplicar a lógica de negócio.
3. **Filhos com estado e acesso ao store:** cada seção executaria operações diretamente. Foi descartada porque espalharia a coordenação da tela e criaria acoplamento dos componentes ao store.

## Componentes propostos

- `BatchFilterFormComponent`: mantém o `FormGroup`, as validações atuais de campos e intervalos, o estado expandido/recolhido e a conversão de reais para centavos. Emite `search` com `BatchFilters` somente quando válido. Limpar restaura os controles sem executar uma nova pesquisa, como ocorre hoje.
- `BatchActionsComponent`: recebe estado de seleção, permissões para envio/confirmação e estados de carregamento. Emite intenções como incluir, alterar, visualizar, excluir, confirmar, enviar e abrir justificativa. Não injeta o store.
- `BatchTableComponent`: exibe o total, estado de carregamento/vazio e tabela de lotes. Recebe os lotes, seleção e estados de carregamento; emite seleção de um lote ou dos lotes visíveis. Formatação de moeda e datas permanece junto da apresentação da tabela.
- `BatchPaginationComponent`: recebe página atual, total de páginas e carregamento; emite a página solicitada.
- `BatchConsultationPage`: permanece como componente de coordenação. Encaminha filtros e eventos ao store, seleciona os dados para os filhos e continua responsável pelos diálogos e pelo editor.

## Regras de integração e comportamento

- Os filhos não acessam `BatchConsultationStore` nem `BatchApi`.
- Eventos dos filhos descrevem ações; efeitos de consulta, seleção e alteração continuam coordenados pela página/store.
- Filtros só são aplicados ao submeter. Editar campos depois da busca não altera os filtros da paginação até nova submissão.
- O formulário mantém os validadores atuais: limites de tamanho, mínimos numéricos e ordenação dos pares ID, valor e data.
- A tabela mantém seleção de linhas, seleção visível, estados vazio/carregando, rótulos e datas/valores formatados.
- Manter os nomes e semântica acessível dos controles para preservar navegação por teclado e leitores de tela.

## Sequência incremental proposta

1. Extrair o formulário de filtros e sua validação, que é a seção com mais lógica própria.
2. Extrair a barra de ações como componente de apresentação.
3. Extrair tabela/resultados e depois paginação.
4. Remover do componente pai os campos, métodos e imports que deixarem de ser necessários e revisar os bindings entre pai e filhos.

Cada etapa deve permanecer revisável separadamente na branch `feat/componentizacao`.

## Critérios de conclusão

- A página não declara nem renderiza diretamente o formulário, a barra de ações, a tabela ou a paginação.
- Regras de consulta e conversão relacionadas aos filtros pertencem ao `BatchFilterFormComponent`.
- Os componentes filhos não dependem do store nem da API.
- Comportamentos e conteúdo acessível existentes permanecem iguais.
- A implementação segue a estrutura atual de feature em `src/app/features/batch-consultation/presentation`.

## Decisões deixadas para implementação

- Usar `input()`/`output()` ou `@Input()`/`@Output()` de forma consistente com a compatibilidade e o estilo já usado no projeto.
- Escolher nomes finais dos arquivos e tipos de eventos sem alterar os limites de responsabilidade descritos acima.
- Reaproveitar os estilos existentes e movê-los para folhas locais dos componentes extraídos quando necessário, sem mudar o visual.
