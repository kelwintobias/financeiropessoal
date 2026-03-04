import { useState } from 'react'
import { useFinanceStore } from '@/store/useFinanceStore'
import GoalCard from '@/components/goals/GoalCard'

export default function GoalsPage() {
  const { goals, addGoal } = useFinanceStore()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [deadline, setDeadline] = useState('')
  const [error, setError] = useState('')

  const activeGoals = goals.filter((g) => g.status === 'active')
  const inactiveGoals = goals.filter((g) => g.status !== 'active')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(targetAmount.replace(',', '.'))
    if (!name.trim()) { setError('Nome é obrigatório'); return }
    if (isNaN(amount) || amount <= 0) { setError('Valor-alvo deve ser maior que zero'); return }
    addGoal({ name: name.trim(), targetAmount: amount, deadline: deadline || undefined })
    setName(''); setTargetAmount(''); setDeadline(''); setError(''); setShowForm(false)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">🎯 Metas</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
          aria-label="Nova meta"
        >
          + Nova meta
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-gray-700 mb-3">Nova meta</h2>
          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
          <div className="flex flex-col gap-3">
            <input
              type="text"
              placeholder="Nome da meta *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              aria-label="Nome da meta"
              required
            />
            <input
              type="number"
              placeholder="Valor-alvo (R$) *"
              min="0.01"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
              aria-label="Valor-alvo da meta"
              required
            />
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-600"
              aria-label="Prazo da meta (opcional)"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError('') }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Active goals */}
      <section role="region" aria-labelledby="active-goals-heading">
        <h2 id="active-goals-heading" className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Metas Ativas ({activeGoals.length})
        </h2>
        {activeGoals.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">
            Nenhuma meta ativa.{' '}
            <button onClick={() => setShowForm(true)} className="text-blue-600 hover:underline">
              Criar meta
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {activeGoals.map((g) => <GoalCard key={g.id} goal={g} />)}
          </div>
        )}
      </section>

      {/* Completed / Archived */}
      {inactiveGoals.length > 0 && (
        <section role="region" aria-labelledby="inactive-goals-heading" className="mt-6">
          <h2 id="inactive-goals-heading" className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Concluídas / Arquivadas ({inactiveGoals.length})
          </h2>
          <div className="flex flex-col gap-3">
            {inactiveGoals.map((g) => (
              <div key={g.id} className="bg-gray-50 rounded-lg border border-gray-100 p-4 opacity-70">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-600">{g.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${g.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {g.status === 'completed' ? '✅ Concluída' : '📦 Arquivada'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
