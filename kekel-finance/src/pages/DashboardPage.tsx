import { Link } from 'react-router-dom'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import ExpensesPieChart from '@/components/charts/ExpensesPieChart'
import GoalCard from '@/components/goals/GoalCard'

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

export default function DashboardPage() {
  const { expenses, categories, goals, incomes, fixedExpenses } = useFinanceStore()
  const month = currentMonth()

  // Income totals for current month
  const monthIncomes = incomes.filter((inc) => inc.month === month)
  const fixedIncome = monthIncomes.filter((inc) => inc.type === 'fixed').reduce((sum, inc) => sum + inc.amount, 0)
  const variableIncome = monthIncomes.filter((inc) => inc.type === 'variable').reduce((sum, inc) => sum + inc.amount, 0)
  const totalIncome = fixedIncome + variableIncome

  // Fixed expenses total (active templates)
  const totalFixed = fixedExpenses.filter((fe) => fe.isActive).reduce((sum, fe) => sum + fe.amount, 0)

  // Variable expenses for current month
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))
  const totalVariable = monthExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Totals
  const totalExpenses = totalFixed + totalVariable
  const balance = totalIncome - totalExpenses
  const margin = Math.max(0, balance)

  // Active goals (max 3)
  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏠 Dashboard</h1>

      {/* Section 1 — Resumo Financeiro */}
      <section role="region" aria-labelledby="finance-summary-heading" className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 id="finance-summary-heading" className="font-semibold text-gray-700 mb-3">
          Resumo Financeiro — {formatMonthLabel(month)}
        </h2>

        {/* Receita */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Receita</p>
          <div className="flex justify-between text-sm text-gray-600 mb-0.5">
            <span>Renda fixa</span>
            <span>{formatBRL(fixedIncome)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Renda variável</span>
            <span>{formatBRL(variableIncome)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-green-700 border-t border-gray-100 pt-1">
            <span>Total</span>
            <span>{formatBRL(totalIncome)}</span>
          </div>
        </div>

        {/* Despesas */}
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Despesas</p>
          <div className="flex justify-between text-sm text-gray-600 mb-0.5">
            <span>Gastos fixos</span>
            <span>{formatBRL(totalFixed)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Gastos variáveis</span>
            <span>{formatBRL(totalVariable)}</span>
          </div>
          <div className="flex justify-between text-sm font-semibold text-red-600 border-t border-gray-100 pt-1">
            <span>Total</span>
            <span>{formatBRL(totalExpenses)}</span>
          </div>
        </div>

        {/* Saldo */}
        <div className={`rounded-lg p-3 ${balance >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className={`flex justify-between text-base font-bold ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            <span>Saldo disponível</span>
            <span>{formatBRL(balance)}</span>
          </div>
          {balance >= 0 && (
            <div className="flex justify-between text-sm text-green-600 mt-1">
              <span>Margem p/ gastar</span>
              <span>{formatBRL(margin)}</span>
            </div>
          )}
        </div>
      </section>

      {/* Section 2 — Gastos por categoria */}
      <section role="region" aria-labelledby="chart-heading" className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 id="chart-heading" className="font-semibold text-gray-700 mb-3">Gastos por categoria</h2>
        <ExpensesPieChart expenses={expenses} categories={categories} month={month} />
      </section>

      {/* Section 3 — Metas ativas */}
      <section role="region" aria-labelledby="active-goals-heading" className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 id="active-goals-heading" className="font-semibold text-gray-700">Metas ativas</h2>
          <Link to="/goals" className="text-sm text-blue-600 hover:underline">Ver todas</Link>
        </div>
        {activeGoals.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-2">
            Nenhuma meta ativa.{' '}
            <Link to="/goals" className="text-blue-600 hover:underline">Criar meta</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeGoals.map((g) => <GoalCard key={g.id} goal={g} compact />)}
          </div>
        )}
      </section>
    </div>
  )
}
