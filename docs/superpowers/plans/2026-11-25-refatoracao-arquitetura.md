# Refatoração incremental da arquitetura — Plano de implementação

> **Para agentes de implementação:** use a skill `superpowers:executing-plans` para executar este plano tarefa por tarefa. Todas as etapas usam a sintaxe de checkbox para acompanhamento.

**Objetivo:** Separar coordenação da aplicação, apresentação e integração HTTP da consulta e manutenção de lotes, preservando o comportamento e os contratos atuais.

**Arquitetura:** `BatchConsultationPage` manterá formulário e estado estritamente visual. Um `BatchConsultationStore` em `application` coordenará pesquisa, paginação, seleção e operações. `BatchApi` será movida para `infrastructure`; `core/http` manterá o catálogo de endpoints e um cliente HTTP compartilhado, enquanto `domain/batch.ts` permanece como fonte dos tipos.

**Stack:** Angular 21 standalone, TypeScript 5.9, Signals, RxJS, Reactive Forms, HttpClient, Vitest via `ng test`.

**Desenho:** `docs/superpowers/specs/2026-11-25-refatoracao-arquitetura-design.md`

## Restrições globais

- Preservar filtros, paginação, seleção, criação, edição, visualização, exclusão, mudança de situação, mensagens e validações atuais.
- Manter endpoints e formatos de request/response do mock.
- Não alterar layout, textos, regras de negócio, servidor mock, dados ou dependências.
- Manter componentes standalone e APIs atuais do Angular.
- A camada HTTP deve ser proporcional aos endpoints efetivamente utilizados.

## Foco de revisão

- Requisições concorrentes de pesquisa: uma resposta antiga não deve substituir o resultado da pesquisa mais recente (`switchMap`).
- Erros HTTP e conflito 409 nas ações de lote: a interface deve continuar apresentando mensagens adequadas e liberando indicadores de carregamento.
- Exclusão do único lote da última página: a consulta deve voltar para a página ainda existente.
- Filtros alterados no formulário após pesquisar: avançar página deve usar os últimos filtros submetidos.
- Criação/edição com seleção alterada ou detalhe indisponível: não deve salvar uma ação para lote incorreto e deve informar o erro existente.

---

## Arquivos e responsabilidades

- Criar `src/app/core/http/IEndpoint/IEndpoint.ts`: contrato genérico tipado do endpoint, incluindo extração dos parâmetros de caminho.
- Criar `src/app/core/http/defineEndpoint.class.ts`: fábrica tipada de endpoints.
- Criar `src/app/core/http/httpClient.class.ts`: wrapper do `HttpClient` do Angular para executar endpoints, construir URL/query e padronizar erros preservando status e mensagem.
- Criar `src/app/core/http/httpMethod.class.ts`: enum `HttpMethod` dos verbos utilizados.
- Criar `src/app/core/http/endpoints/BatchEndpoints.ts`: catálogo das rotas `/api/batches`, `/api/batches/status`, `/api/current-accounts/:number` e `/api/batch-entry-options`.
- Criar `src/app/features/batch-consultation/infrastructure/batch-api.ts`: adaptar operações de lote aos endpoints compartilhados.
- Remover `src/app/features/batch-consultation/data/batch-api.ts` depois de atualizar imports.
- Criar `src/app/features/batch-consultation/application/batch-consultation.store.ts`: estado Signals, coordenação RxJS e ações da funcionalidade.
- Atualizar `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`: formulário, estado de abertura do editor/diálogos e ligação de eventos da interface ao store.
- Atualizar testes das APIs e da página; adicionar testes de unidade do cliente HTTP e do store conforme as etapas.
- Manter `domain/batch.ts`, templates, estilos e servidor mock sem alteração funcional; ajustar somente o tipo de erro reconhecido pelo editor para continuar tratando conta 404 como não encontrada após a normalização HTTP.

## Plano de execução

### Tarefa 1: Cliente HTTP compartilhado e catálogo de endpoints

**Arquivos:** criar os arquivos de `src/app/core/http`; criar `src/app/core/http/httpClient.class.spec.ts`.

**Interfaces produzidas:** `HttpMethod`; `IEndpoint<TPath extends string, TResponse>`; `defineEndpoint<TResponse>()(method, path)`; `HttpClient.request(endpoint, options)` retornando `Observable<TResponse>`. Opções suportam `queryParams`, `body` e parâmetros de caminho nomeados. Endpoints sem parâmetros de caminho não exigem options.

- [x] Escrever testes para GET sem parâmetros, query omitindo `null`/string vazia, interpolação codificada de `:number`, ausência de parâmetro de path e conversão de `HttpErrorResponse` para erro com status e mensagem preservados.
- [x] Rodar `npm test -- --watch=false` e confirmar falha dos novos testes por ausência dos arquivos/API.
- [x] Implementar `IEndpoint` com `PathParamNames` e `HasPathParams`, `defineEndpoint`, `HttpMethod`, cliente HTTP e catálogo `BatchEndpoints` para todos os caminhos atualmente chamados por `BatchApi`.
- [x] Rodar `npm test -- --watch=false` e confirmar os novos testes passando.
- [x] Revisar `git diff --check` e registrar o resultado.

