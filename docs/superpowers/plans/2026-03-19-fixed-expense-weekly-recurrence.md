# Fixed Expense Weekly Recurrence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weekday-based and specific-date recurrence to fixed expenses, calculating future occurrences in the billing cycle without duplicating what's already in the manual credit card bill.

**Architecture:** Extend the `FixedExpense` type and Supabase table with three new nullable fields. Add a pure helper `calcRecurringFixedTotal` in `forecastUtils.ts` that counts upcoming occurrences in the billing cycle, split by payment method. Update the store, form UI, and list UI to expose the feature.

**Tech Stack:** React 19, TypeScript 5, Zustand 5, Supabase JS v2, Tailwind CSS, Vite 7, Vitest (to be added)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `kekel-finance/package.json` | Modify | Add vitest devDependency and test script |
| `kekel-finance/vitest.config.ts` | Create | Vitest configuration |
| `kekel-finance/src/utils/__tests__/forecastUtils.test.ts` | Create | Unit tests for `calcRecurringFixedTotal` and `calculateForecast` |
| `kekel-finance/src/types/index.ts` | Modify | Add 3 new fields to `FixedExpense`; add 3 new fields to `ForecastResult` |
| `kekel-finance/src/utils/forecastUtils.ts` | Modify | Add `calcRecurringFixedTotal`; update `calculateForecast` and `ForecastResult` |
| `kekel-finance/src/store/useFinanceStore.ts` | Modify | Map new DB columns; persist new fields in add/update |
| `supabase/migrations/004_fixed_expense_recurrence.sql` | Create | Add 3 nullable columns to `fixed_expenses` |
| `kekel-finance/src/components/fixedExpenses/FixedExpenseForm.tsx` | Modify | Add recurrence toggle, weekday chips, calendar modal, preview |
| `kekel-finance/src/pages/FixedExpensesPage.tsx` | Modify | Show recurrence detail line per item |

All commands are run from `kekel-finance/` unless noted otherwise.

---

## Task 1: Set up Vitest

**Files:**
- Modify: `kekel-finance/package.json`
- Create: `kekel-finance/vitest.config.ts`

- [ ] **Step 1: Install Vitest**

```bash
cd "kekel-finance"
npm install --save-dev vitest @vitest/ui
```

- [ ] **Step 2: Add test script to package.json**

In `kekel-finance/package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create vitest.config.ts**

Create `kekel-finance/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Create test directory and smoke test**

Create `kekel-finance/src/utils/__tests__/forecastUtils.test.ts`:
```ts
import { describe, it, expect } from 'vitest'

describe('smoke', () => {
  it('vitest works', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run smoke test**

```bash
npm test
```

Expected: `1 passed`

- [ ] **Step 6: Commit**

```bash
git add package.json vitest.config.ts src/utils/__tests__/forecastUtils.test.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `kekel-finance/src/types/index.ts`

- [ ] **Step 1: Add fields to `FixedExpense`**

In `src/types/index.ts`, extend `FixedExpense` (after `createdAt`):
```ts
export interface FixedExpense {
  id: string
  description: string
  amount: number              // per-occurrence value when recurrenceType is defined; monthly value when undefined
  categoryId?: string
  billingDay?: number         // ignored in forecast when recurrenceType is defined
  paymentMethod: 'card' | 'cash'
  isActive: boolean
  createdAt: string
  recurrenceType?: 'weekdays' | 'specific'
  recurrenceWeekdays?: number[]   // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  recurrenceDates?: string[]      // 'YYYY-MM-DD' format
}
```

- [ ] **Step 2: Add fields to `ForecastResult`**

In `src/types/index.ts` — `ForecastResult` is defined in `forecastUtils.ts`, not here. Skip this step (the interface lives in `forecastUtils.ts`).

- [ ] **Step 3: Run typecheck**

```bash
npm run typecheck 2>/dev/null || npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add recurrence fields to FixedExpense type"
```

---

## Task 3: Implement `calcRecurringFixedTotal` with TDD

**Files:**
- Modify: `kekel-finance/src/utils/__tests__/forecastUtils.test.ts`
- Modify: `kekel-finance/src/utils/forecastUtils.ts`

### Step-by-step TDD cycle

- [ ] **Step 1: Write failing tests for `calcRecurringFixedTotal`**

Replace the smoke test in `src/utils/__tests__/forecastUtils.test.ts` with:

