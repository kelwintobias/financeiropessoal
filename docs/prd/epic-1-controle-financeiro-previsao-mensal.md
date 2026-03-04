# Epic 1 — Controle Financeiro e Previsão Mensal

**Status:** Ready for Development
**Criado em:** 2026-03-03
**Agente:** Morgan (PM Strategist)
**PRD de Referência:** `docs/prd/kekel-finance.md`

---

## Epic Goal

Implementar o núcleo funcional do Kekel Finance: estrutura base do projeto, gestão completa de gastos com categorias, orçamento mensal com alertas e metas financeiras com progresso visual — entregando uma experiência utilizável e offline-first ao fim do epic.

---

## Existing System Context

> **Projeto:** Greenfield — nenhum código existente.

- **Stack definida:** React + TypeScript + Tailwind CSS + Zustand + Recharts + Vite
- **Persistência:** localStorage (sem backend no MVP)
- **Plataforma:** Web responsivo (mobile-first via browser)
- **Integration points:** Não há sistema legado. Todo estado vive no store Zustand persistido via localStorage.

---

## Enhancement Details

**O que será construído:**
- Scaffolding completo do projeto (Vite + React + TS + Tailwind)
- Modelo de dados central: `Expense`, `Category`, `Budget`, `Goal`
- CRUD de gastos com categorização e filtragem mensal
- Configuração de orçamento por categoria com indicadores e alertas de estouro
- Metas financeiras com aportes e barra de progresso
- Dashboard unificado: resumo mensal, gráfico por categoria, painel de metas

**Como integra:** Todas as features compartilham o mesmo store Zustand (`useFinanceStore`) persistido automaticamente no localStorage via middleware `zustand/middleware/persist`.

**Critérios de sucesso:**
- Usuário consegue registrar um gasto em < 30 segundos
- Dashboard exibe total mensal e breakdown por categoria
- Metas com progresso visual funcionando
- App carrega em < 2s e funciona 100% offline

---

## Stories

### Story 1.1 — Scaffolding e Gestão de Gastos

**Executor:** `@dev`
**Quality Gate:** `@architect`
**Quality Gate Tools:** `[pattern_validation, type_safety_check, accessibility_audit]`

**Descrição:** Inicializar o projeto com Vite + React + TypeScript + Tailwind CSS, configurar o store Zustand com persist middleware, definir os modelos de dados centrais (`Expense`, `Category`) e implementar o CRUD completo de gastos.

**Acceptance Criteria:**
- [ ] Projeto inicializado com Vite, React 18, TypeScript strict mode, Tailwind v3
- [ ] `useFinanceStore` criado com Zustand + persist (localStorage)
- [ ] Tipos: `Expense { id, amount, description, categoryId, date, createdAt }`, `Category { id, name, color, isDefault }`
- [ ] Categorias padrão seed: Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Outros
- [ ] Tela de listagem de gastos do mês atual com filtro por categoria
- [ ] Formulário de novo gasto (valor, categoria, descrição opcional, data — default hoje)
- [ ] Edição e exclusão de gasto
- [ ] Total do mês calculado e exibido
- [ ] Layout responsivo (mobile-first)

**Quality Gates:**
- Pre-Commit: TypeScript sem erros (`tsc --noEmit`), Tailwind classes válidas
- Pre-PR: Revisão de padrões de componentes, acessibilidade básica (labels em inputs)

**Risco:** BAIXO — sem dependências externas, lógica local pura.

---

### Story 1.2 — Orçamento Mensal e Alertas

**Executor:** `@dev`
**Quality Gate:** `@architect`
**Quality Gate Tools:** `[logic_validation, ux_review, regression_check]`

**Descrição:** Implementar a funcionalidade de orçamento mensal por categoria: configuração de limite em R$, indicadores de uso em tempo real e alertas visuais ao ultrapassar o limite. Depende da Story 1.1 (categorias e store base).

**Acceptance Criteria:**
- [ ] Tipo `Budget { categoryId, month (YYYY-MM), limitAmount }` adicionado ao store
- [ ] Tela de configuração de orçamentos por categoria
- [ ] Indicador de uso por categoria: `"Alimentação: R$ 320 / R$ 500 (64%)"`
- [ ] Barra de progresso colorida: verde < 80%, amarelo 80–100%, vermelho > 100%
- [ ] Alerta visual (banner ou toast) ao ultrapassar o limite de qualquer categoria
- [ ] Orçamento é mensal — cada mês tem configuração independente
- [ ] Listagem de gastos exibe indicador contextual da categoria

**Quality Gates:**
- Pre-Commit: Lógica de cálculo coberta por testes unitários (Vitest)
- Pre-PR: UX review — alertas não devem ser intrusivos, cores acessíveis (WCAG AA)

