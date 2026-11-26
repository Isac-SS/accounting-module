# Desenho: refatoração incremental da arquitetura

## Intenção

Organizar a integração de consulta e manutenção de lotes em camadas mais explícitas.

## Estado atual

`BatchConsultationPage` concentra formulário, estado da tela, coordenação de requisições e ações de lotes. `BatchApi` usa diretamente o `HttpClient` do Angular e contém URLs. Os tipos de domínio já estão em `domain/batch.ts`, e o editor de lançamentos já é um componente separado.

## Abordagens consideradas

1. Refatoração incremental: extrair a coordenação para `application`, organizar a API em `infrastructure` e centralizar endpoints e recursos HTTP em `core/http`.
2. Reestruturação ampla: além da opção incremental, rever modelos e regras do domínio e criar abstrações adicionais por caso de uso.

## Abordagem escolhida

Seguir a opção incremental. Ela aproxima a arquitetura das camadas explícitas sem reescrever contratos de dados nem adicionar abstrações que não sejam necessárias para este projeto.

## Organização proposta

- `features/batch-consultation/domain`: manter os tipos e regras puras de lote.
- `features/batch-consultation/application`: criar um serviço/store responsável por estado de consulta e coordenação das operações.
- `features/batch-consultation/infrastructure`: mover e adaptar `BatchApi` como integração HTTP da funcionalidade.
- `features/batch-consultation/presentation`: manter a página e o editor, reduzindo a página para interação visual e ligação dos formulários/ações ao serviço de aplicação.
- `core/http`: criar um cliente compartilhado e definições tipadas das rotas usadas pela funcionalidade.

## Objetivos

- Preservar filtros, paginação, seleção, criação, edição, visualização, exclusão, mudança de situação, mensagens e validações atuais.
- Manter os endpoints e formatos de request/response do mock.
- Fazer cada camada ter uma responsabilidade demonstrável com o fluxo da consulta de lotes.
- Preservar componentes standalone e as APIs atuais do Angular.

## Fora do escopo

- Alterar tela, layout, textos ou comportamento de negócio.
- Alterar o servidor mock, seus dados ou contratos.
- Renomear modelos do domínio ou traduzir nomes em inglês.
- Criar uma abstração genérica para casos que a aplicação não usa.

## Restrições e decisões de implementação

- Fazer a mudança em etapas curtas e cobrir os fluxos extraídos com testes.
- Não adicionar dependências.
- Manter tratamento de erro compatível com as mensagens atuais.
- A aprovação deste desenho deve anteceder o plano detalhado e as mudanças no código de produção.

## Questões abertas

- Nome final do serviço de aplicação e escolha entre chamar-lhe `Store` ou `Facade` ficam para o plano, seguindo os padrões atuais do projeto.
- A abstração HTTP deve permanecer proporcional aos endpoints efetivamente utilizados.