```ts
import { describe, it, expect } from 'vitest'
import { calcRecurringFixedTotal } from '@/utils/forecastUtils'
import type { FixedExpense } from '@/types'

// Helper: build a minimal FixedExpense
function fe(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: '1',
    description: 'test',
    amount: 50,
    paymentMethod: 'card',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calcRecurringFixedTotal', () => {
  // today = Wednesday 2026-03-18 (getDay() = 3)
  const today = new Date('2026-03-18T12:00:00Z')
  const cycleEnd = '2026-03-25'  // 7 days window

  describe('weekdays', () => {
    it('counts matching weekdays from tomorrow to cycleEnd inclusive', () => {
      // today=Wed Mar 18; tomorrow=Thu Mar 19; cycleEnd=Wed Mar 25
      // Thursdays in window: Mar 19 → 1 occurrence
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [4] }) // Thu
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(50)
    })

    it('excludes today even if today matches the weekday', () => {
      // today=Wed; Wednesdays from tomorrow to Mar 25: Mar 25 → 1 occurrence
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [3] }) // Wed
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(50)
    })

    it('counts multiple weekdays', () => {
      // Mon=1: Mar 23; Fri=5: Mar 20 → 2 occurrences
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [1, 5] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(100)
    })

    it('returns 0 when no matching weekday in window', () => {
      // Sun=0: Mar 22 falls in window, but let's use a window that has none
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [0] }) // Sun
      // Sun Mar 22 IS in the window; this should be 1
      expect(calcRecurringFixedTotal([expense], '2026-03-21', today)).toBe(0)
    })

    it('returns 0 for empty weekdays array', () => {
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('sums multiple expenses', () => {
      // Two expenses on Mon: 50 + 30 = 80
      const exp1 = fe({ amount: 50, recurrenceType: 'weekdays', recurrenceWeekdays: [1] })
      const exp2 = fe({ id: '2', amount: 30, recurrenceType: 'weekdays', recurrenceWeekdays: [1] })
      expect(calcRecurringFixedTotal([exp1, exp2], cycleEnd, today)).toBe(80)
    })
  })

  describe('specific dates', () => {
    it('counts specific dates strictly after today and within cycleEnd', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-19', '2026-03-22', '2026-03-25'],
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(150)
    })

    it('excludes today', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-18'], // today
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('excludes dates beyond cycleEnd', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-26', '2026-03-30'],
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('returns 0 for empty dates array', () => {
      const expense = fe({ recurrenceType: 'specific', recurrenceDates: [] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty list', () => {
      expect(calcRecurringFixedTotal([], cycleEnd, today)).toBe(0)
    })

    it('ignores expenses without recurrenceType', () => {
      const expense = fe({ billingDay: 20 }) // no recurrenceType
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })
  })
})
```

- [ ] **Step 2: Run tests — expect failure**

```bash
npm test
```

Expected: fails with `calcRecurringFixedTotal is not a function` (or similar export error).

- [ ] **Step 3: Export `calcRecurringFixedTotal` from `forecastUtils.ts`**

Add the following function to `src/utils/forecastUtils.ts`, before `calculateForecast`:

```ts
export function calcRecurringFixedTotal(
  fixedExpenses: FixedExpense[],
  cycleEnd: string,
  today: Date
): number {
  const todayStr = today.toISOString().split('T')[0]
  let total = 0

  for (const fe of fixedExpenses) {
    if (!fe.recurrenceType) continue

    if (fe.recurrenceType === 'weekdays') {
      const weekdays = fe.recurrenceWeekdays ?? []
      if (weekdays.length === 0) continue

      // Iterate from tomorrow to cycleEnd inclusive
      const cursor = new Date(today)
      cursor.setDate(cursor.getDate() + 1)
      while (cursor.toISOString().split('T')[0] <= cycleEnd) {
        if (weekdays.includes(cursor.getDay())) {
          total += fe.amount
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (fe.recurrenceType === 'specific') {
      const dates = fe.recurrenceDates ?? []
      for (const d of dates) {
        if (d > todayStr && d <= cycleEnd) {
          total += fe.amount
        }
      }
    }
  }

  return total
}
```

