# Layout Restructure — Home + Crédito Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Limpar a Home para mostrar só "Saldo em Conta", criar a página/aba "Crédito" com os painéis de forecast e fatura, e remover a seção "Previsão de Receitas".

**Architecture:** Extração do componente `EditableAmount` para arquivo compartilhado, criação de `CreditPage.tsx` com código migrado do Dashboard, limpeza do `DashboardPage.tsx`, e adição de rota + aba de navegação. As tarefas seguem ordem de dependência: EditableAmount primeiro (usado pelas duas páginas), depois CreditPage, depois Dashboard cleanup, por fim rota e nav.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Router v6, Zustand (`useFinanceStore`), `calculateForecast` de `@/utils/forecastUtils`

---

## Files

| Ação | Arquivo |
|------|---------|
| Criar | `kekel-finance/src/components/ui/EditableAmount.tsx` |
| Criar | `kekel-finance/src/pages/CreditPage.tsx` |
| Modificar | `kekel-finance/src/pages/DashboardPage.tsx` |
| Modificar | `kekel-finance/src/routes.tsx` |
| Modificar | `kekel-finance/src/components/layout/BottomNav.tsx` |

---

### Task 1: Extrair EditableAmount para componente compartilhado

**Files:**
- Create: `kekel-finance/src/components/ui/EditableAmount.tsx`
- Modify: `kekel-finance/src/pages/DashboardPage.tsx` (remover definição inline, adicionar import)

- [ ] **Step 1: Criar `src/components/ui/EditableAmount.tsx`**

  ```tsx
  import { useState, useRef } from 'react'

  interface EditableAmountProps {
    value: number
    onSave: (v: number) => Promise<void>
    label: string
  }

  export default function EditableAmount({ value, onSave, label }: EditableAmountProps) {
    const [editing, setEditing] = useState(false)
    const [inputVal, setInputVal] = useState('')
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const startEdit = () => {
      setInputVal(value.toFixed(2).replace('.', ','))
      setEditing(true)
      setTimeout(() => inputRef.current?.select(), 0)
    }

    const commit = async () => {
      const parsed = parseFloat(inputVal.replace(',', '.'))
      if (!isNaN(parsed)) {
        setSaving(true)
        await onSave(parsed)
        setSaving(false)
      }
      setEditing(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commit()
      if (e.key === 'Escape') setEditing(false)
    }

    if (editing) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{label}</span>
          <input
            ref={inputRef}
            className="border border-blue-400 rounded px-2 py-0.5 text-sm w-32 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            disabled={saving}
            inputMode="decimal"
          />
          {saving && <span className="text-xs text-gray-400">...</span>}
        </div>
      )
    }

    return (
      <button
        onClick={startEdit}
        className="flex items-center gap-1 group text-left"
        title="Clique para editar"
      >
        <span className="text-sm text-gray-500">{label}</span>
        <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
        </span>
        <span className="text-gray-300 group-hover:text-blue-400 text-xs">✏</span>
      </button>
    )
  }
  ```

- [ ] **Step 2: Atualizar DashboardPage.tsx — remover definição inline, adicionar import**

  No topo de `DashboardPage.tsx`, adicionar o import:
  ```tsx
  import EditableAmount from '@/components/ui/EditableAmount'
  ```

  Remover as linhas 7–74 (a função `EditableAmount` inline e a linha em branco antes de `export default function DashboardPage`).

- [ ] **Step 3: Verificar typecheck**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck
  ```
  Esperado: sem erros.

- [ ] **Step 4: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/components/ui/EditableAmount.tsx kekel-finance/src/pages/DashboardPage.tsx && git commit -m "refactor: extract EditableAmount to shared component"
  ```

---

### Task 2: Criar CreditPage

**Files:**
- Create: `kekel-finance/src/pages/CreditPage.tsx`