### Tarefa 2: Adaptador de infraestrutura

**Arquivos:** criar `infrastructure/batch-api.ts` e `infrastructure/batch-api.spec.ts`; remover `data/batch-api.ts` e seu spec; atualizar imports consumidores.

**Interfaces consumidas:** `BatchEndpoints` e `HttpClient` compartilhado da Tarefa 1. **Produzidas:** mesmos oito métodos e assinaturas públicas da classe atual `BatchApi`: `list`, `updateStatus`, `get`, `create`, `update`, `delete`, `getCurrentAccount`, `getEntryOptions`.

- [x] Escrever/ajustar testes para os oito métodos, verificando método, URL, query e body; cobrir filtro `ALL` omitido e codificação do número de conta.
- [x] Rodar `npm test -- --watch=false` e observar a falha dos imports ou chamadas ainda ligados à implementação antiga.
- [x] Implementar `BatchApi` por meio do `HttpClient` compartilhado e de `BatchEndpoints`; preservar os contratos de `domain/batch.ts`.
- [x] Atualizar os imports consumidores sem deixar referências à pasta `data`.
- [x] Rodar os testes e confirmar que todos os requests mantêm o mesmo contrato.

### Tarefa 3: Store da aplicação

**Arquivos:** criar `application/batch-consultation.store.ts` e seu spec; mover a coordenação da página para o store.

**Interface produzida:** store fornecido via `providedIn: 'root'`, com Signals públicos para `page`, `batches`, `total`, `loading`, `hasSearched`, `errorMessage`, `selectedIds`, `actionMessage`, `actionError`, `actionLoading`, `editorSaving`, `editorError`, e computed para `selectedBatch`, `canSubmit`, `canConfirm`, `allVisibleSelected`, `totalPages`; métodos `search`, `goToPage`, `toggleBatch`, `toggleVisible`, `changeStatus`, `loadBatch`, `saveBatch` e `deleteSelected`. O formulário e os sinais de abertura de diálogos/editor permanecem na página.

- [x] Escrever testes do store para pesquisa e filtros submetidos, cancelamento de resposta antiga, seleção e habilitação de ação, mudança de situação, criação, proteção contra salvar lote após alteração de seleção e exclusão com atualização da grade.
- [x] Cobrir exclusão do único item da última página; a apresentação também cobre o erro HTTP 404 da consulta de conta.
- [x] Rodar os testes novos e confirmar falha porque o store ainda não existe.
- [x] Implementar o store usando `BatchApi` da infraestrutura, Signals e RxJS; garantir encerramento de subscriptions com `takeUntilDestroyed`.
- [x] Rodar os testes do store e confirmar que cada fluxo coberto passa.

### Tarefa 4: Página como camada de apresentação

**Arquivos:** atualizar `presentation/batch-consultation.page.ts` e seu spec; ajustar a classificação de erro de conta em `presentation/batch-entry-editor.component.ts` e cobri-la em spec; atualizar providers/test doubles de teste conforme necessário.

**Interface consumida:** `BatchConsultationStore` da Tarefa 3. A página continua responsável pelo Reactive Form, conversão de valores do formulário em `BatchFilters`, erro de faixa, abertura/fechamento de modais e entrega de dados/eventos ao editor.

- [x] Adaptar os testes de apresentação para verificar filtros, carregamento inicial, navegação e ligação do estado do store à página.
- [x] Adicionar teste para confirmar que um `ApiError` 404 da consulta de conta continua classificado como conta não encontrada e que falhas de conexão continuam indisponíveis.
- [x] Confirmar que o teste de integração falha enquanto página e store fazem consultas separadas.
- [x] Remover da página o estado e os handlers que pertencem ao store; delegar a coordenação sem alterar HTML, SCSS ou validações.
- [x] Rodar testes de página, store, infraestrutura e cliente HTTP; os testes existentes de filtro em centavos, paginação e erro de faixa permanecem passando.

### Tarefa 5: Verificação final da feature

**Arquivos:** conferir todos os arquivos da funcionalidade, imports e documentação de desenho/plano.

- [x] Rodar `npm test -- --watch=false`; esperado: todos os arquivos e testes passam sem modo watch (6 arquivos, 26 testes).
- [x] Rodar `npm run build`; esperado: build Angular completo, sem erros de compilação. O aviso de budget CSS conhecido permanece: 4.37 kB contra 4.00 kB.
- [x] Rodar `git diff --check`; esperado: nenhum problema de whitespace.
- [x] Revisar o diff completo garantindo que servidor mock, contratos e apresentação visual não foram alterados.
- [x] Fazer revisão independente do diff e preparar o resumo para o usuário; não fazer merge automaticamente.
