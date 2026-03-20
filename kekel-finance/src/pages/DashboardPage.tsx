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