- [ ] **Step 1: Criar `src/pages/CreditPage.tsx`**

  ```tsx
  import { Link } from 'react-router-dom'
  import { useFinanceStore } from '@/store/useFinanceStore'
  import { currentMonth } from '@/utils/budgetUtils'
  import { calculateForecast, formatBRL } from '@/utils/forecastUtils'
  import EditableAmount from '@/components/ui/EditableAmount'

  export default function CreditPage() {
    const {
      incomes,
      expenses,
      fixedExpenses,
      creditCard,
      userSettings,
      updateBillAndRecord,
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

    const {
      spendingPower,
      cardBillAccumulated,
      cardBillForecast,
      daysUntilClosing,
      daysUntilPayment,
      incomeBeforePayment,
      accountBalance,
      cycleExpensesCash,
      cycleExpensesCard,
      fixedAlreadyBilled,
      fixedPending,
      cycleStart,
      cycleEnd,
      quantoPodeGastar,
    } = forecast

    const closingDate = creditCard
      ? (() => {
          const d = today.getDate()
          const y = today.getFullYear()
          const m = today.getMonth()
          return d < creditCard.closingDay
            ? new Date(y, m, creditCard.closingDay)
            : new Date(y, m + 1, creditCard.closingDay)
        })()
      : null

    const paymentDate = creditCard
      ? (() => {
          const d = today.getDate()
          const y = today.getFullYear()
          const m = today.getMonth()
          return d < creditCard.paymentDay
            ? new Date(y, m, creditCard.paymentDay)
            : new Date(y, m + 1, creditCard.paymentDay)
        })()
      : null

    const formatDay = (date: Date) =>
      `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`

    const limitPercent =
      creditCard?.creditLimit && creditCard.creditLimit > 0
        ? Math.min(100, (cardBillForecast / creditCard.creditLimit) * 100)
        : null

    const formatCycleRange = () => {
      const fmt = (d: string) => {
        const [, m, day] = d.split('-')
        return `${day}/${m}`
      }
      return `${fmt(cycleStart)} – ${fmt(cycleEnd)}`
    }

    return (
      <div className="max-w-lg mx-auto px-4 py-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-4">💳 Crédito</h1>

        {/* Section 1 — Quanto posso gastar */}
        <section className={`rounded-xl p-5 mb-4 ${quantoPodeGastar >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500 text-center">Disponível para gastar</p>
          <p className={`text-4xl font-bold text-center ${quantoPodeGastar >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {formatBRL(quantoPodeGastar)}
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4 text-center">este mês</p>

          <div className="space-y-1.5 text-sm border-t border-gray-200 pt-3">
            <div className="flex justify-between text-gray-600">
              <span>Saldo atual</span>
              <span className="font-medium text-gray-800">{formatBRL(accountBalance)}</span>
            </div>
            {incomeBeforePayment > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>+ Renda a receber (antes do pagamento)</span>
                <span className="font-medium text-green-700">+ {formatBRL(incomeBeforePayment)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>- Fatura total (cartão + fixos + gastos)</span>
              <span className="text-red-500">- {formatBRL(cardBillForecast)}</span>
            </div>
            {cycleExpensesCash > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>- Gastos em Pix/Dinheiro (ciclo)</span>
                <span className="text-orange-500">- {formatBRL(cycleExpensesCash)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500 items-center">
              <span>- Meta de saldo</span>
              <EditableAmount
                value={monthlyGoal}
                onSave={updateMonthlyGoal}
                label=""
              />
            </div>
            <div className="flex justify-between font-semibold border-t border-gray-200 pt-1.5 mt-1.5">
              <span className="text-gray-700">= Disponível</span>
              <span className={quantoPodeGastar >= 0 ? 'text-green-700' : 'text-red-600'}>{formatBRL(quantoPodeGastar)}</span>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-400">
            <span>Saldo - fatura total</span>
            <span className={spendingPower >= 0 ? 'text-green-600' : 'text-red-500'}>{formatBRL(spendingPower)}</span>
          </div>
        </section>

        {/* Section 2 — Situação da Fatura */}
        <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-700">Situação da Fatura</h2>
            <Link to="/card" className="text-xs text-blue-600 hover:underline">
              {creditCard ? 'Editar cartão' : 'Configurar'}
            </Link>
          </div>

          {!creditCard ? (
            <p className="text-sm text-gray-400 text-center py-2">
              Configure seu cartão para ver as previsões.{' '}
              <Link to="/card" className="text-blue-600 hover:underline">Configurar agora</Link>
            </p>
          ) : (
            <>
              <div className="space-y-2 mb-3">
                <div className="flex justify-between text-sm text-gray-600 items-center">
                  <EditableAmount
                    value={cardBillAccumulated}
                    onSave={updateBillAndRecord}
                    label="Fatura atual"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>+ Custos fixos pendentes</span>
                  <span>{formatBRL(fixedPending)}</span>
                </div>
                {fixedAlreadyBilled > 0 && (
                  <div className="flex justify-between text-xs text-gray-400 italic">
                    <span className="line-through">Custos fixos já na fatura</span>
                    <span className="line-through">{formatBRL(fixedAlreadyBilled)}</span>
                  </div>
                )}
                {cycleExpensesCard > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>+ Gastos no cartão (ciclo {formatCycleRange()})</span>
                    <span>{formatBRL(cycleExpensesCard)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-semibold border-t border-gray-100 pt-1.5 text-gray-700">
                  <span>= Fatura total prevista</span>
                  <span className="text-orange-600">{formatBRL(cardBillForecast)}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400 pt-1">
                  <span>Fechamento {closingDate ? `dia ${formatDay(closingDate)}` : ''} ({daysUntilClosing}d)</span>
                  <span>Pagamento em {daysUntilPayment} dias {paymentDate ? `(dia ${formatDay(paymentDate)})` : ''}</span>
                </div>
              </div>

              {limitPercent !== null && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Uso do limite</span>
                    <span>{limitPercent.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${limitPercent > 80 ? 'bg-red-500' : limitPercent > 60 ? 'bg-orange-400' : 'bg-blue-500'}`}
                      style={{ width: `${limitPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{formatBRL(cardBillForecast)}</span>
                    <span>Limite: {formatBRL(creditCard.creditLimit!)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    )
  }
  ```

- [ ] **Step 2: Verificar typecheck**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck
  ```
  Esperado: sem erros.

- [ ] **Step 3: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/pages/CreditPage.tsx && git commit -m "feat: create CreditPage with spending power and bill sections"
  ```

---

### Task 3: Limpar DashboardPage — manter apenas Saldo em Conta

**Files:**
- Modify: `kekel-finance/src/pages/DashboardPage.tsx`

- [ ] **Step 1: Substituir o conteúdo completo de DashboardPage.tsx**

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
      </div>
    )
  }
  ```

- [ ] **Step 2: Verificar typecheck e build**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck && npm run build
  ```
  Esperado: sem erros.

- [ ] **Step 3: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/pages/DashboardPage.tsx && git commit -m "feat: slim DashboardPage to Saldo em Conta only"
  ```

---

### Task 4: Adicionar rota /credit e aba Crédito no BottomNav

**Files:**
- Modify: `kekel-finance/src/routes.tsx`
- Modify: `kekel-finance/src/components/layout/BottomNav.tsx`

- [ ] **Step 1: Atualizar routes.tsx**

  Adicionar o import:
  ```tsx
  import CreditPage from '@/pages/CreditPage'
  ```

  Adicionar a rota dentro do `<Route element={<Layout />}>`:
  ```tsx
  <Route path="credit" element={<CreditPage />} />
  ```

  O arquivo final deve ficar:
  ```tsx
  import { Routes, Route } from 'react-router-dom'
  import Layout from '@/components/layout/Layout'
  import DashboardPage from '@/pages/DashboardPage'
  import ExpensesPage from '@/pages/ExpensesPage'
  import GoalsPage from '@/pages/GoalsPage'
  import IncomePage from '@/pages/IncomePage'
  import FixedExpensesPage from '@/pages/FixedExpensesPage'
  import CardPage from '@/pages/CardPage'
  import CreditPage from '@/pages/CreditPage'

  export default function AppRoutes() {
    return (
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="income" element={<IncomePage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="fixed" element={<FixedExpensesPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="card" element={<CardPage />} />
          <Route path="credit" element={<CreditPage />} />
        </Route>
      </Routes>
    )
  }
  ```

- [ ] **Step 2: Atualizar BottomNav.tsx**

  Adicionar `{ to: '/credit', icon: '💳', label: 'Crédito' }` como 6ª entrada em `NAV_ITEMS`:

  ```ts
  const NAV_ITEMS = [
    { to: '/',         icon: '🏠', label: 'Início'   },
    { to: '/income',   icon: '💰', label: 'Renda'    },
    { to: '/expenses', icon: '💸', label: 'Gastos'   },
    { to: '/fixed',    icon: '📋', label: 'Fixos'    },
    { to: '/goals',    icon: '🎯', label: 'Metas'    },
    { to: '/credit',   icon: '💳', label: 'Crédito'  },
  ]
  ```

- [ ] **Step 3: Verificar typecheck e build final**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance/kekel-finance" && npm run typecheck && npm run build
  ```
  Esperado: build limpo.

- [ ] **Step 4: Rodar testes**

  ```bash
  npm test -- --run
  ```
  Esperado: 18/18 passando.

- [ ] **Step 5: Commit**

  ```bash
  cd "C:/Users/kelwi/Documents/projeto kekel finance" && git add kekel-finance/src/routes.tsx kekel-finance/src/components/layout/BottomNav.tsx && git commit -m "feat: add /credit route and Crédito nav tab"
  ```