- [ ] **Step 4: Run tests — expect all pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/utils/__tests__/forecastUtils.test.ts src/utils/forecastUtils.ts
git commit -m "feat: add calcRecurringFixedTotal with tests"
```

---

## Task 4: Update `calculateForecast` and `ForecastResult`

**Files:**
- Modify: `kekel-finance/src/utils/forecastUtils.ts`
- Modify: `kekel-finance/src/utils/__tests__/forecastUtils.test.ts`

- [ ] **Step 1: Write failing tests for the updated forecast**

Append to `src/utils/__tests__/forecastUtils.test.ts`:

```ts
import { calculateForecast } from '@/utils/forecastUtils'
import type { CreditCard, Income, Expense } from '@/types'

describe('calculateForecast — recurring fixed expenses', () => {
  // today = Wednesday 2026-03-19
  const today = new Date('2026-03-19T12:00:00Z')
  const currentMonth = '2026-03'

  const card: CreditCard = {
    id: 'c1',
    name: 'Nubank',
    closingDay: 10,   // cycle: Mar 10 → Apr 9
    paymentDay: 17,
    currentBill: 200,
    createdAt: '2026-01-01T00:00:00Z',
  }

  const baseParams = {
    today,
    incomes: [] as Income[],
    expenses: [] as Expense[],
    fixedExpenses: [] as FixedExpense[],
    creditCard: card,
    manualBalance: 1000,
    monthlyGoal: 0,
    currentMonth,
  }

  it('monthly fixed expenses (no recurrenceType) still use billingDay logic', () => {
    const monthly = fe({ billingDay: 25, amount: 100 }) // day 25 > today(19) → pending
    const result = calculateForecast({ ...baseParams, fixedExpenses: [monthly] })
    expect(result.fixedPending).toBe(100)
    expect(result.fixedRecurring).toBe(0)
    expect(result.fixedRecurringCard).toBe(0)
    expect(result.fixedRecurringCash).toBe(0)
  })

  it('card recurring expense contributes to cardBillForecast, not realAccountBalance', () => {
    // cycleEnd = Apr 9; today = Mar 19; Mondays from Mar 20 to Apr 9: Mar 23, Mar 30, Apr 6 → 3
    const recurring = fe({
      recurrenceType: 'weekdays',
      recurrenceWeekdays: [1], // Mon
      amount: 50,
      paymentMethod: 'card',
    })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [recurring] })
    expect(result.fixedRecurringCard).toBe(150)   // 3 × 50
    expect(result.fixedRecurringCash).toBe(0)
    expect(result.fixedRecurring).toBe(150)
    // cardBillForecast = 200 (currentBill) + 0 (fixedPending) + 150 (recurringCard) + 0 (cycleExpensesCard)
    expect(result.cardBillForecast).toBe(350)
    // realAccountBalance unaffected by card recurring
    expect(result.realAccountBalance).toBe(1000)
  })

  it('cash recurring expense reduces realAccountBalance, not cardBillForecast', () => {
    const recurring = fe({
      recurrenceType: 'weekdays',
      recurrenceWeekdays: [1], // Mon → 3 occurrences
      amount: 50,
      paymentMethod: 'cash',
    })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [recurring] })
    expect(result.fixedRecurringCard).toBe(0)
    expect(result.fixedRecurringCash).toBe(150)
    // cardBillForecast unaffected
    expect(result.cardBillForecast).toBe(200)
    // realAccountBalance = 1000 - 150
    expect(result.realAccountBalance).toBe(850)
  })

  it('totalFixedActive covers only monthly fixed; invariant holds', () => {
    const monthly = fe({ billingDay: 5, amount: 100 })  // already billed (day 5 < 19)
    const recurring = fe({ id: '2', recurrenceType: 'weekdays', recurrenceWeekdays: [1], amount: 50 })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [monthly, recurring] })
    expect(result.totalFixedActive).toBe(100)            // only monthly
    expect(result.fixedAlreadyBilled).toBe(100)          // day 5 <= 19
    expect(result.fixedPending).toBe(0)
    // invariant: alreadyBilled + pending === totalFixedActive
    expect(result.fixedAlreadyBilled + result.fixedPending).toBe(result.totalFixedActive)
  })
})
```

- [ ] **Step 2: Run tests — expect new tests to fail**

```bash
npm test
```

Expected: new `calculateForecast` tests fail with properties `fixedRecurring`, `fixedRecurringCard`, `fixedRecurringCash` being `undefined`.

- [ ] **Step 3: Update `ForecastResult` interface in `forecastUtils.ts`**

Locate the `ForecastResult` interface (around line 32) and add three fields:

```ts
export interface ForecastResult {
  // ... all existing fields unchanged ...
  fixedRecurring: number      // total (card + cash) recurring in this cycle
  fixedRecurringCard: number
  fixedRecurringCash: number
}
```

- [ ] **Step 4: Update `calculateForecast` logic**

Locate the `// ── Custos fixos ──` section (around line 174) and replace it with:

