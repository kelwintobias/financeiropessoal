import { useState, useEffect, useMemo } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { FixedExpense } from '@/types'
import { getCurrentBillingCycle, calcRecurringFixedTotal, formatBRL } from '@/utils/forecastUtils'

interface FixedExpenseFormProps {
  editing?: FixedExpense
  onClose: () => void
}

export default function FixedExpenseForm({ editing, onClose }: FixedExpenseFormProps) {
  const { categories, addFixedExpense, updateFixedExpense, creditCard } = useFinanceStore()

  const [description, setDescription] = useState(editing?.description ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [billingDay, setBillingDay] = useState(editing?.billingDay ? String(editing.billingDay) : '')
  const [paymentMethod, setPaymentMethod] = useState<FixedExpense['paymentMethod']>(editing?.paymentMethod ?? 'card')

  const [hasRecurrence, setHasRecurrence] = useState<boolean>(!!editing?.recurrenceType)
  const [recurrenceType, setRecurrenceType] = useState<'weekdays' | 'specific' | null>(editing?.recurrenceType ?? null)
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>(editing?.recurrenceWeekdays ?? [])
  const [recurrenceDates, setRecurrenceDates] = useState<string[]>(editing?.recurrenceDates ?? [])
  const [showCalendar, setShowCalendar] = useState(false)

  // Sync form fields when switching to a different editing item
  const editingId = editing?.id
  useEffect(() => {
    if (editing) {
      setDescription(editing.description)
      setAmount(String(editing.amount))
      setCategoryId(editing.categoryId ?? '')
      setBillingDay(editing.billingDay ? String(editing.billingDay) : '')
      setPaymentMethod(editing.paymentMethod)
      setHasRecurrence(!!editing.recurrenceType)
      setRecurrenceType(editing.recurrenceType ?? null)
      setRecurrenceWeekdays(editing.recurrenceWeekdays ?? [])
      setRecurrenceDates(editing.recurrenceDates ?? [])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId])

  const today = useMemo(() => new Date(), [])
  const { cycleStartDate, cycleEndDate, cycleEnd } = useMemo(() => {
    const cycle = creditCard
      ? getCurrentBillingCycle(creditCard.closingDay, today)
      : { start: new Date(today.getFullYear(), today.getMonth(), 1), end: new Date(today.getFullYear(), today.getMonth() + 1, 0) }
    return { cycleStartDate: cycle.start, cycleEndDate: cycle.end, cycleEnd: cycle.end.toISOString().split('T')[0] }
  }, [creditCard, today])

  const previewExpense: FixedExpense = useMemo(() => ({
    id: '_preview',
    description: '',
    amount: parseFloat(amount) || 0,
    paymentMethod,
    isActive: true,
    createdAt: '',
    recurrenceType: recurrenceType ?? undefined,
    recurrenceWeekdays: recurrenceType === 'weekdays' ? recurrenceWeekdays : undefined,
    recurrenceDates: recurrenceType === 'specific' ? recurrenceDates : undefined,
  }), [amount, recurrenceType, recurrenceWeekdays, recurrenceDates, paymentMethod])

  const previewTotal = useMemo(() =>
    hasRecurrence && recurrenceType ? calcRecurringFixedTotal([previewExpense], cycleEnd, today) : 0,
    [previewExpense, hasRecurrence, recurrenceType, cycleEnd, today]
  )

  const previewCount = useMemo(() => {
    if (!hasRecurrence || !recurrenceType) return 0
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return 0
    return Math.round(previewTotal / amt)
  }, [previewTotal, amount, hasRecurrence, recurrenceType])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return

    const parsedDay = parseInt(billingDay)
    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      categoryId: categoryId || undefined,
      billingDay: hasRecurrence ? undefined : (parsedDay >= 1 && parsedDay <= 31 ? parsedDay : undefined),
      paymentMethod,
      isActive: editing?.isActive ?? true,
      recurrenceType: hasRecurrence && recurrenceType ? recurrenceType : undefined,
      recurrenceWeekdays: hasRecurrence && recurrenceType === 'weekdays' ? recurrenceWeekdays : undefined,
      recurrenceDates: hasRecurrence && recurrenceType === 'specific' ? recurrenceDates : undefined,
    }

    if (editing) {
      updateFixedExpense(editing.id, payload)
    } else {
      addFixedExpense(payload)
    }
    onClose()
  }

  const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  function toggleWeekday(day: number) {
    setRecurrenceType('weekdays')
    setRecurrenceDates([])
    setRecurrenceWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  function applyWeekdayShortcut(days: number[]) {
    setRecurrenceType('weekdays')
    setRecurrenceDates([])
    setRecurrenceWeekdays((prev) => {
      const allSelected = days.every((d) => prev.includes(d))
      return allSelected ? prev.filter((d) => !days.includes(d)) : [...new Set([...prev, ...days])]
    })
  }

  function getCycleDates(): string[] {
    const dates: string[] = []
    const cursor = new Date(cycleStartDate)
    while (cursor <= cycleEndDate) {
      dates.push(cursor.toISOString().split('T')[0])
      cursor.setDate(cursor.getDate() + 1)
    }
    return dates
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar gasto fixo' : 'Novo gasto fixo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Aluguel, Internet, Netflix"
              required
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor mensal <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de pagamento <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 px-3 cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="sr-only"
                />
                <span>Cartão</span>
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 border rounded-lg py-2 px-3 cursor-pointer transition-colors ${paymentMethod === 'cash' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-300 text-gray-600'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                  className="sr-only"
                />
                <span>Dinheiro/PIX</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria (opcional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Sem categoria</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {!hasRecurrence && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dia de cobrança (opcional)
              </label>
              <select
                value={billingDay}
                onChange={(e) => setBillingDay(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Não informado</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">Data em que o valor é debitado/cobrado</p>
            </div>
          )}

          {/* Recurrence toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Esse valor se repete em outros dias?
            </label>
            <div className="flex gap-3">
              {(['Não', 'Sim'] as const).map((opt) => {
                const active = opt === 'Sim' ? hasRecurrence : !hasRecurrence
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = opt === 'Sim'
                      setHasRecurrence(next)
                      if (!next) {
                        setRecurrenceType(null)
                        setRecurrenceWeekdays([])
                        setRecurrenceDates([])
                      }
                    }}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      active ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-300 text-gray-600'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>

          {hasRecurrence && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-2">Dias da semana</p>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className={`px-3 py-1 rounded-full border text-sm transition-colors ${
                        recurrenceType === 'weekdays' && recurrenceWeekdays.includes(day)
                          ? 'border-blue-500 bg-blue-100 text-blue-700'
                          : 'border-gray-300 text-gray-600'
                      }`}
                    >
                      {WEEKDAY_LABELS[day]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => applyWeekdayShortcut([6, 0])}
                  className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Fins de semana
                </button>
                <button
                  type="button"
                  onClick={() => applyWeekdayShortcut([1, 2, 3, 4, 5])}
                  className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50"
                >
                  Dias úteis
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecurrenceType('specific')
                    setRecurrenceWeekdays([])
                    setShowCalendar(true)
                  }}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    recurrenceType === 'specific'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Personalizado {recurrenceType === 'specific' && recurrenceDates.length > 0 ? `(${recurrenceDates.length})` : ''}
                </button>
              </div>

              {recurrenceType && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-800">
                  {previewCount} ocorrência{previewCount !== 1 ? 's' : ''} até o fechamento
                  {' → '}
                  <strong>Total previsto: {formatBRL(previewTotal)}</strong>
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            {editing ? 'Salvar alterações' : 'Adicionar gasto fixo'}
          </button>
        </form>

        {showCalendar && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-30">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4">
              <h3 className="text-base font-semibold mb-4">Selecionar datas do ciclo</h3>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
                  <div key={i} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
                ))}
                {Array.from({ length: new Date(cycleStartDate).getDay() }, (_, i) => (
                  <div key={`offset-${i}`} />
                ))}
                {getCycleDates().map((dateStr) => {
                  const d = new Date(dateStr + 'T12:00:00')
                  const selected = recurrenceDates.includes(dateStr)
                  const isPast = dateStr <= new Date().toISOString().split('T')[0]
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={isPast}
                      onClick={() => setRecurrenceDates((prev) =>
                        prev.includes(dateStr) ? prev.filter((x) => x !== dateStr) : [...prev, dateStr]
                      )}
                      className={`aspect-square rounded-full text-xs font-medium transition-colors ${
                        isPast
                          ? 'text-gray-300 cursor-not-allowed'
                          : selected
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-700 hover:bg-purple-50'
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>
              <button
                type="button"
                onClick={() => setShowCalendar(false)}
                className="w-full bg-purple-600 text-white rounded-lg py-2 font-medium hover:bg-purple-700 transition-colors"
              >
                Confirmar ({recurrenceDates.length} data{recurrenceDates.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
