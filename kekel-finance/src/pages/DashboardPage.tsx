import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import { calculateForecast, formatBRL } from '@/utils/forecastUtils'
import type { PlannedExpense } from '@/types'

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

// Group planned expenses by month label (e.g. "Março 2026")
function groupByMonth(expenses: PlannedExpense[]): { label: string; items: PlannedExpense[] }[] {
  const map = new Map<string, PlannedExpense[]>()
  for (const pe of expenses) {
    const [year, month] = pe.date.split('-').map(Number)
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(pe)
  }
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ]
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => {
      const [y, m] = key.split('-').map(Number)
      return { label: `${months[m - 1]} ${y}`, items }
    })
}

export default function DashboardPage() {
  const {
    incomes,
    expenses,
    fixedExpenses,
    plannedExpenses,
    creditCard,
    userSettings,
    updateAccountBalance,
    updateCurrentBill,
    updateMonthlyGoal,
    addPlannedExpense,
    deletePlannedExpense,
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
    plannedExpenses,
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
    totalFixedActive,
    plannedCard,
    plannedCash,
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

  // Planned expense form state
  const [peDesc, setPeDesc] = useState('')
  const [peAmount, setPeAmount] = useState('')
  const [peDate, setPeDate] = useState('')
  const [peMethod, setPeMethod] = useState<'card' | 'cash'>('card')
  const [peAdding, setPeAdding] = useState(false)

  const handleAddPlannedExpense = async () => {
    const amount = parseFloat(peAmount.replace(',', '.'))
    if (!peDesc.trim() || isNaN(amount) || amount <= 0 || !peDate) return
    setPeAdding(true)
    await addPlannedExpense({ description: peDesc.trim(), amount, date: peDate, paymentMethod: peMethod })
    setPeAdding(false)
    setPeDesc('')
    setPeAmount('')
    setPeDate('')
    setPeMethod('card')
  }

  const grouped = groupByMonth(plannedExpenses)

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
            <span>- Fatura total (cartão + fixos + previstos)</span>
            <span className="text-red-500">- {formatBRL(cardBillForecast)}</span>
          </div>
          {plannedCash > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>- Gastos previstos (Pix/Dinheiro)</span>
              <span className="text-orange-500">- {formatBRL(plannedCash)}</span>
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
                  onSave={updateCurrentBill}
                  label="Fatura atual"
                />
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>+ Custos fixos ativos</span>
                <span>{formatBRL(totalFixedActive)}</span>
              </div>
              {plannedCard > 0 && (
                <div className="flex justify-between text-sm text-gray-500">
                  <span>+ Gastos previstos (cartão)</span>
                  <span>{formatBRL(plannedCard)}</span>
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
          {plannedCash > 0 && (
            <>
              <div className="flex justify-between text-sm text-gray-500">
                <span>- Gastos previstos (Pix/Dinheiro)</span>
                <span className="text-orange-500">- {formatBRL(plannedCash)}</span>
              </div>
              <div className={`flex justify-between text-sm font-semibold border-t border-gray-100 pt-1.5 ${realAccountBalance >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                <span>= Saldo real em conta</span>
                <span>{formatBRL(realAccountBalance)}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Section 5 — Gastos Previstos */}
      <section className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-700 mb-3">Gastos Previstos</h2>

        {/* Inline form */}
        <div className="space-y-2 mb-4">
          <input
            type="text"
            placeholder="Descrição"
            value={peDesc}
            onChange={(e) => setPeDesc(e.target.value)}
            className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Valor"
              value={peAmount}
              onChange={(e) => setPeAmount(e.target.value)}
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
              min="0"
              step="0.01"
            />
            <input
              type="date"
              value={peDate}
              onChange={(e) => setPeDate(e.target.value)}
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={peMethod}
              onChange={(e) => setPeMethod(e.target.value as 'card' | 'cash')}
              className="flex-1 border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="card">Cartão</option>
              <option value="cash">Dinheiro/PIX</option>
            </select>
            <button
              onClick={handleAddPlannedExpense}
              disabled={peAdding}
              className="px-4 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {peAdding ? '...' : 'Adicionar'}
            </button>
          </div>
        </div>

        {/* Grouped list */}
        {grouped.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Nenhum gasto previsto.</p>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ label, items }) => (
              <div key={label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">{label}</p>
                <div className="space-y-2">
                  {items.map((pe) => {
                    const [, , day] = pe.date.split('-')
                    return (
                      <div key={pe.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-400 shrink-0">{day}/{pe.date.split('-')[1]}</span>
                          <span className="text-gray-700 truncate">{pe.description}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${pe.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {pe.paymentMethod === 'card' ? 'Cartão' : 'Dinheiro'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="font-medium text-gray-800">{formatBRL(pe.amount)}</span>
                          <button
                            onClick={() => deletePlannedExpense(pe.id)}
                            className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                            title="Remover"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2 pt-1 border-t border-gray-100">
                  <span>Total {label}</span>
                  <span>{formatBRL(items.reduce((s, pe) => s + pe.amount, 0))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