```ts
// ── Custos fixos ──
const activeFixed = fixedExpenses.filter((fe) => fe.isActive)

// Split: monthly (billingDay-based) vs recurring (weekdays/specific)
const monthlyFixed = activeFixed.filter((fe) => !fe.recurrenceType)
const recurringFixed = activeFixed.filter((fe) => !!fe.recurrenceType)

// Monthly fixed — existing logic, restricted to monthlyFixed only
const totalFixedActive = monthlyFixed.reduce((sum, fe) => sum + fe.amount, 0)
const fixedAlreadyBilled = monthlyFixed
  .filter((fe) => fe.billingDay != null && fe.billingDay <= todayDay)
  .reduce((sum, fe) => sum + fe.amount, 0)
const fixedPending = totalFixedActive - fixedAlreadyBilled

// Recurring fixed — split by payment method
const recurringCard = recurringFixed.filter((fe) => fe.paymentMethod === 'card')
const recurringCash  = recurringFixed.filter((fe) => fe.paymentMethod === 'cash')
const fixedRecurringCard = calcRecurringFixedTotal(recurringCard, cycleEnd, today)
const fixedRecurringCash  = calcRecurringFixedTotal(recurringCash,  cycleEnd, today)
const fixedRecurring = fixedRecurringCard + fixedRecurringCash
```

- [ ] **Step 5: Update the three formulas that use these values**

**Fatura:**
```ts
const cardBillForecast = cardBillAccumulated + fixedPending + fixedRecurringCard + cycleExpensesCard
```

**Saldo real:**
```ts
const realAccountBalance = manualBalance - cycleExpensesCash - fixedRecurringCash
```

**`quantoPodeGastar`** (already uses `cardBillForecast` and `cycleExpensesCash`, no change needed to the formula itself):
```ts
const quantoPodeGastar =
  manualBalance + incomeBeforePayment - cardBillForecast - cycleExpensesCash - monthlyGoal
```

- [ ] **Step 6: Add new fields to the return object**

In the `return { ... }` block at the end of `calculateForecast`, add:
```ts
fixedRecurring,
fixedRecurringCard,
fixedRecurringCash,
```

- [ ] **Step 7: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/utils/forecastUtils.ts src/utils/__tests__/forecastUtils.test.ts
git commit -m "feat: update calculateForecast to handle recurring fixed expenses [Story recurrence]"
```

---

## Task 5: Supabase migration

**Files:**
- Create: `supabase/migrations/004_fixed_expense_recurrence.sql`

> This migration must be applied manually in the Supabase SQL Editor (Dashboard → SQL Editor).

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/004_fixed_expense_recurrence.sql` at the repo root level (same directory as other migrations):

```sql
-- Migration: 004_fixed_expense_recurrence
-- Adds weekly recurrence fields to fixed_expenses
ALTER TABLE fixed_expenses
  ADD COLUMN IF NOT EXISTS recurrence_type TEXT CHECK (recurrence_type IN ('weekdays', 'specific')),
  ADD COLUMN IF NOT EXISTS recurrence_weekdays INTEGER[],
  ADD COLUMN IF NOT EXISTS recurrence_dates TEXT[];
```

- [ ] **Step 2: Apply in Supabase Dashboard**

1. Open Supabase Dashboard → SQL Editor
2. Paste the SQL above and run it
3. Verify: open Table Editor → `fixed_expenses` → confirm three new nullable columns appear

- [ ] **Step 3: Commit the migration file**

```bash
git add supabase/migrations/004_fixed_expense_recurrence.sql
git commit -m "chore: migration 004 — add recurrence columns to fixed_expenses"
```

---

## Task 6: Update the Zustand store

**Files:**
- Modify: `kekel-finance/src/store/useFinanceStore.ts`

- [ ] **Step 1: Update `mapFixedExpenseFromDB`**

Locate `mapFixedExpenseFromDB` (around line 53) and add three new field mappings after `isActive`:

