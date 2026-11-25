# Plano de implementação: manutenção de lotes

> **Execução:** trabalhar etapa por etapa nesta sessão e marcar as caixas. Fazer um commit ao concluir cada etapa integrada.

**Objetivo:** permitir incluir, consultar, alterar e excluir lotes abertos com seus lançamentos, usando o mock Bun e a tela Angular existentes.

**Arquitetura:** manter os tipos do domínio e chamadas HTTP em `domain` e `data`; o mock Bun valida e calcula os dados derivados do lote. Um componente standalone edita lançamentos localmente e a página de consulta o usa nos modos incluir, alterar e visualizar, além de confirmar exclusões.

**Tecnologias:** Angular standalone, Reactive Forms, signals, HttpClient, RxJS, Bun.

**Desenho aprovado:** [2026-11-25-desenho-manutencao-lotes.md](../specs/2026-11-25-desenho-manutencao-lotes.md)

## Restrições globais

- Manter nomes em inglês no código e rótulos em português na interface.
- Não adicionar dependências de execução.
- Um lote salvo precisa conter pelo menos um lançamento.
- Conta corrente precisa existir; valor de lançamento deve ser maior que zero; histórico, PA e documento são obrigatórios.
- Documento tem limite de 20 caracteres; descrição tem limite de 200 caracteres.
- Lançamentos usam `estorno: boolean`; valores são inteiros em centavos no domínio e na API; estornos são subtraídos do total.
- Situação do lançamento começa pendente e é somente leitura.
- Lotes criados começam abertos; apenas lotes abertos podem ser alterados ou excluídos.
- O mock mantém dados em memória e volta aos dados iniciais quando reiniciado.
- Manter os filtros ativos ao atualizar a consulta após salvar ou excluir.

## Pontos de revisão

- Conta inexistente ou API de consulta indisponível deve impedir salvar e exibir erro compreensível.
- Valor vazio, zero, negativo ou não numérico deve impedir incluir/alterar lançamento.
- Documento e descrição nos limites permitidos devem ser aceitos; valores acima dos limites devem ser rejeitados.
- Total de lançamentos com estorno deve subtrair valores marcados, sem converter centavos em ponto flutuante no domínio.
- Lote sem lançamentos não deve ser salvo.
- Requisições de alteração/exclusão contra lote enviado ou confirmado devem receber conflito e manter o dado intacto.
- Excluir o único item da última página deve levar à página anterior e atualizar os resultados.

---

### Etapa 0: registrar desenho e plano aprovados

**Arquivos:**

- Adicionar: `docs/superpowers/specs/2026-11-25-desenho-manutencao-lotes.md`
- Adicionar: `docs/superpowers/plans/2026-11-25-manutencao-de-lotes.md`

- [x] Commit: `docs: registra desenho e plano de manutenção de lotes`.

### Etapa 1: modelos e API cliente

**Arquivos:**

- Alterar: `src/app/features/batch-consultation/domain/batch.ts`
- Alterar: `src/app/features/batch-consultation/data/batch-api.ts`

**Interfaces a produzir:**

- `BatchEntry`: `{ id: number; accountNumber: string; accountHolder: string; amountCents: number; history: string; reversal: boolean; document: string; description: string; status: 'PENDING'; servicePoint: string }`.
- `BatchDetail extends Batch`: propriedade `entries: BatchEntry[]`.
- `BatchEntryOptions`: `{ histories: string[]; servicePoints: string[] }`.
- `CurrentAccount`: `{ number: string; holder: string }`.
- `BatchSaveRequest`: `{ entries: BatchEntry[] }`.
- Métodos de `BatchApi`: `get(id): Observable<BatchDetail>`, `create(body): Observable<BatchDetail>`, `update(id, body): Observable<BatchDetail>`, `delete(id): Observable<void>`, `getCurrentAccount(number): Observable<CurrentAccount>`, `getEntryOptions(): Observable<BatchEntryOptions>`.

- [ ] Adicionar os tipos mantendo `Batch` como o modelo compacto usado pela listagem.
- [ ] Implementar os métodos HTTP: `GET /api/batches/:id`, `POST /api/batches`, `PUT /api/batches/:id`, `DELETE /api/batches/:id`, `GET /api/current-accounts/:number` e `GET /api/batch-entry-options`.
- [ ] Conferir as assinaturas e rotas com `git diff --check`; não alterar ainda a interface da página.
- [ ] Commit: `feat: define API de manutenção de lotes`.

### Etapa 2: mock de lançamentos e operações de lote

**Arquivos:**

- Alterar: `server/index.ts`

**Interfaces consumidas:** tipos da Etapa 1; manter as rotas existentes de consulta e situação.

