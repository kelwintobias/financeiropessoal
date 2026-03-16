# Income Received Flag Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar flag `receivedAt` às rendas para que rendas já recebidas (com saldo ajustado manualmente) não sejam contadas como renda futura na projeção de quanto pode ser gasto.

**Architecture:** Coluna `received_at TIMESTAMPTZ NULL` no banco Supabase. Helper `isReceivedInCycle` em `forecastUtils.ts` determina se uma renda foi recebida dentro do ciclo de faturamento atual — reset automático ao virar o ciclo. `IncomePage` expõe toggle por item de renda.

**Tech Stack:** TypeScript, React, Zustand, Supabase (PostgreSQL), Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-16-income-received-flag-design.md`

**Nota:** Este projeto não tem framework de testes configurado. As verificações são feitas manualmente via `npm run dev` e inspeção visual.

---

## Chunk 1: Banco de Dados e Tipos

### Task 1: Migration do Supabase

**Files:**
- Create: `supabase/migrations/007_income_received_at.sql`

- [ ] **Step 1: Criar o arquivo de migration**

Criar `supabase/migrations/007_income_received_at.sql` com o seguinte conteúdo:

```sql
-- Add received_at column to incomes table
-- NULL = not yet marked as received in current billing cycle
-- Non-null = timestamp when user marked it received; compared against current cycle range
ALTER TABLE incomes ADD COLUMN received_at TIMESTAMPTZ NULL;
```

- [ ] **Step 2: Aplicar a migration no Supabase**

Abrir o **Supabase Dashboard → SQL Editor** e executar o conteúdo do arquivo acima.

Verificar que a coluna foi criada:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'incomes' AND column_name = 'received_at';
```
Resultado esperado: uma linha com `received_at | timestamp with time zone | YES`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/007_income_received_at.sql
git commit -m "feat: add received_at column to incomes migration"
```

---

### Task 2: Atualizar tipos TypeScript

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Adicionar `receivedAt` à interface `Income`**

Em `src/types/index.ts`, localizar a interface `Income` (linha ~35) e adicionar o campo após `isRecurring`:

```ts
export interface Income {
  id: string
  description: string
  amount: number
  type: 'fixed' | 'variable'
  month: string
  paymentDay?: number
  isRecurring: boolean
  receivedAt?: string   // ISO timestamp; não-null = recebida neste ciclo
  createdAt: string
}
```

- [ ] **Step 2: Adicionar `markIncomeReceived` à interface `FinanceStore`**

Ainda em `src/types/index.ts`, localizar `FinanceStore` (linha ~82) e adicionar após `deleteIncome`:

```ts
markIncomeReceived: (id: string, received: boolean) => Promise<void>
```

A seção de income na interface ficará assim:
```ts
addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => void | Promise<void>
updateIncome: (id: string, data: Partial<Omit<Income, 'id' | 'createdAt'>>) => void | Promise<void>
deleteIncome: (id: string) => void | Promise<void>
markIncomeReceived: (id: string, received: boolean) => Promise<void>
getIncomeByMonth: (month: string) => Income[]
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add receivedAt field to Income type and markIncomeReceived to FinanceStore"
```

> **Nota:** Não executar `npm run build` ainda — o TypeScript vai falhar com "Property 'markIncomeReceived' is missing" porque a implementação no store ainda não existe. A verificação de build acontece na Task 3.

---

## Chunk 2: Store e Lógica de Cálculo

### Task 3: Atualizar o Store

**Files:**
- Modify: `src/store/useFinanceStore.ts`

- [ ] **Step 1: Atualizar `mapIncomeFromDB` para ler `received_at`**

Localizar a função `mapIncomeFromDB` (linha ~41) e adicionar o campo `receivedAt`:

```ts
const mapIncomeFromDB = (row: Record<string, unknown>): Income => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  type: row.type as Income['type'],
  month: row.month as string,
  paymentDay: row.payment_day != null ? Number(row.payment_day) : undefined,
  isRecurring: (row.is_recurring as boolean) ?? false,
  receivedAt: row.received_at != null ? (row.received_at as string) : undefined,
  createdAt: row.created_at as string,
})
```

- [ ] **Step 2: Adicionar a action `markIncomeReceived`**

Localizar a seção `// ── Incomes ──` (linha ~290). Após `getIncomeByMonth`, adicionar:

```ts
markIncomeReceived: async (id, received) => {
  const value = received ? new Date().toISOString() : null
  const { error } = await supabase
    .from('incomes')
    .update({ received_at: value })
    .eq('id', id)
  if (!error) {
    set((state) => ({
      incomes: state.incomes.map((inc) =>
        inc.id === id ? { ...inc, receivedAt: value ?? undefined } : inc
      ),
    }))
  }
},
```