```ts
const mapFixedExpenseFromDB = (row: Record<string, unknown>): FixedExpense => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  categoryId: (row.category_id as string) ?? undefined,
  billingDay: row.billing_day != null ? Number(row.billing_day) : undefined,
  paymentMethod: (row.payment_method as FixedExpense['paymentMethod']) ?? 'card',
  isActive: row.is_active as boolean,
  createdAt: row.created_at as string,
  recurrenceType: (row.recurrence_type as FixedExpense['recurrenceType']) ?? undefined,
  recurrenceWeekdays: (row.recurrence_weekdays as number[] | null) ?? undefined,
  recurrenceDates: (row.recurrence_dates as string[] | null) ?? undefined,
})
```

- [ ] **Step 2: Update `addFixedExpense` payload**

Locate the `addFixedExpense` action (around line 357). Add the three new fields to the insert payload:

```ts
addFixedExpense: async (fe) => {
  const { data, error } = await supabase
    .from('fixed_expenses')
    .insert({
      description: fe.description,
      amount: fe.amount,
      category_id: fe.categoryId ?? null,
      billing_day: fe.recurrenceType ? null : (fe.billingDay ?? null),  // null out billingDay when recurrence active
      payment_method: fe.paymentMethod,
      is_active: fe.isActive,
      recurrence_type: fe.recurrenceType ?? null,
      recurrence_weekdays: fe.recurrenceWeekdays ?? null,
      recurrence_dates: fe.recurrenceDates ?? null,
    })
    .select()
    .single()
  // ... rest unchanged
```

- [ ] **Step 3: Update `updateFixedExpense` payload**

Locate `updateFixedExpense` (around line 377). Add mapping for new fields:

```ts
if (data.recurrenceType !== undefined) updatePayload.recurrence_type = data.recurrenceType ?? null
if (data.recurrenceWeekdays !== undefined) updatePayload.recurrence_weekdays = data.recurrenceWeekdays ?? null
if (data.recurrenceDates !== undefined) updatePayload.recurrence_dates = data.recurrenceDates ?? null
// When recurrenceType is set, clear billingDay:
if (data.recurrenceType) updatePayload.billing_day = null
// When recurrenceType is cleared, preserve whatever billingDay was passed:
if (data.recurrenceType === undefined || data.recurrenceType === null) {
  if (data.billingDay !== undefined) updatePayload.billing_day = data.billingDay ?? null
}
```

> Note: Replace the existing `if (data.billingDay !== undefined) updatePayload.billing_day = data.billingDay ?? null` line with the block above so billing_day is managed as a unit with recurrenceType.

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/store/useFinanceStore.ts
git commit -m "feat: update store to persist recurrence fields in fixed_expenses"
```

---

## Task 7: Update `FixedExpenseForm` UI

**Files:**
- Modify: `kekel-finance/src/components/fixedExpenses/FixedExpenseForm.tsx`

This is the most complex UI task. Read the existing file before editing — it's ~177 lines.

- [ ] **Step 1: Add imports needed**

At the top of `FixedExpenseForm.tsx`, ensure the following imports are present:

```ts
import { useState, useEffect, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { FixedExpense } from '@/types'
import { getCurrentBillingCycle, calcRecurringFixedTotal, formatBRL } from '@/utils/forecastUtils'
```

- [ ] **Step 2: Add new state variables**

After the existing state declarations, add:

```ts
const { creditCard } = useFinanceStore()

const [hasRecurrence, setHasRecurrence] = useState<boolean>(
  !!editing?.recurrenceType
)
const [recurrenceType, setRecurrenceType] = useState<'weekdays' | 'specific' | null>(
  editing?.recurrenceType ?? null
)
const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>(
  editing?.recurrenceWeekdays ?? []
)
const [recurrenceDates, setRecurrenceDates] = useState<string[]>(
  editing?.recurrenceDates ?? []
)
const [showCalendar, setShowCalendar] = useState(false)
```

- [ ] **Step 3: Sync editing state in `useEffect`**

Update the existing `useEffect` to also reset recurrence state when `editing` changes:

```ts
useEffect(() => {
  if (editing) {
    setDescription(editing.description)
    setAmount(String(editing.amount))
    setCategoryId(editing.categoryId ?? '')
    setBillingDay(editing.billingDay ? String(editing.billingDay) : '')
    setPaymentMethod(editing.paymentMethod)
    setHasRecurrence(!!editing.recurrenceType)
    setRecurrenceType(editing.recurrenceType ?? null)
    setRecurrenceWeekdays(editing.recurrenceWeekdays ?? [])
    setRecurrenceDates(editing.recurrenceDates ?? [])
  }
}, [editing])
```

- [ ] **Step 4: Compute billing cycle and preview**

Add a `useMemo` for cycle-aware preview calculations, after the state declarations:

```ts
const today = new Date()
const { start: cycleStartDate, end: cycleEndDate } = creditCard
  ? getCurrentBillingCycle(creditCard.closingDay, today)
  : { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) }

