import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import { currentMonth } from '@/utils/budgetUtils'
import type { Income } from '@/types'

interface IncomeFormProps {
  editing?: Income
  onClose: () => void
}

export default function IncomeForm({ editing, onClose }: IncomeFormProps) {
  const { addIncome, updateIncome } = useFinanceStore()

  const [description, setDescription] = useState(editing?.description ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [type, setType] = useState<Income['type']>(editing?.type ?? 'fixed')
  const [month, setMonth] = useState(editing?.month ?? currentMonth())
  const [paymentDay, setPaymentDay] = useState(editing?.paymentDay ? String(editing.paymentDay) : '')
  const [isRecurring, setIsRecurring] = useState(editing?.isRecurring ?? false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return

    const parsedDay = parseInt(paymentDay)
    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      type,
      month,
      paymentDay: parsedDay >= 1 && parsedDay <= 31 ? parsedDay : undefined,
      isRecurring,
    }

    if (editing) {
      updateIncome(editing.id, payload)
    } else {
      addIncome(payload)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar renda' : 'Nova renda'}
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
              placeholder="Ex: Salário, Freelance"
              required
              maxLength={100}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Valor <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Income['type'])}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="fixed">Renda fixa</option>
              <option value="variable">Renda variável</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mês
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia de recebimento (opcional)
            </label>
            <select
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Não informado</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Qual dia do mês esse valor cai na sua conta?</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-700">
              Esse valor se repete todo mês
            </label>
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white rounded-lg py-3 font-medium hover:bg-green-700 transition-colors"
          >
            {editing ? 'Salvar alterações' : 'Adicionar renda'}
          </button>
        </form>
      </div>
    </div>
  )
}
