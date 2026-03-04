import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { FixedExpense } from '@/types'

interface FixedExpenseFormProps {
  editing?: FixedExpense
  onClose: () => void
}

export default function FixedExpenseForm({ editing, onClose }: FixedExpenseFormProps) {
  const { categories, addFixedExpense, updateFixedExpense } = useFinanceStore()

  const [description, setDescription] = useState(editing?.description ?? '')
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? '')
  const [billingDay, setBillingDay] = useState(editing?.billingDay ? String(editing.billingDay) : '')
  const [paymentMethod, setPaymentMethod] = useState<FixedExpense['paymentMethod']>(editing?.paymentMethod ?? 'card')

  useEffect(() => {
    if (editing) {
      setDescription(editing.description)
      setAmount(String(editing.amount))
      setCategoryId(editing.categoryId ?? '')
      setBillingDay(editing.billingDay ? String(editing.billingDay) : '')
      setPaymentMethod(editing.paymentMethod)
    }
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !description.trim()) return

    const parsedDay = parseInt(billingDay)
    const payload = {
      description: description.trim(),
      amount: parsedAmount,
      categoryId: categoryId || undefined,
      billingDay: parsedDay >= 1 && parsedDay <= 31 ? parsedDay : undefined,
      paymentMethod,
      isActive: editing?.isActive ?? true,
    }

    if (editing) {
      updateFixedExpense(editing.id, payload)
    } else {
      addFixedExpense(payload)
    }
    onClose()
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

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            {editing ? 'Salvar alterações' : 'Adicionar gasto fixo'}
          </button>
        </form>
      </div>
    </div>
  )
}
