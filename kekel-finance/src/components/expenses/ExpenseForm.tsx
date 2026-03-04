import { useState, useEffect } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import type { Expense } from '@/types'

interface ExpenseFormProps {
  editing?: Expense
  onClose: () => void
  onAfterSave?: (data: { categoryId: string; date: string }) => void
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ExpenseForm({ editing, onClose, onAfterSave }: ExpenseFormProps) {
  const { categories, addExpense, updateExpense } = useFinanceStore()

  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [categoryId, setCategoryId] = useState(editing?.categoryId ?? categories[0]?.id ?? '')
  const [description, setDescription] = useState(editing?.description ?? '')
  const [date, setDate] = useState(editing?.date ?? today())
  const [paymentMethod, setPaymentMethod] = useState<Expense['paymentMethod']>(editing?.paymentMethod ?? 'card')

  useEffect(() => {
    if (editing) {
      setAmount(String(editing.amount))
      setCategoryId(editing.categoryId)
      setDescription(editing.description ?? '')
      setDate(editing.date)
      setPaymentMethod(editing.paymentMethod)
    }
  }, [editing])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0 || !categoryId) return

    const payload = {
      amount: parsedAmount,
      categoryId,
      description: description.trim() || undefined,
      date,
      paymentMethod,
    }

    if (editing) {
      updateExpense(editing.id, payload)
    } else {
      addExpense(payload)
      onAfterSave?.({ categoryId, date })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-20">
      <div className="bg-white w-full max-w-lg rounded-t-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {editing ? 'Editar gasto' : 'Novo gasto'}
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
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
              placeholder="Opcional"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition-colors"
          >
            {editing ? 'Salvar alterações' : 'Adicionar gasto'}
          </button>
        </form>
      </div>
    </div>
  )
}
