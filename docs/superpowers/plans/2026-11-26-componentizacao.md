# Componentização da tela de consulta de lotes — Plano de implementação

> **Para agentes de implementação:** SUBSKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. As etapas usam caixas de seleção para acompanhamento.

**Objetivo:** Extrair filtros, ações, resultados/tabela e paginação em componentes Angular focados, preservando os comportamentos atuais da consulta.

**Arquitetura:** `BatchConsultationPage` permanece como componente coordenador e único ponto de integração com `BatchConsultationStore`. Os componentes de apresentação recebem estado por inputs e comunicam intenção por outputs; `BatchFilterFormComponent` também será dono do seu formulário e das conversões dos filtros.

**Tecnologias:** Angular 21, TypeScript, Reactive Forms, Signals, Vitest.

**Especificação:** `docs/superpowers/specs/2026-11-25-componentizacao-tela-consulta-design.md`

## Restrições globais

- Os filhos não acessam `BatchConsultationStore` nem `BatchApi`.
- O formulário mantém os validadores atuais: limites de tamanho, mínimos numéricos e ordenação dos pares ID, valor e data.
- Os filtros só são aplicados ao submeter; limpar restaura os controles sem executar pesquisa.
- A tabela mantém seleção, estados vazio/carregando, rótulos e formatação atuais.
- Manter acessibilidade, textos em português e os fluxos atuais da tela.
- Zod, endpoints, store, modelos de domínio, diálogos e editor de lançamentos ficam fora desta mudança.

## Foco da revisão

- Intervalos inválidos de ID, valor e data devem impedir a pesquisa e mostrar apenas os erros correspondentes — coberto na tarefa 1.
- Valores em reais devem continuar sendo convertidos para centavos e a paginação deve usar os últimos filtros submetidos — coberto na tarefa 1 e no teste de integração da página.
- Habilitação das ações deve continuar dependendo da seleção, do status do lote e do carregamento — coberto na tarefa 2.
- Seleção individual e seleção de todos os itens visíveis devem emitir os identificadores/valores corretos — coberto na tarefa 3.
- Estados vazio, carregando e limites da paginação devem continuar acessíveis e impedir navegação inválida — coberto nas tarefas 3 e 4.

---

### Task 0: Registrar os documentos aprovados

**Arquivos:**
- Adicionar ao commit: `docs/superpowers/specs/2026-11-25-componentizacao-tela-consulta-design.md`
- Adicionar ao commit: `docs/superpowers/plans/2026-11-26-componentizacao.md`

- [ ] Depois da aprovação deste plano, commitar os documentos antes das alterações de código.
- [ ] Commit: `docs: planeja componentização da consulta de lotes`

### Task 1: Extrair formulário de filtros

**Arquivos:**
- Criar: `src/app/features/batch-consultation/presentation/batch-filter-form.component.ts`
- Criar: `src/app/features/batch-consultation/presentation/batch-filter-form.component.html`
- Criar: `src/app/features/batch-consultation/presentation/batch-filter-form.component.scss`
- Criar: `src/app/features/batch-consultation/presentation/batch-filter-form.component.spec.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.spec.ts`

**Interface produzida:** `loading = input(false)` e `search = output<BatchFilters>()`. O componente mantém o formulário internamente; limpar restaura os controles sem emitir `search`.

- [ ] Adicionar testes do componente para intervalos inválidos, conversão de valores em reais para centavos, trim dos campos de texto e limpeza sem submissão.
- [ ] Executar `npm test -- --watch=false` e confirmar falha inicial nos testes novos.
- [ ] Mover `FormGroup`, `orderedRange`, `submit`, `clear`, conversão para centavos, estado expandido/recolhido e marcação de erros para o componente de filtros.
- [ ] Alterar a página para receber `(search)` e encaminhar o `BatchFilters` ao `store.search`.
- [ ] Mover os estilos específicos do formulário para a folha SCSS do novo componente.
- [ ] Executar `npm test -- --watch=false`; confirmar que testes do componente e da página passam, inclusive paginação usando o último filtro submetido.
- [ ] Commit: `feat: extrai formulário de filtros`

### Task 2: Extrair barra de ações

**Arquivos:**
- Criar: `src/app/features/batch-consultation/presentation/batch-actions.component.ts`
- Criar: `src/app/features/batch-consultation/presentation/batch-actions.component.html`
- Criar: `src/app/features/batch-consultation/presentation/batch-actions.component.scss`
- Criar: `src/app/features/batch-consultation/presentation/batch-actions.component.spec.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.spec.ts`