const cycleStart = cycleStartDate.toISOString().split('T')[0]
const cycleEnd = cycleEndDate.toISOString().split('T')[0]

const previewExpense: FixedExpense = useMemo(() => ({
  id: '_preview',
  description: '',
  amount: parseFloat(amount) || 0,
  paymentMethod,
  isActive: true,
  createdAt: '',
  recurrenceType: recurrenceType ?? undefined,
  recurrenceWeekdays: recurrenceType === 'weekdays' ? recurrenceWeekdays : undefined,
  recurrenceDates: recurrenceType === 'specific' ? recurrenceDates : undefined,
}), [amount, recurrenceType, recurrenceWeekdays, recurrenceDates, paymentMethod])

const previewTotal = useMemo(() =>
  hasRecurrence && recurrenceType
    ? calcRecurringFixedTotal([previewExpense], cycleEnd, today)
    : 0,
  [previewExpense, hasRecurrence, recurrenceType, cycleEnd]
)

const previewCount = useMemo(() => {
  if (!hasRecurrence || !recurrenceType) return 0
  const amt = parseFloat(amount)
  if (!amt || amt <= 0) return 0
  return Math.round(previewTotal / amt)
}, [previewTotal, amount, hasRecurrence, recurrenceType])
```

- [ ] **Step 5: Update `handleSubmit`**

Update the payload construction in `handleSubmit` to include recurrence fields and clear `billingDay` when recurrence is active:

```ts
function handleSubmit(e: React.FormEvent) {
  e.preventDefault()
  const parsedAmount = parseFloat(amount)
  if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return

  const parsedDay = parseInt(billingDay)
  const payload = {
    description: description.trim(),
    amount: parsedAmount,
    categoryId: categoryId || undefined,
    billingDay: hasRecurrence ? undefined : (parsedDay >= 1 && parsedDay <= 31 ? parsedDay : undefined),
    paymentMethod,
    isActive: editing?.isActive ?? true,
    recurrenceType: hasRecurrence && recurrenceType ? recurrenceType : undefined,
    recurrenceWeekdays: hasRecurrence && recurrenceType === 'weekdays' ? recurrenceWeekdays : undefined,
    recurrenceDates: hasRecurrence && recurrenceType === 'specific' ? recurrenceDates : undefined,
  }

  if (editing) {
    updateFixedExpense(editing.id, payload)
  } else {
    addFixedExpense(payload)
  }
  onClose()
}
```

- [ ] **Step 6: Add weekday chip helpers**

Add these constants and helpers before the return statement:

```ts
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toggleWeekday(day: number) {
  setRecurrenceType('weekdays')
  setRecurrenceDates([])
  setRecurrenceWeekdays((prev) =>
    prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
  )
}

