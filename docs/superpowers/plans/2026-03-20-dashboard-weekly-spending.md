# Dashboard Weekly Spending Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Meta de Saldo Final" editable field to the Home screen and a new "Controle da Semana" section showing Total Disponível, Disponível até Domingo, and Limite Diário based on a Mon–Sun weekly cycle.

**Architecture:** All changes are in a single file (`DashboardPage.tsx`). The "Saldo em Conta" section gains a second `EditableAmount` for `monthlyGoal`. A new "Controle da Semana" section computes weekly spending limits purely from `accountBalance`, `monthlyGoal`, and the current day of the week — no new store methods, no DB migration needed.

**Tech Stack:** React, TypeScript, Tailwind CSS, Zustand (`useFinanceStore`), `EditableAmount` shared component

---

## Files

| Action | File |
|--------|------|
| Modify | `kekel-finance/src/pages/DashboardPage.tsx` |

---

### Task 1: Add "Meta de Saldo Final" to "Saldo em Conta" section

Add a second `EditableAmount` row for `monthlyGoal` inside the existing "Saldo em Conta" section, and destructure `updateMonthlyGoal` from the store.

**Files:**
- Modify: `kekel-finance/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Read the current file**

  Confirm content before editing:
  ```bash
  # File: kekel-finance/src/pages/DashboardPage.tsx
  ```

- [ ] **Step 2: Add `updateMonthlyGoal` to the store destructure**

  Change lines 7–14 from:
  ```tsx
  const {
    incomes,
    expenses,
    fixedExpenses,
    creditCard,
    userSettings,
    updateAccountBalance,
  } = useFinanceStore()
  ```
  To:
  ```tsx
  const {
    incomes,
    expenses,
    fixedExpenses,
    creditCard,
    userSettings,
    updateAccountBalance,
    updateMonthlyGoal,
  } = useFinanceStore()
  ```

- [ ] **Step 3: Add `EditableAmount` for Meta de Saldo Final inside the "Saldo em Conta" section**

  The `<div className="space-y-2">` block currently contains one `<EditableAmount>` and a conditional block. Add the second `EditableAmount` immediately after the first one:

  Change:
  ```tsx
  <div className="space-y-2">
    <EditableAmount
      value={accountBalance}
      onSave={updateAccountBalance}
      label="Saldo atual"
    />
    {cycleExpensesCash > 0 && (
  ```
  To:
  ```tsx
  <div className="space-y-2">
    <EditableAmount
      value={accountBalance}
      onSave={updateAccountBalance}
      label="Saldo atual"
    />
    <EditableAmount
      value={monthlyGoal}
      onSave={updateMonthlyGoal}
      label="Meta de Saldo Final"
    />
    {cycleExpensesCash > 0 && (
  ```

- [ ] **Step 4: Run typecheck and lint**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck && npm run lint
  ```

  Expected: no errors. Lint warnings from other files (pre-existing) can be ignored.

- [ ] **Step 5: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/pages/DashboardPage.tsx && git commit -m "feat: add Meta de Saldo Final editable field to Saldo em Conta section [Weekly Spending]"
  ```

---

### Task 2: Add "Controle da Semana" section

Add the weekly spending control section below "Saldo em Conta" with three values: Total Disponível (large), Disponível até Domingo (medium), and Limite Diário (medium).

**Files:**
- Modify: `kekel-finance/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Add weekly calculations to the component body**

  After the existing `const { accountBalance, realAccountBalance, cycleExpensesCash } = forecast` line (currently line 32), add:

  ```tsx
  const totalDisponivel = accountBalance - monthlyGoal
  const d = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const diasRestantes = d === 0 ? 1 : 8 - d
  // Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
  const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0
  const disponivelAteDomingo = limiteDiario * diasRestantes
  ```

- [ ] **Step 2: Add the "Controle da Semana" JSX section**

  After the closing `</section>` tag of "Saldo em Conta" (and before the closing `</div>`), add:

  ```tsx
  {/* Controle da Semana */}
  <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
    <h2 className="font-semibold text-gray-700 mb-3">Controle da Semana</h2>

    {/* Total Disponível */}
    <div className="mb-4 text-center">
      <p className="text-sm text-gray-500 mb-1">Total Disponível</p>
      <p className={`text-3xl font-bold ${totalDisponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        {formatBRL(totalDisponivel)}
      </p>
    </div>

    <div className="space-y-2 border-t border-gray-100 pt-3">
      {/* Disponível até Domingo */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">Disponível até Domingo</span>
          <p className="text-xs text-gray-400">{diasRestantes} dias (hoje inclusive)</p>
        </div>
        <span className={`text-xl font-semibold ${disponivelAteDomingo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatBRL(disponivelAteDomingo)}
        </span>
      </div>

      {/* Limite Diário */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm text-gray-600">Limite Diário</span>
          <p className="text-xs text-gray-400">por dia (base 7 dias)</p>
        </div>
        <span className={`text-xl font-semibold ${limiteDiario >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
          {formatBRL(limiteDiario)}
        </span>
      </div>
    </div>
  </section>
  ```

- [ ] **Step 3: Verify the complete file looks correct**

  The complete `DashboardPage.tsx` after both tasks should be:

  ```tsx
  import { useFinanceStore } from '@/store/useFinanceStore'
  import { currentMonth } from '@/utils/budgetUtils'
  import { calculateForecast, formatBRL } from '@/utils/forecastUtils'
  import EditableAmount from '@/components/ui/EditableAmount'

  export default function DashboardPage() {
    const {
      incomes,
      expenses,
      fixedExpenses,
      creditCard,
      userSettings,
      updateAccountBalance,
      updateMonthlyGoal,
    } = useFinanceStore()

    const month = currentMonth()
    const today = new Date()
    const manualBalance = userSettings?.accountBalance ?? 0
    const monthlyGoal = userSettings?.monthlyGoal ?? 0

    const forecast = calculateForecast({
      today,
      incomes,
      expenses,
      fixedExpenses,
      creditCard,
      manualBalance,
      monthlyGoal,
      currentMonth: month,
    })

    const { accountBalance, realAccountBalance, cycleExpensesCash } = forecast

    const totalDisponivel = accountBalance - monthlyGoal
    const d = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
    const diasRestantes = d === 0 ? 1 : 8 - d
    // Dom=1, Seg=7, Ter=6, Qua=5, Qui=4, Sex=3, Sáb=2
    const limiteDiario = diasRestantes > 0 ? totalDisponivel / 7 : 0
    const disponivelAteDomingo = limiteDiario * diasRestantes

    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

        {/* Saldo em Conta */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Saldo em Conta</h2>
          <div className="space-y-2">
            <EditableAmount
              value={accountBalance}
              onSave={updateAccountBalance}
              label="Saldo atual"
            />
            <EditableAmount
              value={monthlyGoal}
              onSave={updateMonthlyGoal}
              label="Meta de Saldo Final"
            />
            {cycleExpensesCash > 0 && (
              <>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>- Gastos Pix/Dinheiro (ciclo)</span>
                  <span className="text-orange-500">- {formatBRL(cycleExpensesCash)}</span>
                </div>
                <div className={`flex justify-between text-sm font-semibold border-t border-gray-100 pt-1.5 ${realAccountBalance >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                  <span>= Saldo real em conta</span>
                  <span>{formatBRL(realAccountBalance)}</span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Controle da Semana */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Controle da Semana</h2>

          {/* Total Disponível */}
          <div className="mb-4 text-center">
            <p className="text-sm text-gray-500 mb-1">Total Disponível</p>
            <p className={`text-3xl font-bold ${totalDisponivel >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatBRL(totalDisponivel)}
            </p>
          </div>

          <div className="space-y-2 border-t border-gray-100 pt-3">
            {/* Disponível até Domingo */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">Disponível até Domingo</span>
                <p className="text-xs text-gray-400">{diasRestantes} dias (hoje inclusive)</p>
              </div>
              <span className={`text-xl font-semibold ${disponivelAteDomingo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatBRL(disponivelAteDomingo)}
              </span>
            </div>

            {/* Limite Diário */}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">Limite Diário</span>
                <p className="text-xs text-gray-400">por dia (base 7 dias)</p>
              </div>
              <span className={`text-xl font-semibold ${limiteDiario >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                {formatBRL(limiteDiario)}
              </span>
            </div>
          </div>
        </section>
      </div>
    )
  }
  ```

- [ ] **Step 4: Run typecheck and lint**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck && npm run lint
  ```

  Expected: no errors.

- [ ] **Step 5: Run build**

  ```bash
  npm run build
  ```

  Expected: build completes without errors.

- [ ] **Step 6: Test manually in browser**

  ```bash
  npm run dev
  ```

  Open `http://localhost:5173/` and verify:
  - [ ] "Saldo em Conta" section shows two editable rows: "Saldo atual" and "Meta de Saldo Final"
  - [ ] Clicking "Meta de Saldo Final" value opens inline edit input; saving updates the value
  - [ ] "Controle da Semana" section appears below "Saldo em Conta"
  - [ ] "Total Disponível" shows large centered value (green if ≥ 0, red if < 0)
  - [ ] "Disponível até Domingo" shows correct value with sub-label "N dias (hoje inclusive)"
  - [ ] "Limite Diário" shows `totalDisponivel / 7` with sub-label "por dia (base 7 dias)"
  - [ ] If Meta de Saldo Final > Saldo atual, Total Disponível shows red
  - [ ] All three weekly values update immediately when either Saldo atual or Meta de Saldo Final is edited

- [ ] **Step 7: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/pages/DashboardPage.tsx && git commit -m "feat: add Controle da Semana section to Dashboard with weekly spending limits [Weekly Spending]"
  ```
