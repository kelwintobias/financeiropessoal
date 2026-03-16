# Registro Automático de Gastos ao Atualizar Fatura — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao atualizar a "Fatura atual" no Dashboard de X para Y (Y > X), registrar automaticamente a diferença como um Expense na tabela `expenses`, visível na aba Gastos.

**Architecture:** Nova action `updateBillAndRecord` no Zustand store encapsula `addExpense` + `updateCurrentBill`. Uma migration SQL seed garante que exista uma categoria "Cartão" no banco. O Dashboard passa de `updateCurrentBill` para `updateBillAndRecord` em um único ponto.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Supabase JS v2, Tailwind CSS, Vite 7.

---

## Chunk 1: Banco de dados e tipos

### Task 1: Migration — seed da categoria "Cartão"

**Files:**
- Create: `supabase/migrations/006_card_category_seed.sql`

**Contexto:** A tabela `categories` já existe com colunas `id UUID`, `name TEXT`, `color TEXT`, `is_default BOOLEAN`. As migrations 001–005 já estão aplicadas. Esta migration insere a categoria somente se não existir, tornando-a idempotente.

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/006_card_category_seed.sql` com o conteúdo:

```sql
-- Seed: categoria "Cartão" para gastos automáticos da fatura
INSERT INTO categories (name, color, is_default)
SELECT 'Cartão', '#6366f1', true
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE name = 'Cartão'
);
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Abra o Supabase Dashboard → SQL Editor e execute o conteúdo do arquivo acima.

Ou via CLI (se configurado):
```bash
cd kekel-finance
npx supabase db push
```

Verificar: no Supabase Table Editor, abrir `categories` e confirmar que existe uma linha com `name = 'Cartão'` e `color = '#6366f1'`.

- [ ] **Step 3: Commit**

```bash
cd kekel-finance
git add supabase/migrations/006_card_category_seed.sql
git commit -m "feat: add card category seed migration"
```

---

### Task 2: Atualizar interface `FinanceStore`

**Files:**
- Modify: `src/types/index.ts` (interface `FinanceStore`, adicionar uma linha)

**Contexto:** `FinanceStore` em `src/types/index.ts` declara todas as actions do store. `updateCurrentBill` já existe na linha 115. Adicionamos `updateBillAndRecord` logo abaixo.

- [ ] **Step 1: Editar `src/types/index.ts`**

Localizar a linha:
```ts
  updateCurrentBill: (amount: number) => Promise<void>
```

Adicionar imediatamente após:
```ts
  updateBillAndRecord: (newAmount: number) => Promise<void>
```

O bloco final deve ficar assim:
```ts
  updateCurrentBill: (amount: number) => Promise<void>
  updateBillAndRecord: (newAmount: number) => Promise<void>
  addPlannedExpense: (pe: Omit<PlannedExpense, 'id' | 'createdAt'>) => Promise<void>
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add updateBillAndRecord to FinanceStore interface"
```

---

## Chunk 2: Implementação do store e Dashboard

### Task 3: Implementar `updateBillAndRecord` no store

**Files:**
- Modify: `src/store/useFinanceStore.ts` (adicionar nova action após `updateCurrentBill`)

**Contexto:** O store usa Supabase para persistência. `addExpense` e `updateCurrentBill` já existem e funcionam. A nova action chama ambas sequencialmente. O `Expense` precisa de `categoryId` obrigatório — buscamos a categoria "Cartão" em `get().categories`. Se não encontrada, apenas atualiza a fatura e loga um warning.

**Lógica completa:**
```
diff = newAmount - creditCard.currentBill
if diff <= 0: updateCurrentBill(newAmount) e retorna
if diff > 0:
  cardCategory = categories.find(c => c.name === 'Cartão')
  if !cardCategory: console.warn + updateCurrentBill(newAmount) e retorna
  today = new Date()
  description = "Fatura " + DD/MM
  diff = Math.round(diff * 100) / 100
  await addExpense({ amount: diff, description, categoryId: cardCategory.id, date: YYYY-MM-DD, paymentMethod: 'card' })
  await updateCurrentBill(newAmount)
```

- [ ] **Step 1: Abrir `src/store/useFinanceStore.ts`**

Localizar o bloco `updateCurrentBill` (por volta da linha 463):

```ts
  updateCurrentBill: async (amount) => {
    const { creditCard } = get()
    if (!creditCard) return
    const { error } = await supabase
      .from('credit_card_config')
      .update({ current_bill: amount })
      .eq('id', creditCard.id)
    if (!error) {
      set({ creditCard: { ...creditCard, currentBill: amount } })
    }
  },
```

- [ ] **Step 2: Adicionar `updateBillAndRecord` após `updateCurrentBill`**

Inserir imediatamente após o fechamento da vírgula de `updateCurrentBill`:

```ts
  updateBillAndRecord: async (newAmount) => {
    const { creditCard, categories, updateCurrentBill } = get()
    if (!creditCard) return

    const diff = Math.round((newAmount - creditCard.currentBill) * 100) / 100

    if (diff <= 0) {
      await updateCurrentBill(newAmount)
      return
    }

    const cardCategory = categories.find((c) => c.name === 'Cartão')
    if (!cardCategory) {
      console.warn('[updateBillAndRecord] Categoria "Cartão" não encontrada. Apenas atualizando fatura.')
      await updateCurrentBill(newAmount)
      return
    }

    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dateStr = `${today.getFullYear()}-${mm}-${dd}`
    const description = `Fatura ${dd}/${mm}`

    await get().addExpense({
      amount: diff,
      description,
      categoryId: cardCategory.id,
      date: dateStr,
      paymentMethod: 'card',
    })

    await updateCurrentBill(newAmount)
  },
```

