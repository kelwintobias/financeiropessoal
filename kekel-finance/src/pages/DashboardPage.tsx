import { Link } from 'react-router-dom'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import { calculateForecast, formatBRL } from '@/utils/forecastUtils'

export default function DashboardPage() {
  const { expenses, incomes, fixedExpenses, creditCard } = useFinanceStore()
  const month = currentMonth()
  const today = new Date()

  const forecast = calculateForecast({
    today,
    incomes,
    expenses,
    fixedExpenses,
    creditCard,
    currentMonth: month,
  })

  const {
    spendingPower,
    cardBillAccumulated,
    cardBillForecast,
    daysUntilClosing,
    daysUntilPayment,
    incomeReceived,
    incomePending,
    incomeList,
    cashExpensesDone,
    cashFixedRemaining,
    accountBalance,
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

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

      {/* Section 1 — Poder de Gasto */}
      <section className={`rounded-xl p-5 mb-4 text-center ${spendingPower >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className="text-xs font-semibold uppercase tracking-wide mb-1 text-gray-500">Quanto você ainda pode gastar</p>
        <p className={`text-4xl font-bold ${spendingPower >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {formatBRL(spendingPower)}
        </p>
        <p className="text-xs text-gray-400 mt-1">este mês</p>
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
              <div className="flex justify-between text-sm text-gray-600">
                <span>Acumulado hoje</span>
                <span className="font-medium">{formatBRL(cardBillAccumulated)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Previsão no fechamento {closingDate ? `(dia ${formatDay(closingDate)})` : ''}</span>
                <span className="font-medium text-orange-600">{formatBRL(cardBillForecast)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Pagamento em {daysUntilPayment} dias {paymentDate ? `(dia ${formatDay(paymentDate)})` : ''}</span>
                <span className="font-medium text-gray-500">Fecha em {daysUntilClosing}d</span>
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

      {/* Section 3 — Previsão de Receitas */}
      <section className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-700">Previsão de Receitas</h2>
          <Link to="/income" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
        </div>

        {incomeList.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">
            Nenhuma renda cadastrada.{' '}
            <Link to="/income" className="text-blue-600 hover:underline">Adicionar</Link>
          </p>
        ) : (
          <>
            <div className="space-y-2 mb-3">
              {incomeList.map(({ income, received }) => (
                <div key={income.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className={received ? 'text-green-500' : 'text-gray-300'}>
                      {received ? '✓' : '○'}
                    </span>
                    <span className={received ? 'text-gray-700' : 'text-gray-500'}>
                      {income.description}
                    </span>
                    {income.paymentDay && (
                      <span className="text-xs text-gray-400">
                        (dia {income.paymentDay})
                      </span>
                    )}
                  </div>
                  <span className={`font-medium ${received ? 'text-green-700' : 'text-gray-500'}`}>
                    {formatBRL(income.amount)}
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Recebido</span>
                <span className="font-medium text-green-700">{formatBRL(incomeReceived)}</span>
              </div>
              {incomePending > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>A receber</span>
                  <span className="font-medium text-gray-500">{formatBRL(incomePending)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Section 4 — Saldo em Conta */}
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Saldo em Conta</h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Recebido este mês</span>
            <span className="font-medium text-green-700">{formatBRL(incomeReceived)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Despesas em dinheiro/PIX</span>
            <span className="font-medium text-red-600">- {formatBRL(cashExpensesDone)}</span>
          </div>
          {cashFixedRemaining > 0 && (
            <div className="flex justify-between text-sm text-gray-500">
              <span>Fixos em dinheiro restantes</span>
              <span className="font-medium">- {formatBRL(cashFixedRemaining)}</span>
            </div>
          )}
          <div className={`flex justify-between text-sm font-bold border-t border-gray-100 pt-2 ${accountBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            <span>Saldo atual</span>
            <span>{formatBRL(accountBalance)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
