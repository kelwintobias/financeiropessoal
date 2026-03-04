import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import BudgetBar from '@/components/budget/BudgetBar'
import { getSpentByCategory, currentMonth } from '@/utils/budgetUtils'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function BudgetPage() {
  const { categories, expenses, budgets, addBudget, updateBudget, getBudgetByCategory } =
    useFinanceStore()

  const month = currentMonth()
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})

  const monthLabel = new Date(month + '-02').toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  function getInputValue(categoryId: string): string {
    if (editingValues[categoryId] !== undefined) return editingValues[categoryId]
    const budget = getBudgetByCategory(categoryId, month)
    return budget ? String(budget.limitAmount) : ''
  }

  function handleChange(categoryId: string, value: string) {
    setEditingValues((prev) => ({ ...prev, [categoryId]: value }))
  }

  function handleSave(categoryId: string) {
    const raw = editingValues[categoryId]
    if (raw === undefined) return

    const parsed = parseFloat(raw)
    const existing = getBudgetByCategory(categoryId, month)

    if (!raw || isNaN(parsed) || parsed <= 0) {
      setEditingValues((prev) => {
        const next = { ...prev }
        delete next[categoryId]
        return next
      })
      return
    }

    if (existing) {
      updateBudget(existing.id, { limitAmount: parsed })
    } else {
      addBudget({ categoryId, month, limitAmount: parsed })
    }

    setEditingValues((prev) => {
      const next = { ...prev }
      delete next[categoryId]
      return next
    })
  }

  const totalBudget = budgets
    .filter((b) => b.month === month)
    .reduce((sum, b) => sum + b.limitAmount, 0)

  const totalSpent = expenses
    .filter((e) => e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 capitalize">
          Orçamento — {monthLabel}
        </h1>
      </div>

      {/* Resumo do mês */}
      {totalBudget > 0 && (
        <div className="bg-blue-600 text-white rounded-2xl p-4 mb-4">
          <p className="text-sm opacity-80">Total orçado</p>
          <p className="text-3xl font-bold">{formatBRL(totalBudget)}</p>
          <p className="text-sm opacity-80 mt-1">
            Gasto: {formatBRL(totalSpent)} ({Math.round((totalSpent / totalBudget) * 100)}%)
          </p>
        </div>
      )}

      {/* Lista de categorias */}
      <ul className="space-y-3">
        {categories.map((cat) => {
          const spent = getSpentByCategory(expenses, cat.id, month)
          const budget = getBudgetByCategory(cat.id, month)
          const inputVal = getInputValue(cat.id)

          return (
            <li key={cat.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="font-medium text-gray-800 flex-1">{cat.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Sem limite"
                    value={inputVal}
                    onChange={(e) => handleChange(cat.id, e.target.value)}
                    onBlur={() => handleSave(cat.id)}
                    className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {budget ? (
                <BudgetBar
                  categoryName={cat.name}
                  spent={spent}
                  limit={budget.limitAmount}
                  month={month}
                />
              ) : (
                <p className="text-xs text-gray-400">Sem orçamento definido</p>
              )}
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-gray-400 text-center mt-6">
        Defina um limite por categoria e pressione Tab ou clique fora para salvar.
      </p>
    </div>
  )
}
