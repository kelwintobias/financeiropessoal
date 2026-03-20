import { Link } from 'react-router-dom'
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
    incomeReceived,
    incomePending,
    incomeList,
    accountBalance,
    realAccountBalance,
    fixedAlreadyBilled,
    fixedPending,
    cycleExpensesCard,
    cycleExpensesCash,
    cycleStart,
    cycleEnd,
    incomeBeforePayment,
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

  // Formata o ciclo para exibição: "DD/MM – DD/MM"
  const formatCycleRange = () => {
    const fmt = (d: string) => {
      const [, m, day] = d.split('-')
      return `${day}/${m}`
    }
    return `${fmt(cycleStart)} – ${fmt(cycleEnd)}`
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Dashboard</h1>

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

        {/* Referência rápida: saldo - fatura */}
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
              {incomeList.map(({ income, received, isProjected }, idx) => {
                const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
                const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                const projLabel = isProjected && income.paymentDay
                  ? `dia ${income.paymentDay}/${monthNames[nextMonth.getMonth()]}`
                  : income.paymentDay ? `dia ${income.paymentDay}` : null

                return (
                  <div key={`${income.id}-${idx}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={received ? 'text-green-500' : isProjected ? 'text-blue-400' : 'text-gray-300'}>
                        {received ? '✓' : isProjected ? '→' : '○'}
                      </span>
                      <span className={received ? 'text-gray-700' : isProjected ? 'text-blue-600' : 'text-gray-500'}>
                        {income.description}
                        {isProjected && <span className="text-xs text-blue-400 ml-1">(próximo ciclo)</span>}
                      </span>
                      {projLabel && (
                        <span className="text-xs text-gray-400">({projLabel})</span>
                      )}
                    </div>
                    <span className={`font-medium ${received ? 'text-green-700' : isProjected ? 'text-blue-600' : 'text-gray-500'}`}>
                      {formatBRL(income.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Recebido</span>
                <span className="font-medium text-green-700">{formatBRL(incomeReceived)}</span>
              </div>
              {incomePending > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>A receber (este ciclo)</span>
                  <span className="font-medium text-blue-600">{formatBRL(incomePending)}</span>
                </div>
              )}
              {incomeBeforePayment > 0 && (
                <div className="flex justify-between text-sm text-gray-500 text-xs pt-1 border-t border-gray-100">
                  <span>Conta no disponível (antes do pagamento)</span>
                  <span className="text-green-600">+ {formatBRL(incomeBeforePayment)}</span>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Section 4 — Saldo em Conta */}
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