**Atenção:** Seguir o padrão existente no store — só atualizar o estado local se `!error`.

- [ ] **Step 3: Verificar que o TypeScript compila**

```bash
npm run build 2>&1 | head -30
```

Esperado: build passa sem erros de tipo relacionados ao store ou à interface `FinanceStore`.

- [ ] **Step 4: Commit**

```bash
git add src/store/useFinanceStore.ts
git commit -m "feat: implement markIncomeReceived store action"
```

---

### Task 4: Atualizar `forecastUtils.ts`

**Files:**
- Modify: `src/utils/forecastUtils.ts`

Esta é a task central. Três mudanças no mesmo arquivo — fazer sequencialmente.

- [ ] **Step 1: Exportar o helper `isReceivedInCycle`**

Adicionar a função após a interface `IncomeListItem` (linha ~24), antes de `ForecastResult`:

```ts
export function isReceivedInCycle(income: Income, cycleStart: string, cycleEnd: string): boolean {
  if (!income.receivedAt) return false
  const date = income.receivedAt.split('T')[0]  // 'YYYY-MM-DD'
  return date >= cycleStart && date <= cycleEnd
}
```

- [ ] **Step 2: Mover o bloco de billing cycle para antes das receitas**

Em `calculateForecast`, o bloco de billing cycle está atualmente nas linhas ~149-154 (após `incomeBeforePayment`). Movê-lo para **antes** da declaração de `incomeList` (atualmente linha ~102).

O bloco a mover é:
```ts
// ── Ciclo de faturamento ──
// Se não há cartão, usa o mês corrente inteiro como ciclo
const billingCycle = creditCard
  ? getCurrentBillingCycle(creditCard.closingDay, today)
  : { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }

const cycleStart = billingCycle.start.toISOString().split('T')[0]
const cycleEnd = billingCycle.end.toISOString().split('T')[0]
```

Após a mudança, a ordem dentro de `calculateForecast` deve ser:
1. Datas de fechamento e pagamento (`daysUntilClosing`, `daysUntilPayment`)
2. **Ciclo de faturamento** (`billingCycle`, `cycleStart`, `cycleEnd`) ← movido para cá
3. Receitas do mês (`monthIncomes`, `incomeList`, `incomeReceived`, `incomePending`)
4. Rendas antes do pagamento (`incomeBeforePayment`)
5. Gastos do ciclo (`cycleExpensesCard`, `cycleExpensesCash`)
6. Custos fixos
7. Fatura
8. Saldo e disponível

- [ ] **Step 3: Atualizar `incomeList` — campo `received`**

Localizar dentro do loop `for (const income of monthIncomes)` a linha:
```ts
const received = income.paymentDay != null ? income.paymentDay <= todayDay : true
```

Substituir por:
```ts
const received = isReceivedInCycle(income, cycleStart, cycleEnd)
  || (income.paymentDay == null)
  || (income.paymentDay <= todayDay)
```

Isso preserva o comportamento existente (`paymentDay == null → true`, `paymentDay <= todayDay → true`) e adiciona o novo caso (marcada via `receivedAt` dentro do ciclo).

- [ ] **Step 4: Atualizar `incomeBeforePayment` — adicionar guard**

Localizar o `reduce` de `incomeBeforePayment`. Encontrar o guard existente:
```ts
if (inc.paymentDay == null) return sum  // sem data → já no saldo
```

Adicionar o novo guard **logo após** essa linha:
```ts
if (inc.paymentDay == null) return sum  // sem data → já no saldo
if (isReceivedInCycle(inc, cycleStart, cycleEnd)) return sum  // marcada recebida → já no saldo
```

- [ ] **Step 5: Verificar que o TypeScript compila**

```bash
npm run build 2>&1 | head -30
```

Esperado: build sem erros.

- [ ] **Step 6: Verificar lógica manualmente com `npm run dev`**

Abrir o app, navegar para a tela de Início (Dashboard). Verificar que os valores de `quantoPodeGastar` e `incomeBeforePayment` continuam fazendo sentido (sem NaN ou valores absurdos).

- [ ] **Step 7: Commit**

```bash
git add src/utils/forecastUtils.ts
git commit -m "feat: add isReceivedInCycle helper and exclude received incomes from forecast"
```

---

## Chunk 3: Interface do Usuário

### Task 5: Toggle de "Recebida" na IncomePage

**Files:**
- Modify: `src/pages/IncomePage.tsx`

- [ ] **Step 1: Importar dependências necessárias**

