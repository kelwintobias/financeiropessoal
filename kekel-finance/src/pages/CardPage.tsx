import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'

export default function CardPage() {
  const { creditCard, saveCreditCard } = useFinanceStore()

  const [name, setName] = useState(creditCard?.name ?? 'Meu Cartão')
  const [closingDay, setClosingDay] = useState(creditCard?.closingDay ? String(creditCard.closingDay) : '')
  const [paymentDay, setPaymentDay] = useState(creditCard?.paymentDay ? String(creditCard.paymentDay) : '')
  const [creditLimit, setCreditLimit] = useState(creditCard?.creditLimit ? String(creditCard.creditLimit) : '')
  const [saved, setSaved] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cd = parseInt(closingDay)
    const pd = parseInt(paymentDay)
    if (!cd || cd < 1 || cd > 28 || !pd || pd < 1 || pd > 28 || !name.trim()) return

    const limit = parseFloat(creditLimit)
    saveCreditCard({
      name: name.trim(),
      closingDay: cd,
      paymentDay: pd,
      creditLimit: !isNaN(limit) && limit > 0 ? limit : undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const days = Array.from({ length: 28 }, (_, i) => i + 1)

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-800 mb-2">Cartão de Crédito</h1>
      <p className="text-sm text-gray-500 mb-6">
        Configure seu cartão para visualizar previsões de fatura no Dashboard.
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nome do cartão <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Nubank, Inter, Itaú"
            required
            maxLength={50}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia de fechamento <span className="text-red-500">*</span>
            </label>
            <select
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {days.map((d) => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Quando a fatura fecha</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dia de pagamento <span className="text-red-500">*</span>
            </label>
            <select
              value={paymentDay}
              onChange={(e) => setPaymentDay(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Selecione</option>
              {days.map((d) => (
                <option key={d} value={d}>Dia {d}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">Quando você paga</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Limite do cartão (opcional)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="0,00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">Usado para mostrar barra de progresso da fatura</p>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 transition-colors"
        >
          {saved ? 'Salvo!' : creditCard ? 'Salvar alterações' : 'Configurar cartão'}
        </button>
      </form>

      {creditCard && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-800 mb-1">{creditCard.name}</p>
          <p className="text-xs text-blue-600">
            Fechamento: dia {creditCard.closingDay} &nbsp;|&nbsp; Pagamento: dia {creditCard.paymentDay}
            {creditCard.creditLimit && (
              <> &nbsp;|&nbsp; Limite: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(creditCard.creditLimit)}</>
            )}
          </p>
        </div>
      )}
    </div>
  )
}
