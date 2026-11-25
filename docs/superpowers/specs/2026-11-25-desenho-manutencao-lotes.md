# Desenho: manutenção de lotes

## Objetivo

Adicionar o fluxo de manutenção de lotes à aplicação contábil para que a pessoa usuária possa criar, consultar, alterar e excluir lotes abertos com seus lançamentos. O formulário deve permitir montar a lista de lançamentos, revisar o total calculado e salvar a lista completa em uma única operação.

## Resultados esperados

- Criar um formulário reutilizável para inclusão, alteração e visualização somente para leitura.
- Permitir incluir, alterar, visualizar, excluir e duplicar lançamentos antes de salvar o lote.
- Validar a conta corrente de forma assíncrona e exibir o nome do titular.
- Carregar do mock da API as opções de histórico e posto de atendimento (PA).
- Calcular o total do lote a partir dos lançamentos, subtraindo os estornos.
- Adicionar à API operações para criar, consultar detalhes, alterar e excluir lotes.
- Permitir alteração e exclusão somente enquanto o lote estiver aberto; exibir conflitos retornados pelo servidor.
- Pedir confirmação antes de excluir um lote.
- Atualizar a consulta após uma alteração bem-sucedida, preservando os filtros ativos e a página sempre que possível.
- Manter nomes em inglês no código e rótulos em português na interface.

## Fora do escopo

- Autenticação, papéis de autorização ou persistência além do mock em memória.
- Alterações nos fluxos atuais de busca, paginação, envio, confirmação e justificativa, exceto para atualizar os resultados após a manutenção.
- Novas dependências de execução.

## Restrições e regras do produto

- A implementação seguirá os padrões atuais de componentes standalone Angular, formulários reativos, signals e `HttpClient`.
- Um lote precisa ter pelo menos um lançamento para ser salvo.
- Cada lançamento terá uma opção de estorno. A situação começa como pendente e não poderá ser editada. Lançamentos marcados como estorno serão subtraídos do total.
- O número da conta corrente precisa ser validado pela consulta à API. O valor deve ser maior que zero; histórico e PA são obrigatórios; documento é obrigatório e limitado a 20 caracteres; descrição é opcional e limitada a 200 caracteres.
- Valores monetários serão armazenados como centavos inteiros no domínio e na API, seguindo o modelo de lote atual; o formulário fará a conversão de e para reais decimais.
- Um lote criado começa aberto. Somente lotes abertos podem ser alterados ou excluídos.
- O mock mantém os lotes em memória; reiniciar o servidor restaura os dados iniciais.
- A implementação ficará em uma branch de feature, com commits incrementais para permitir acompanhar cada parte.

## Abordagens consideradas

1. **Uma feature completa de manutenção (escolhida):** construir formulário, fluxo dos lançamentos, operações da API e fluxos de inclusão, alteração, visualização e exclusão em uma branch, com commits incrementais. Assim, o formulário compartilhado e o fluxo completo ficam juntos, com pontos de revisão ao longo do trabalho.
2. **Separar inclusão de alteração e exclusão em branches diferentes:** entrega uma primeira branch menor, mas exige revisitar o formulário e a API em uma branch posterior. Isso adiciona etapas de integração e adia o fluxo completo de manutenção.

A primeira abordagem foi escolhida porque o formulário e o fluxo de lançamentos são compartilhados entre inclusão, alteração e visualização, e a pessoa usuária quer acompanhar o progresso por commits.

## Desenho da solução

- Ampliar o domínio de lotes com os tipos de lançamento e de detalhe, mantendo a resposta da tabela de consulta compacta.
- Ampliar `BatchApi` com chamadas para listar, consultar detalhes, criar, alterar e excluir lotes, além de consultas auxiliares para contas e opções de lançamento.
- Ampliar o mock Bun com contas, históricos, PAs, consulta de detalhes, inclusão, alteração e exclusão em memória, validações de requisição e restrições por situação.
- Criar um editor standalone de lançamentos com formulário reativo, validação assíncrona da conta, tabela de lançamentos, ações por linha e total calculado.
- Adicionar os modos incluir, alterar e visualizar à tela de consulta. Carregar o lote completo antes de alterar ou visualizar; abrir a confirmação de exclusão somente quando exatamente um lote estiver selecionado.
- Ao salvar, enviar a lista completa de lançamentos; o servidor recalcula valor e quantidade a partir dela. Em caso de sucesso, fechar o formulário e atualizar a consulta ativa. Ao excluir, fechar a confirmação e atualizar a consulta, voltando uma página se a exclusão deixar a página atual vazia.
- Exibir erros de validação e conflitos da API no formulário ou na confirmação correspondente e impedir envios repetidos enquanto uma requisição estiver em andamento.

## Sequência de implementação

1. Adicionar os tipos de domínio e os métodos da API cliente.
2. Adicionar ao mock consultas e operações de contas, opções, detalhes, inclusão, alteração e exclusão, com validação.
3. Construir o formulário e as ações de edição local dos lançamentos.
4. Conectar inclusão, alteração, visualização, confirmação de exclusão e atualização da consulta.
5. Revisar o diff completo e pedir que a pessoa usuária execute os testes e o build manualmente antes do merge.

## Verificação

A pessoa usuária executará manualmente os testes do projeto e o build de produção, como no fluxo atual. A revisão também deve conferir rotas do mock com requisições válidas e inválidas, totais com estornos e bloqueio de alteração/exclusão para lotes que não estejam abertos.