No topo de `IncomePage.tsx`, `useFinanceStore` já está importado. Criar uma nova linha de import para `forecastUtils` (não existe ainda):

```ts
import { isReceivedInCycle, getCurrentBillingCycle } from '@/utils/forecastUtils'
```

- [ ] **Step 2: Calcular `cycleStart` e `cycleEnd` localmente**

No componente `IncomePage`, localizar a linha existente (linha ~21):
```ts
const { incomes, deleteIncome } = useFinanceStore()
```
Substituir por (merge com os novos campos):
```ts
const { incomes, deleteIncome, creditCard, markIncomeReceived } = useFinanceStore()
```

Após a declaração de `month`, adicionar:

```ts
const today = new Date()
const cycle = creditCard
  ? getCurrentBillingCycle(creditCard.closingDay, today)
  : { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) }
const cycleStart = cycle.start.toISOString().split('T')[0]
const cycleEnd = cycle.end.toISOString().split('T')[0]
```

- [ ] **Step 3: Adicionar o botão de toggle em cada item da lista**

Localizar o trecho que renderiza cada item (o `map` a partir da linha ~69). Antes do span de valor da renda, adicionar o botão de toggle:

```tsx
{monthIncomes.map((inc) => {
  const isReceived = isReceivedInCycle(inc, cycleStart, cycleEnd)
  return (
    <div key={inc.id} className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="font-medium text-gray-800 text-sm">{inc.description}</p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            inc.type === 'fixed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}>
            {inc.type === 'fixed' ? 'Fixa' : 'Variável'}
          </span>
          {inc.paymentDay && (
            <span className="text-xs text-gray-400">dia {inc.paymentDay}</span>
          )}
          {inc.isRecurring && (
            <span className="text-xs text-green-600">recorrente</span>
          )}
          {isReceived && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              Recebida
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => markIncomeReceived(inc.id, !isReceived)}
          className={`text-lg transition-colors ${
            isReceived ? 'text-green-500' : 'text-gray-300 hover:text-green-400'
          }`}
          aria-label={isReceived ? 'Marcar como não recebida' : 'Marcar como recebida'}
          title={isReceived ? 'Marcar como não recebida' : 'Marcar como recebida'}
        >
          {isReceived ? '✓' : '○'}
        </button>
        <span className={`font-semibold ${isReceived ? 'text-gray-400' : 'text-green-700'}`}>
          {formatBRL(inc.amount)}
        </span>
        <button
          onClick={() => handleEdit(inc)}
          className="text-gray-400 hover:text-blue-600 text-sm"
          aria-label="Editar"
        >
          ✏️
        </button>
        <button
          onClick={() => deleteIncome(inc.id)}
          className="text-gray-400 hover:text-red-600 text-sm"
          aria-label="Excluir"
        >
          🗑️
        </button>
      </div>
    </div>
  )
})}
```

**Nota:** O `map` agora usa `return` explícito com `{}` para acomodar a variável `isReceived`. Remover o formato arrow implícito `(inc) => (...)` e substituir por `(inc) => { const isReceived = ...; return (...) }`.

- [ ] **Step 4: Verificar que o TypeScript compila**

```bash
npm run build 2>&1 | head -30
```

Esperado: build sem erros.

- [ ] **Step 5: Testar manualmente**

Iniciar o app:
```bash
npm run dev
```

Fluxo de verificação:
1. Abrir `/income`
2. Verificar que cada renda mostra o ícone `○` (cinza) inicialmente
3. Clicar em `○` de uma renda → deve virar `✓` verde, badge "Recebida" aparece, valor fica cinza
4. Navegar para `/` (Dashboard) → verificar que `quantoPodeGastar` mudou (renda não é mais somada como futura)
5. Clicar novamente em `✓` → deve voltar a `○` e `quantoPodeGastar` retorna ao valor anterior
6. Recarregar a página → estado deve persistir (vem do Supabase)

- [ ] **Step 6: Commit**

```bash
git add src/pages/IncomePage.tsx
git commit -m "feat: add received toggle to income list items"
```

---

## Resumo dos Arquivos

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `supabase/migrations/007_income_received_at.sql` | Novo | Coluna `received_at` |
| `src/types/index.ts` | Modificado | `Income.receivedAt?`, `FinanceStore.markIncomeReceived` |
| `src/store/useFinanceStore.ts` | Modificado | `mapIncomeFromDB` + action `markIncomeReceived` |
| `src/utils/forecastUtils.ts` | Modificado | Helper `isReceivedInCycle` (exportado), reordenação, guards |
| `src/pages/IncomePage.tsx` | Modificado | Toggle por item, badge "Recebida" |