**Nota:** `get()` é usado para chamar `addExpense` e `updateCurrentBill` pois elas já atualizam o estado interno — não precisamos duplicar a lógica de `set()`.

- [ ] **Step 3: Verificar compilação**

```bash
cd kekel-finance
npm run build 2>&1 | head -30
```

Esperado: build com sucesso, sem erros de TypeScript.

- [ ] **Step 4: Verificar lint**

```bash
npm run lint
```

Esperado: sem erros ou warnings novos.

- [ ] **Step 5: Commit**

```bash
git add src/store/useFinanceStore.ts
git commit -m "feat: implement updateBillAndRecord store action"
```

---

### Task 4: Conectar ao Dashboard

**Files:**
- Modify: `src/pages/DashboardPage.tsx` (3 mudanças: destructure, import do tipo, prop do EditableAmount)

**Contexto:** No `DashboardPage`, o `EditableAmount` da "Fatura atual" está na linha ~237 com `onSave={updateCurrentBill}`. Precisamos trocar para `onSave={updateBillAndRecord}` e adicionar `updateBillAndRecord` no destructuring do store.

- [ ] **Step 1: Atualizar destructuring do store**

Localizar (linha ~83):
```ts
  const {
    incomes,
    expenses,
    fixedExpenses,
    creditCard,
    userSettings,
    updateAccountBalance,
    updateCurrentBill,
    updateMonthlyGoal,
  } = useFinanceStore()
```

Trocar o destructuring, removendo `updateCurrentBill` (não será mais usada no componente) e adicionando `updateBillAndRecord`:
```ts
  const {
    incomes,
    expenses,
    fixedExpenses,
    creditCard,
    userSettings,
    updateAccountBalance,
    updateBillAndRecord,
    updateMonthlyGoal,
  } = useFinanceStore()
```

- [ ] **Step 2: Trocar o `onSave` do EditableAmount da fatura**

Localizar (linha ~237):
```tsx
              <EditableAmount
                value={cardBillAccumulated}
                onSave={updateCurrentBill}
                label="Fatura atual"
              />
```

Trocar `onSave={updateCurrentBill}` por `onSave={updateBillAndRecord}`:
```tsx
              <EditableAmount
                value={cardBillAccumulated}
                onSave={updateBillAndRecord}
                label="Fatura atual"
              />
```

- [ ] **Step 3: Verificar compilação**

```bash
cd kekel-finance
npm run build 2>&1 | head -30
```

Esperado: build com sucesso, sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DashboardPage.tsx
git commit -m "feat: wire updateBillAndRecord to dashboard bill input"
```

---

## Chunk 3: Teste manual e validação

### Task 5: Teste manual no browser

**Contexto:** Sem framework de testes instalado — validação é feita via browser com `npm run dev`.

- [ ] **Step 1: Iniciar o dev server**

```bash
cd kekel-finance
npm run dev
```

Abrir `http://localhost:5173` no browser.

- [ ] **Step 2: Garantir que a categoria "Cartão" existe**

Ir até a aba "Gastos". No filtro de categorias, verificar se "Cartão" aparece na lista. Se não aparecer, a migration não foi aplicada — voltar ao Task 1 Step 2.

- [ ] **Step 3: Testar aumento de fatura**

1. Ir ao Dashboard
2. Anotar o valor atual de "Fatura atual" (ex: R$ 200,00)
3. Clicar no valor para editar
4. Digitar um valor maior (ex: `250` → Enter)
5. Ir à aba "Gastos"
6. Verificar que apareceu um novo gasto com:
   - Valor: R$ 50,00 (diferença)
   - Descrição: "Cartão · Fatura DD/MM" (data de hoje)
   - Cor: roxo (categoria Cartão)

- [ ] **Step 4: Testar sem aumento (sem registro)**

1. Voltar ao Dashboard
2. Clicar em "Fatura atual"
3. Digitar um valor igual ou menor (ex: `200`)
4. Confirmar (Enter)
5. Ir à aba "Gastos" — **nenhum novo gasto deve ter sido registrado**

- [ ] **Step 5: Testar persistência após reload**

1. Recarregar a página (F5)
2. Ir à aba "Gastos"
3. Confirmar que o gasto registrado no Step 3 ainda aparece

- [ ] **Step 6: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore: manual test verification complete"
```

---

## Resumo dos arquivos alterados

| Arquivo | Tipo | O que muda |
|---|---|---|
| `supabase/migrations/006_card_category_seed.sql` | Novo | Seed idempotente da categoria "Cartão" |
| `src/types/index.ts` | Edição | +1 linha em `FinanceStore`: `updateBillAndRecord` |
| `src/store/useFinanceStore.ts` | Edição | Nova action `updateBillAndRecord` (~25 linhas) |
| `src/pages/DashboardPage.tsx` | Edição | +1 linha no destructuring, 1 prop trocada |

**Total de mudanças:** ~30 linhas de código novo, 2 linhas modificadas.