function applyWeekdayShortcut(days: number[]) {
  setRecurrenceType('weekdays')
  setRecurrenceDates([])
  setRecurrenceWeekdays((prev) => {
    const allSelected = days.every((d) => prev.includes(d))
    return allSelected ? prev.filter((d) => !days.includes(d)) : [...new Set([...prev, ...days])]
  })
}
```

- [ ] **Step 7: Add calendar modal helper**

Add a helper to generate all dates in the billing cycle:

```ts
function getCycleDates(): string[] {
  const dates: string[] = []
  const cursor = new Date(cycleStartDate)
  while (cursor <= cycleEndDate) {
    dates.push(cursor.toISOString().split('T')[0])
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}
```

- [ ] **Step 8: Build the recurrence UI section**

In the JSX `<form>`, after the existing "Dia de cobrança" section (which should now be conditionally rendered), add the following block:

```tsx
{/* Recurrence toggle */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Esse valor se repete em outros dias?
  </label>
  <div className="flex gap-3">
    {(['Não', 'Sim'] as const).map((opt) => {
      const active = opt === 'Sim' ? hasRecurrence : !hasRecurrence
      return (
        <button
          key={opt}
          type="button"
          onClick={() => {
            const next = opt === 'Sim'
            setHasRecurrence(next)
            if (!next) {
              setRecurrenceType(null)
              setRecurrenceWeekdays([])
              setRecurrenceDates([])
            }
          }}
          className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
            active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
          }`}
        >
          {opt}
        </button>
      )
    })}
  </div>
</div>

{/* Recurrence options — shown only when hasRecurrence */}
{hasRecurrence && (
  <div className="space-y-3">
    {/* Weekday chips */}
    <div>
      <p className="text-xs text-gray-500 mb-2">Dias da semana</p>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5, 6, 0].map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleWeekday(day)}
            className={`px-3 py-1 rounded-full border text-sm transition-colors ${
              recurrenceType === 'weekdays' && recurrenceWeekdays.includes(day)
                ? 'border-blue-500 bg-blue-100 text-blue-700'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            {WEEKDAY_LABELS[day]}
          </button>
        ))}
      </div>
    </div>

    {/* Shortcuts */}
    <div className="flex gap-2 flex-wrap">
      <button
        type="button"
        onClick={() => applyWeekdayShortcut([6, 0])}
        className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        Fins de semana
      </button>
      <button
        type="button"
        onClick={() => applyWeekdayShortcut([1, 2, 3, 4, 5])}
        className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
      >
        Dias úteis
      </button>
      <button
        type="button"
        onClick={() => {
          setRecurrenceType('specific')
          setRecurrenceWeekdays([])
          setShowCalendar(true)
        }}
        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
          recurrenceType === 'specific'
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-gray-300 text-gray-600 hover:bg-gray-50'
        }`}
      >
        Personalizado {recurrenceType === 'specific' && recurrenceDates.length > 0 ? `(${recurrenceDates.length})` : ''}
      </button>
    </div>

    {/* Preview */}
    {recurrenceType && (
      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
        {previewCount} ocorrência{previewCount !== 1 ? 's' : ''} até o fechamento
        {' → '}
        <strong>Total previsto: {formatBRL(previewTotal)}</strong>
      </div>
    )}
  </div>
)}

{/* Calendar modal */}
{showCalendar && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30">
    <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
      <h3 className="text-base font-semibold mb-4">Selecionar datas do ciclo</h3>
      <div className="grid grid-cols-7 gap-1 mb-4">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
        {getCycleDates().map((dateStr) => {
          const d = new Date(dateStr + 'T12:00:00')
          const selected = recurrenceDates.includes(dateStr)
          const isPast = dateStr <= new Date().toISOString().split('T')[0]
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => setRecurrenceDates((prev) =>
                prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr]
              )}
              className={`aspect-square rounded-full text-xs font-medium transition-colors ${
                isPast
                  ? 'text-gray-300 cursor-not-allowed'
                  : selected
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-700 hover:bg-purple-50'
              }`}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={() => setShowCalendar(false)}
        className="w-full bg-purple-600 text-white rounded-lg py-2 font-medium hover:bg-purple-700 transition-colors"
      >
        Confirmar ({recurrenceDates.length} data{recurrenceDates.length !== 1 ? 's' : ''})
      </button>
    </div>
  </div>
)}
```

- [ ] **Step 9: Conditionally hide "Dia de cobrança"**

Wrap the existing "Dia de cobrança" `<div>` with `{!hasRecurrence && ( ... )}`.

- [ ] **Step 10: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 11: Manual smoke test**

Start dev server:
```bash
npm run dev
```

1. Navigate to `/fixed` (Gastos Fixos)
2. Open the "+" form
3. Toggle "Sim" → chips appear, "Dia de cobrança" disappears
4. Select "Seg" chip → preview shows count × amount
5. Select "Personalizado" → calendar modal opens with cycle dates
6. Pick 2 dates → confirm → preview updates
7. Submit → expense saved
8. Reopen edit → correct recurrence pre-filled

- [ ] **Step 12: Commit**

```bash
git add src/components/fixedExpenses/FixedExpenseForm.tsx
git commit -m "feat: add recurrence selector to FixedExpenseForm (weekdays + custom calendar)"
```

---

## Task 8: Update `FixedExpensesPage` list

**Files:**
- Modify: `kekel-finance/src/pages/FixedExpensesPage.tsx`

- [ ] **Step 1: Add imports**

At the top of `FixedExpensesPage.tsx`, add:

```ts
import { useFinanceStore } from '@/store/useFinanceStore'
import { calcRecurringFixedTotal, getCurrentBillingCycle } from '@/utils/forecastUtils'
```

The file already imports `useFinanceStore` — just add `calcRecurringFixedTotal`, `getCurrentBillingCycle`, and `formatBRL` to the forecastUtils import.

- [ ] **Step 2: Compute cycle info at component level**

After the existing store destructuring, add:

```ts
const { creditCard } = useFinanceStore()

const today = new Date()
const { end: cycleEndDate } = creditCard
  ? getCurrentBillingCycle(creditCard.closingDay, today)
  : { end: new Date(today.getFullYear(), today.getMonth() + 1, 0) }
const cycleEnd = cycleEndDate.toISOString().split('T')[0]

const WEEKDAY_LABELS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
```

- [ ] **Step 3: Add recurrence detail helper**

Add a helper function inside the component:

```ts
function getRecurrenceDetail(fe: FixedExpense): string | null {
  if (!fe.recurrenceType || !fe.isActive) return null
  const total = calcRecurringFixedTotal([fe], cycleEnd, today)  // single call
  const count = fe.amount > 0 ? Math.round(total / fe.amount) : 0
  const totalStr = formatBRL(total)

  if (fe.recurrenceType === 'weekdays') {
    const labels = (fe.recurrenceWeekdays ?? [])
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_LABELS_SHORT[d])
      .join(', ')
    return `${labels}  ·  ${count} ocorrência${count !== 1 ? 's' : ''}  ·  ${totalStr} este ciclo`
  }
  return `Datas específicas  ·  ${count} ocorrência${count !== 1 ? 's' : ''}  ·  ${totalStr} este ciclo`
}
```

- [ ] **Step 4: Update `renderItem` to show recurrence detail**

In the existing `renderItem` function, after the description `<p>` tag and the existing `<div className="flex items-center gap-2 mt-0.5">`, add the recurrence detail line:

```tsx
const detail = getRecurrenceDetail(fe)
// Inside the existing flex div (below catName and billingDay spans), or as a new line:
```

Actually, replace the existing detail section inside `renderItem` with:

```tsx
<div className="flex-1 min-w-0">
  <p className="font-medium text-gray-800 text-sm truncate">{fe.description}</p>
  <div className="flex items-center gap-2 mt-0.5">
    {catName && <span className="text-xs text-gray-400">{catName}</span>}
    {!fe.recurrenceType && fe.billingDay && (
      <span className="text-xs text-blue-500 font-medium">vence dia {fe.billingDay}</span>
    )}
  </div>
  {(() => { const detail = getRecurrenceDetail(fe); return detail ? <p className="text-xs text-purple-600 mt-0.5">{detail}</p> : null })()
</div>
```

- [ ] **Step 5: Type-check and lint**

```bash
npx tsc --noEmit && npm run lint
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

In the running dev server:
1. Navigate to `/fixed`
2. Expenses with weekday recurrence should show a purple detail line: `"Seg, Sex  ·  3 ocorrências  ·  R$ 150,00 este ciclo"`
3. Expenses with specific dates should show: `"Datas específicas  ·  2 ocorrências  ·  R$ 100,00 este ciclo"`
4. Monthly fixed expenses (no recurrenceType) show `vence dia X` as before

- [ ] **Step 7: Commit**

```bash
git add src/pages/FixedExpensesPage.tsx
git commit -m "feat: show recurrence detail in FixedExpensesPage list items"
```

---

## Task 9: Build verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: no TypeScript errors, build completes successfully.

- [ ] **Step 3: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: post-review cleanup for weekly recurrence feature"
```

---

## Summary of changes

| What changed | Why |
|---|---|
| `FixedExpense` type — 3 new optional fields | Store recurrence rule |
| `ForecastResult` — 3 new number fields | Expose card/cash split to UI consumers |
| `calcRecurringFixedTotal` — new helper | Pure function counting future occurrences |
| `calculateForecast` — split monthlyFixed/recurringFixed | Preserve `totalFixedActive` invariant; route cash/card correctly |
| `mapFixedExpenseFromDB` | Map new DB columns |
| `addFixedExpense` / `updateFixedExpense` | Persist recurrence fields; null billingDay when recurrence active |
| Migration 004 | 3 nullable columns on `fixed_expenses` |
| `FixedExpenseForm` | Toggle + chips + calendar modal + preview |
| `FixedExpensesPage` | Purple detail line per recurring item |
