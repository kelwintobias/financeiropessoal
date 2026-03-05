import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import { calculateForecast, formatBRL } from '@/utils/forecastUtils'

function EditableAmount({
  value,
  onSave,
  label,
}: {
  value: number
  onSave: (v: number) => Promise<void>
  label: string
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setInputVal(value.toFixed(2).replace('.', ','))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = async () => {
    const parsed = parseFloat(inputVal.replace(',', '.'))
    if (!isNaN(parsed)) {
      setSaving(true)
      await onSave(parsed)
      setSaving(false)
    }
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">{label}</span>
        <input
          ref={inputRef}
          className="border border-blue-400 rounded px-2 py-0.5 text-sm w-32 text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          disabled={saving}
          inputMode="decimal"
        />
        {saving && <span className="text-xs text-gray-400">...</span>}
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="flex items-center gap-1 group text-left"
      title="Clique para editar"
    >
      <span className="text-sm text-gray-500">{label}</span>
      <span className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors">
        {formatBRL(value)}
      </span>
      <span className="text-gray-300 group-hover:text-blue-400 text-xs">✏</span>
    </button>
  )
}

export default function DashboardPage() {
  const { incomes, fixedExpenses, creditCard, userSettings, updateAccountBalance, updateCurrentBill } = useFinanceStore()
  const month = currentMonth()
  const today = new Date()

  const manualBalance = userSettings?.accountBalance ?? 0

  const forecast = calculateForecast({
    today,
    incomes,
    fixedExpenses,
    creditCard,
    manualBalance,
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
              <div className="flex justify-between text-sm text-gray-600 items-center">
                <EditableAmount
                  value={cardBillAccumulated}
                  onSave={updateCurrentBill}
                  label="Fatura atual"
                />
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
          <EditableAmount
            value={accountBalance}
            onSave={updateAccountBalance}
            label="Saldo atual"
          />
        </div>
      </section>
    </div>
  )
}
