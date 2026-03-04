import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import ExpenseForm from '@/components/expenses/ExpenseForm'
import BudgetBar from '@/components/budget/BudgetBar'
import Alert from '@/components/ui/Alert'
import { getSpentByCategory, currentMonth } from '@/utils/budgetUtils'
import type { Expense } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const formatDate = (iso: string) => {
  const [year, month, day] = iso.split('-')
  return `${day}/${month}/${year}`
}

export default function ExpensesPage() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const {
    categories,
    budgets,
    getExpensesByMonth,
    deleteExpense,
    getBudgetByCategory,
  } = useFinanceStore()
  const expenses = getExpensesByMonth(year, month)

  const [filterCategoryId, setFilterCategoryId] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Expense | undefined>(undefined)
  const [alertMessage, setAlertMessage] = useState<string | null>(null)

  const filtered = filterCategoryId === 'all'
    ? expenses
    : expenses.filter((e) => e.categoryId === filterCategoryId)

  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date))

  const total = expenses.reduce((sum, e) => sum + e.amount, 0)

  function handleEdit(expense: Expense) {
    setEditing(expense)
    setShowForm(true)
  }

  function handleDelete(id: string) {
    if (window.confirm('Excluir este gasto?')) {
      deleteExpense(id)
    }
  }

  function handleClose() {
    setShowForm(false)
    setEditing(undefined)
  }

  function handleAfterSave({ categoryId, date }: { categoryId: string; date: string }) {
    const expenseMonth = date.slice(0, 7) // 'YYYY-MM'
    const state = useFinanceStore.getState()
    const budget = state.getBudgetByCategory(categoryId, expenseMonth)
    if (!budget) return

    const spent = getSpentByCategory(state.expenses, categoryId, expenseMonth)
    if (spent >= budget.limitAmount) {
      const cat = state.categories.find((c) => c.id === categoryId)
      setAlertMessage(
        `⚠️ Limite de ${cat?.name ?? 'categoria'} atingido! Você gastou ${formatBRL(spent)} de ${formatBRL(budget.limitAmount)}`
      )
      setTimeout(() => setAlertMessage(null), 5000)
    }
  }

  const getCategoryById = (id: string) => categories.find((c) => c.id === id)

  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })

  // Budget bars: categorias com gastos OU com orçamento definido no mês atual
  const budgetMonth = currentMonth()
  const categoryIdsWithActivity = new Set([
    ...expenses.map((e) => e.categoryId),
    ...budgets.filter((b) => b.month === budgetMonth).map((b) => b.categoryId),
  ])

  return (
    <div>
      {alertMessage && (
        <Alert message={alertMessage} onDismiss={() => setAlertMessage(null)} />
      )}

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800 capitalize">{monthLabel}</h1>
      </div>

      {/* Total */}
      <div className="bg-blue-600 text-white rounded-2xl p-4 mb-4">
        <p className="text-sm opacity-80">Total do mês</p>
        <p className="text-3xl font-bold">{formatBRL(total)}</p>
        <p className="text-sm opacity-80 mt-1">{expenses.length} gasto{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Budget bars por categoria */}
      {categoryIdsWithActivity.size > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Orçamento do mês</p>
          {[...categoryIdsWithActivity].map((catId) => {
            const cat = getCategoryById(catId)
            if (!cat) return null
            const budget = getBudgetByCategory(catId, budgetMonth)
            if (!budget) return null
            const spent = getSpentByCategory(expenses, catId, budgetMonth)
            return (
              <BudgetBar
                key={catId}
                categoryName={cat.name}
                spent={spent}
                limit={budget.limitAmount}
                month={budgetMonth}
              />
            )
          })}
          {[...categoryIdsWithActivity].every((id) => !getBudgetByCategory(id, budgetMonth)) && (
            <p className="text-xs text-gray-400">Nenhum orçamento configurado. Acesse a aba Orçamento para definir limites.</p>
          )}
        </div>
      )}

      {/* Filtro por categoria */}
      <div className="mb-4">
        <select
          value={filterCategoryId}
          onChange={(e) => setFilterCategoryId(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Lista */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">💸</p>
          <p>Nenhum gasto registrado neste mês</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sorted.map((expense) => {
            const category = getCategoryById(expense.categoryId)
            return (
              <li
                key={expense.id}
                className="bg-white rounded-xl p-4 flex items-center gap-3 shadow-sm"
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category?.color ?? '#6b7280' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800">{formatBRL(expense.amount)}</span>
                    <span className="text-xs text-gray-400">{formatDate(expense.date)}</span>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {category?.name}
                    {expense.description && ` · ${expense.description}`}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(expense)}
                    className="text-blue-500 hover:text-blue-700 text-sm"
                    aria-label="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                    aria-label="Excluir"
                  >
                    🗑️
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg text-2xl flex items-center justify-center hover:bg-blue-700 transition-colors z-10"
        aria-label="Novo gasto"
      >
        +
      </button>

      {/* Modal */}
      {showForm && (
        <ExpenseForm editing={editing} onClose={handleClose} onAfterSave={handleAfterSave} />
      )}
    </div>
  )
}
