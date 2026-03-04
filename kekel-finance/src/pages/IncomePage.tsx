import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import IncomeForm from '@/components/income/IncomeForm'
import type { Income } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatMonthLabel(month: string) {
  const [year, m] = month.split('-')
  return `${MONTH_NAMES[Number(m) - 1]} ${year}`
}

export default function IncomePage() {
  const { incomes, deleteIncome } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Income | undefined>()
  const month = currentMonth()

  const monthIncomes = incomes.filter((inc) => inc.month === month)
  const fixedTotal = monthIncomes.filter((inc) => inc.type === 'fixed').reduce((sum, inc) => sum + inc.amount, 0)
  const variableTotal = monthIncomes.filter((inc) => inc.type === 'variable').reduce((sum, inc) => sum + inc.amount, 0)
  const total = fixedTotal + variableTotal

  function handleEdit(income: Income) {
    setEditing(income)
    setShowForm(true)
  }

  function handleClose() {
    setShowForm(false)
    setEditing(undefined)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-1">💰 Renda</h1>
      <p className="text-sm text-gray-500 mb-4">{formatMonthLabel(month)}</p>

      {/* Summary */}
      <section className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Renda fixa</span>
          <span className="font-medium text-gray-800">{formatBRL(fixedTotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Renda variável</span>
          <span className="font-medium text-gray-800">{formatBRL(variableTotal)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-green-700 border-t border-green-200 pt-2">
          <span>Total</span>
          <span>{formatBRL(total)}</span>
        </div>
      </section>

      {/* List */}
      <section className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
        {monthIncomes.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            Nenhuma renda registrada este mês.
          </p>
        ) : (
          monthIncomes.map((inc) => (
            <div key={inc.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium text-gray-800 text-sm">{inc.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  inc.type === 'fixed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {inc.type === 'fixed' ? 'Fixa' : 'Variável'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-green-700">{formatBRL(inc.amount)}</span>
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
          ))
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => setShowForm(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-green-700 transition-colors z-10"
        aria-label="Adicionar renda"
      >
        +
      </button>

      {showForm && <IncomeForm editing={editing} onClose={handleClose} />}
    </div>
  )
}