**Interface produzida:** `selectedBatch = input<Batch | null>(null)`, `canConfirm = input(false)`, `canSubmit = input(false)`, `loading = input(false)` e `actionLoading = input(false)`; outputs `create`, `edit`, `view`, `delete`, `confirm`, `submit` e `showJustification`, todos do tipo `output<void>()`.

- [ ] Adicionar testes para estado habilitado/desabilitado dos sete botões e emissão do output correspondente ao clique.
- [ ] Executar `npm test -- --watch=false` e confirmar falha inicial nos testes novos.
- [ ] Mover somente o markup e estilos da barra de ações para `BatchActionsComponent`; não injetar store nem API.
- [ ] Conectar os outputs na página aos handlers existentes.
- [ ] Executar `npm test -- --watch=false`; confirmar os testes do componente e os fluxos atuais da página.
- [ ] Commit: `refactor: extrai barra de ações da consulta`

### Task 3: Extrair resultados e tabela

**Arquivos:**
- Criar: `src/app/features/batch-consultation/presentation/batch-table.component.ts`
- Criar: `src/app/features/batch-consultation/presentation/batch-table.component.html`
- Criar: `src/app/features/batch-consultation/presentation/batch-table.component.scss`
- Criar: `src/app/features/batch-consultation/presentation/batch-table.component.spec.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.spec.ts`

**Interface produzida:** `batches = input.required<Batch[]>()`, `total = input.required<number>()`, `loading = input(false)`, `hasSearched = input(false)`, `selectedIds = input.required<ReadonlySet<number>>()`, `allVisibleSelected = input(false)` e `actionLoading = input(false)`; outputs `batchSelectionChange = output<{ id: number; checked: boolean }>()` e `visibleSelectionChange = output<boolean>()`.

- [ ] Adicionar testes para carregamento, estado vazio antes/depois de pesquisar, total, formato de moeda/data/status e outputs de seleção individual e visível.
- [ ] Executar `npm test -- --watch=false` e confirmar falha inicial nos testes novos.
- [ ] Mover cabeçalho de resultados, overlay de carregamento, tabela, estado vazio e funções de formatação para `BatchTableComponent`.
- [ ] Encaminhar outputs para `store.toggleBatch` e `store.toggleVisible` na página.
- [ ] Mover estilos da tabela/resultados para a folha SCSS do componente.
- [ ] Executar `npm test -- --watch=false`; confirmar os testes do componente e a integração existente da página.
- [ ] Commit: `refactor: extrai tabela de lotes`

### Task 4: Extrair paginação e fechar integração

**Arquivos:**
- Criar: `src/app/features/batch-consultation/presentation/batch-pagination.component.ts`
- Criar: `src/app/features/batch-consultation/presentation/batch-pagination.component.html`
- Criar: `src/app/features/batch-consultation/presentation/batch-pagination.component.scss`
- Criar: `src/app/features/batch-consultation/presentation/batch-pagination.component.spec.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.ts`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.html`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.scss`
- Modificar: `src/app/features/batch-consultation/presentation/batch-consultation.page.spec.ts`

**Interface produzida:** `page = input.required<number>()`, `totalPages = input.required<number>()`, `loading = input(false)` e `pageChange = output<number>()`.

- [ ] Adicionar testes para primeira, anterior, próxima e última página, incluindo desabilitação nas extremidades e durante carregamento.
- [ ] Executar `npm test -- --watch=false` e confirmar falha inicial nos testes novos.
- [ ] Mover markup, acessibilidade e estilos da navegação para `BatchPaginationComponent`; conectar `(pageChange)` ao `store.goToPage`.
- [ ] Remover da página imports, campos, métodos e estilos que se tornaram responsabilidade dos filhos; preservar diálogos e editor no componente pai.
- [ ] Executar `npm test -- --watch=false` e `npm run build`; confirmar todos os testes e build bem-sucedidos, registrando eventual aviso de orçamento SCSS existente.
- [ ] Commit: `refactor: extrai paginação de lotes`

## Auto-revisão do plano

- Cada seção do design está coberta: filtros na tarefa 1, ações na tarefa 2, tabela na tarefa 3, paginação na tarefa 4 e coordenação pai/filho durante todas as integrações.
- Os contratos de inputs/outputs declarados nas tarefas correspondem às ligações feitas pela página e não dão acesso ao store/API aos filhos.
- Os comportamentos de pesquisa, conversão, seleção, estados da tabela, habilitação de ações e navegação têm verificações associadas às tarefas que os implementam.
- Os diálogos, editor, store, domínio, API e Zod permanecem fora do escopo.