**Risco:** BAIXO — lógica de cálculo simples, sem side effects externos.

---

### Story 1.3 — Metas Financeiras e Dashboard

**Executor:** `@dev`
**Quality Gate:** `@ux-design-expert`
**Quality Gate Tools:** `[ux_review, accessibility_audit, visual_regression]`

**Descrição:** Implementar metas financeiras com aportes e progresso visual, além do dashboard principal com resumo mensal e gráfico de gastos por categoria usando Recharts. É a entrega final do epic.

**Acceptance Criteria:**
- [ ] Tipo `Goal { id, name, targetAmount, currentAmount, deadline?, status: 'active'|'completed'|'archived', createdAt }` adicionado ao store
- [ ] CRUD de metas: criar, editar, arquivar, concluir
- [ ] Registrar aporte em uma meta (adiciona ao `currentAmount`)
- [ ] Barra de progresso com % atingido e valor restante
- [ ] Dashboard com 3 seções:
  - Resumo do mês: total gasto vs. orçamento total definido
  - Gráfico de pizza ou barras por categoria (Recharts, responsivo)
  - Painel de metas ativas com progresso
- [ ] Dashboard é a tela inicial (rota `/`)
- [ ] Navegação bottom-bar mobile: Dashboard | Gastos | Orçamento | Metas
- [ ] App funciona 100% offline (sem chamadas de rede)

**Quality Gates:**
- Pre-Commit: Recharts renderiza sem erros, rotas navegáveis
- Pre-PR: UX review — dashboard legível em tela de 375px, gráfico acessível (não depende só de cor)

**Risco:** MÉDIO — Recharts pode ter comportamentos inesperados em telas pequenas; testar em viewport 375px.

---

## Compatibility Requirements

- [ ] Dados no localStorage persistem ao fechar e reabrir o browser
- [ ] App não faz nenhuma chamada de rede (100% offline)
- [ ] Responsivo: testado em 375px (iPhone SE) e 768px (tablet)
- [ ] TypeScript strict mode sem `any` implícito

---

## Risk Mitigation

**Risco principal:** Complexidade de estado crescente no Zustand conforme o store acumula entidades.

**Mitigação:**
- Store separado em slices (`expenseSlice`, `budgetSlice`, `goalSlice`) desde a Story 1.1
- Selectors memoizados para evitar re-renders desnecessários

**Rollback:** Como é greenfield, rollback = deletar o projeto. Não há sistema existente em risco.

---

## Quality Assurance Strategy

| Story | Risco | Gates |
|-------|-------|-------|
| 1.1 — Scaffolding e Gastos | BAIXO | Pre-Commit |
| 1.2 — Orçamento e Alertas | BAIXO | Pre-Commit + Pre-PR |
| 1.3 — Metas e Dashboard | MÉDIO | Pre-Commit + Pre-PR |

- Toda lógica de cálculo (totais, orçamento, progresso) deve ter testes unitários com Vitest
- Componentes UI revisados para acessibilidade (labels, contraste WCAG AA)
- Nenhuma chamada de rede — qualquer `fetch` ou `axios` é bloqueado por padrão

---

## Definition of Done

- [ ] Stories 1.1, 1.2 e 1.3 completas com ACs aprovados
- [ ] App rodando localmente via `npm run dev`
- [ ] Build de produção sem erros: `npm run build`
- [ ] TypeScript sem erros: `tsc --noEmit`
- [ ] Layout responsivo validado em 375px e 768px
- [ ] Dados persistem após refresh do browser
- [ ] Funciona completamente offline

---

## Handoff para @sm (Story Manager)

> "Por favor, crie as user stories detalhadas para este epic. Contexto:
>
> - Projeto **greenfield** — nenhum código existente
> - Stack: React 18 + TypeScript (strict) + Tailwind v3 + Zustand + Recharts + Vite
> - Persistência: Zustand com `persist` middleware no localStorage — sem backend
> - Sequência obrigatória: Story 1.1 → 1.2 → 1.3 (cada uma depende da anterior)
> - Story 1.1 deve incluir o scaffolding completo (criar projeto do zero)
> - Todas as histórias devem verificar que o app continua offline-first após cada entrega
>
> O epic entrega o MVP completo do Kekel Finance: gestão de gastos + orçamento mensal + metas + dashboard."

---

## Metadata

```yaml
epic_id: 1
epic_title: Controle Financeiro e Previsão Mensal
prd_ref: docs/prd/kekel-finance.md
story_count: 3
story_location: docs/stories/
complexity: STANDARD
risk_level: LOW-MEDIUM
estimated_stories: 3
executor_primary: "@dev"
quality_gates: ["@architect", "@ux-design-expert"]
created_by: Morgan (PM)
created_at: 2026-03-03
```
