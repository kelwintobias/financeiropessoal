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