- [ ] Incluir dados estáveis de contas, históricos e PAs; expor `GET /api/current-accounts/:number` e `GET /api/batch-entry-options`.
- [ ] Manter detalhes de lançamentos junto aos lotes em memória, com itens determinísticos para os dados iniciais; `GET /api/batches` continua respondendo apenas os resumos.
- [ ] Implementar `GET /api/batches/:id`, `POST /api/batches`, `PUT /api/batches/:id` e `DELETE /api/batches/:id`.
- [ ] Validar conta existente, valor positivo, lista não vazia e campos obrigatórios. Recalcular `amountCents` com estornos e `entryCount` no servidor.
- [ ] Para `PUT` e `DELETE`, retornar 409 quando o lote não estiver `OPEN`; validar antes de mutar para não deixar alteração parcial.
- [ ] Conferir manualmente as rotas com conta válida/inválida, criação, leitura, alteração, exclusão e tentativa de alterar lote não aberto; conferir também o total com estorno.
- [ ] Commit: `feat: implementa operações de lote no mock`.

### Etapa 3: editor de lançamentos

**Arquivos:**

- Criar: `src/app/features/batch-consultation/presentation/batch-entry-editor.component.ts`
- Criar: `src/app/features/batch-consultation/presentation/batch-entry-editor.component.html`
- Criar: `src/app/features/batch-consultation/presentation/batch-entry-editor.component.scss`

**Interfaces a produzir:**

- Inputs: `entries: BatchEntry[]`, `mode: 'create' | 'edit' | 'view'`, `saving: boolean`.
- Output: `save: BatchEntry[]`, `cancel: void`.

- [ ] Criar formulário reativo com conta corrente, valor em reais, histórico, estorno, documento, descrição, situação somente leitura e PA.
- [ ] Consultar a conta após validação sintática e debounce de 400 ms; mostrar titular, conta não encontrada e falha de consulta separadamente.
- [ ] Carregar opções de histórico e PA pelo `BatchApi`.
- [ ] Apresentar o editor em um modal acessível, com título associado, fechamento por Escape e botão para cancelar.
- [ ] Manter linhas em estado local até Salvar; adicionar, alterar, visualizar, excluir e duplicar uma linha selecionada.
- [ ] Converter reais para centavos na saída e calcular o total usando centavos inteiros, subtraindo estornos.
- [ ] Em modo `view`, tornar todos os campos e ações de edição somente leitura; em `edit`, iniciar com as linhas recebidas.
- [ ] Conferir manualmente inclusão/alteração de linha, validações e total em reais; executar `git diff --check`.
- [ ] Commit: `feat: adiciona editor de lançamentos`.

### Etapa 4: inclusão, alteração e visualização de lotes

**Arquivos:**

- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`

**Interfaces consumidas:** `BatchApi.get/create/update`; `BatchEntryEditorComponent`.

- [ ] Adicionar as ações Incluir, Alterar e Visualizar; exigir seleção única para Alterar/Visualizar e permitir Alterar apenas para lote aberto.
- [ ] Ao incluir, abrir o editor vazio; ao alterar/visualizar, carregar `GET /api/batches/:id` antes de abrir.
- [ ] No modo incluir, chamar `create`; no modo alterar, chamar `update` com a lista completa de lançamentos.
- [ ] Desabilitar salvamento sem lançamentos e durante requisição; mostrar erro da API e fechar o editor somente em sucesso.
- [ ] Em sucesso, atualizar a página atual com os filtros ativos e limpar a seleção.
- [ ] Conferir manualmente incluir, alterar, visualizar, cancelamento sem salvar, erro 409 e preservação dos filtros.
- [ ] Commit: `feat: integra cadastro e edição de lotes`.

### Etapa 5: exclusão de lotes

**Arquivos:**

- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Alterar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`

**Interface consumida:** `BatchApi.delete(id): Observable<void>`.

- [ ] Adicionar ação Excluir, habilitada para uma seleção única de lote aberto.
- [ ] Exibir confirmação com o ID do lote; permitir cancelar sem chamar API.
- [ ] No aceite, chamar `DELETE /api/batches/:id`; manter a confirmação aberta e mostrar erro se a API falhar.
- [ ] No sucesso, fechar confirmação e atualizar os resultados; se a página atual ficar vazia, navegar para a página anterior.
- [ ] Conferir manualmente cancelamento, exclusão de lote aberto, conflito para lote fechado e remoção do último item da última página.
- [ ] Commit: `feat: adiciona exclusão de lotes`.

### Etapa 6: revisão e entrega

**Arquivos:**

- Revisar todos os arquivos alterados nas etapas anteriores.
- Atualizar: `IMPLEMENTACAO-E-MERGE.md` somente depois do merge, sem adicioná-lo ao Git.

- [ ] Fazer code review próprio do diff completo e resolver achados bloqueadores.
- [ ] Conferir `git diff --check` e estado do repositório; o relatório de raiz deve permanecer sem commit.
- [ ] Solicitar que a pessoa usuária execute `npm test` e `npm run build` manualmente.
- [ ] Após receber os resultados, integrar a feature em `develop` com merge commit.
- [ ] Atualizar o relatório da raiz com commits, merge, revisão e resultados manuais, mantendo-o fora do commit.
