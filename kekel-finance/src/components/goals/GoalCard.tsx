import { useState } from 'react'
import type { Goal } from '@/types'
import { useFinanceStore } from '@/store/useFinanceStore'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const goalPercent = (g: Goal) =>
  g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0

const goalRemaining = (g: Goal) =>
  Math.max(g.targetAmount - g.currentAmount, 0)

interface GoalCardProps {
  goal: Goal
  compact?: boolean
}

export default function GoalCard({ goal, compact = false }: GoalCardProps) {
  const { updateGoal, addContribution } = useFinanceStore()
  const [showContrib, setShowContrib] = useState(false)
  const [contribValue, setContribValue] = useState('')

  const percent = goalPercent(goal)
  const remaining = goalRemaining(goal)

  const handleContribution = () => {
    const amount = parseFloat(contribValue.replace(',', '.'))
    if (isNaN(amount) || amount <= 0) return
    addContribution(goal.id, amount)
    setContribValue('')
    setShowContrib(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-semibold text-gray-800">{goal.name}</h3>
          {goal.deadline && !compact && (
            <p className="text-xs text-gray-400 mt-0.5">
              Prazo: {new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
        {!compact && goal.status === 'active' && (
          <div className="flex gap-1">
            {goal.currentAmount >= goal.targetAmount && (
              <button
                aria-label={`Concluir meta ${goal.name}`}
                onClick={() => updateGoal(goal.id, { status: 'completed' })}
                className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
              >
                ✅ Concluir
              </button>
            )}
            <button
              aria-label={`Arquivar meta ${goal.name}`}
              onClick={() => updateGoal(goal.id, { status: 'archived' })}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200"
            >
              📦 Arquivar
            </button>
          </div>
        )}
      </div>

      {/* Progress info */}
      <p className="text-sm text-gray-600 mb-1">
        {formatBRL(goal.currentAmount)} de {formatBRL(goal.targetAmount)} ({percent}%) — Faltam {formatBRL(remaining)}
      </p>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso da meta ${goal.name}`}>
        <div
          className={`h-2 rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-blue-400'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Contribution */}
      {!compact && goal.status === 'active' && (
        <>
          {showContrib ? (
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Valor do aporte"
                value={contribValue}
                onChange={(e) => setContribValue(e.target.value)}
                className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                aria-label="Valor do aporte"
              />
              <button
                onClick={handleContribution}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                aria-label={`Confirmar aporte na meta ${goal.name}`}
              >
                OK
              </button>
              <button
                onClick={() => setShowContrib(false)}
                className="text-gray-500 px-2 py-1 text-sm"
                aria-label="Cancelar aporte"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowContrib(true)}
              className="text-sm text-blue-600 hover:underline"
              aria-label={`Registrar aporte na meta ${goal.name}`}
            >
              + Registrar aporte
            </button>
          )}
        </>
      )}
    </div>
  )
}
