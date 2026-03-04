import { Link } from 'react-router-dom'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import ExpensesPieChart from '@/components/charts/ExpensesPieChart'
import GoalCard from '@/components/goals/GoalCard'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export default function DashboardPage() {
  const { expenses, budgets, categories, goals } = useFinanceStore()
  const month = currentMonth()

  // Section 1 — Monthly summary
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))
  const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0)
  const monthBudgets = budgets.filter((b) => b.month === month)
  const totalBudget = monthBudgets.reduce((sum, b) => sum + b.limitAmount, 0)
  const budgetPercent = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0
  const budgetStatus =
    totalBudget > 0 && totalSpent > totalBudget ? 'exceeded' :
    totalBudget > 0 && (totalSpent / totalBudget) >= 0.8 ? 'warning' : 'safe'

  // Section 3 — Active goals (max 3)
  const activeGoals = goals.filter((g) => g.status === 'active').slice(0, 3)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">🏠 Dashboard</h1>

      {/* Section 1 — Resumo do mês */}
      <section role="region" aria-labelledby="month-summary-heading" className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <h2 id="month-summary-heading" className="font-semibold text-gray-700 mb-3">Resumo do mês</h2>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Total gasto: <strong>{formatBRL(totalSpent)}</strong></span>
          <span>{totalBudget > 0 ? `Orçamento: ${formatBRL(totalBudget)}` : 'Sem orçamento definido'}</span>
        </div>
        {totalBudget > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2" role="progressbar" aria-valuenow={Math.round(budgetPercent)} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do orçamento mensal">
            <div
              className={`h-2 rounded-full transition-all ${
                budgetStatus === 'exceeded' ? 'bg-red-500' :
                budgetStatus === 'warning' ? 'bg-yellow-400' : 'bg-green-500'
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
        )}
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
