import { useState, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import FixedExpenseForm from '@/components/fixedExpenses/FixedExpenseForm'
import type { FixedExpense } from '@/types'
import { calcRecurringFixedTotal, getCurrentBillingCycle, formatBRL } from '@/utils/forecastUtils'

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function FixedExpensesPage() {
  const { fixedExpenses, deleteFixedExpense, toggleFixedExpense, categories, creditCard } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FixedExpense | undefined>()

  const today = useMemo(() => new Date(), [])
  const todayStr = useMemo(() => today.toISOString().split('T')[0], [today])

  const cycleEnd = useMemo(() => {
    if (creditCard) {
      return getCurrentBillingCycle(creditCard.closingDay, today).end.toISOString().split('T')[0]
    }
    return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  }, [creditCard, today])

  const activeTotal = fixedExpenses
    .filter((fe) => fe.isActive)
    .reduce((sum, fe) => sum + fe.amount, 0)

  const activeList = fixedExpenses.filter((fe) => fe.isActive)
  const inactiveList = fixedExpenses.filter((fe) => !fe.isActive)

  function getCategoryName(categoryId?: string) {
    if (!categoryId) return null
    return categories.find((c) => c.id === categoryId)?.name ?? null
  }

  function handleEdit(fe: FixedExpense) {
    setEditing(fe)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditing(undefined)
  }

  function getRecurrenceDetail(fe: FixedExpense): string | null {
    if (!fe.recurrenceType) return null

    const cycleTotal = calcRecurringFixedTotal([fe], cycleEnd, today)

    if (fe.recurrenceType === 'weekdays') {
      const weekdays = fe.recurrenceWeekdays ?? []
      if (weekdays.length === 0) return null

      const count = fe.amount > 0 ? Math.round(cycleTotal / fe.amount) : 0

      const labels = weekdays.map((d) => WEEKDAY_NAMES[d]).join(', ')
      return `${labels}  ·  ${count} ocorrência${count !== 1 ? 's' : ''}  ·  ${formatBRL(cycleTotal)} este ciclo`
    }

    if (fe.recurrenceType === 'specific') {
      const dates = fe.recurrenceDates ?? []
      const count = dates.filter((d) => d > todayStr && d <= cycleEnd).length
      return `Datas específicas  ·  ${count} ocorrência${count !== 1 ? 's' : ''}  ·  ${formatBRL(cycleTotal)} este ciclo`
    }

    return null
  }

  function renderItem(fe: FixedExpense) {
    const catName = getCategoryName(fe.categoryId)
    const recurrenceDetail = getRecurrenceDetail(fe)
    return (
      <div key={fe.id} className={`flex items-center justify-between px-4 py-3 ${!fe.isActive ? 'opacity-50' : ''}`}>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-800 text-sm truncate">{fe.description}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {catName && <span className="text-xs text-gray-400">{catName}</span>}
            {fe.billingDay && !fe.recurrenceType && (
              <span className="text-xs text-blue-500 font-medium">vence dia {fe.billingDay}</span>
            )}
          </div>
          {recurrenceDetail && (
            <p className="text-xs text-gray-500 mt-0.5">{recurrenceDetail}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className="font-semibold text-gray-700 text-sm">{formatBRL(fe.amount)}</span>
          <button
            onClick={() => toggleFixedExpense(fe.id)}
            className={`text-xs px-2 py-1 rounded-full border transition-colors ${
              fe.isActive
                ? 'border-green-300 text-green-700 hover:bg-green-50'
                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
            }`}
            aria-label={fe.isActive ? 'Desativar' : 'Ativar'}
          >
            {fe.isActive ? 'Ativo' : 'Inativo'}
          </button>
          <button
            onClick={() => handleEdit(fe)}
            className="text-gray-400 hover:text-blue-600 text-sm"
            aria-label="Editar"
          >
            ✏️
          </button>
          <button
            onClick={() => deleteFixedExpense(fe.id)}
            className="text-gray-400 hover:text-red-600 text-sm"
            aria-label="Excluir"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-1">📋 Gastos Fixos</h1>
      <p className="text-sm text-gray-500 mb-4">Templates recorrentes mensais</p>

      {/* Summary */}
      <section className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between text-base font-semibold text-orange-700">
          <span>Total mensal (ativos)</span>
          <span>{formatBRL(activeTotal)}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {activeList.length} ativo{activeList.length !== 1 ? 's' : ''} · {inactiveList.length} inativo{inactiveList.length !== 1 ? 's' : ''}
        </p>
      </section>

      {/* Active list */}
      {fixedExpenses.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-400 text-sm">Nenhum gasto fixo cadastrado.</p>
        </div>
      ) : (
        <>
          {activeList.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100 mb-4">
              <div className="px-4 py-2 bg-gray-50 rounded-t-lg">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ativos</h2>
              </div>
              {activeList.map(renderItem)}
            </section>
          )}

          {inactiveList.length > 0 && (
            <section className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              <div className="px-4 py-2 bg-gray-50 rounded-t-lg">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inativos</h2>
              </div>
              {inactiveList.map(renderItem)}
            </section>
          )}
        </>
      )}

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700 transition-colors z-10"
        aria-label="Adicionar gasto fixo"
      >
        +
      </button>

      {showForm && <FixedExpenseForm editing={editing} onClose={handleClose} />}
    </div>
  )
}
