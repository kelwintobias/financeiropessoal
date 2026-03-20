import { useState } from 'react'
import type { Goal } from '@/types'
import { useFinanceStore } from '@/store/useFinanceStore'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

const goalPercent = (g: Goal) =>
  g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0

const goalRemaining = (g: Goal) =>
  Math.max(g.targetAmount - g.currentAmount, 0)

type EditingField = 'targetAmount' | 'currentAmount' | 'deadline' | null

interface EditableNumberProps {
  field: 'targetAmount' | 'currentAmount'
  displayValue: string
  initialValue: string
  editingField: EditingField
  editValue: string
  editError: boolean
  onStartEdit: (field: EditingField, initialValue: string) => void
  onConfirm: () => void
  onCancel: () => void
  onChangeValue: (value: string) => void
}

function EditableNumber({
  field,
  displayValue,
  initialValue,
  editingField,
  editValue,
  editError,
  onStartEdit,
  onConfirm,
  onCancel,
  onChangeValue,
}: EditableNumberProps) {
  if (editingField === field) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          type="number"
          min={field === 'targetAmount' ? '0.01' : '0'}
          step="0.01"
          value={editValue}
          onChange={(e) => onChangeValue(e.target.value)}
          className={`w-24 bg-gray-50 border rounded px-1 text-sm ${editError ? 'border-red-400' : 'border-blue-400'}`}
          aria-label={field === 'targetAmount' ? 'Editar valor total' : 'Editar valor atual'}
          autoFocus
        />
        <button onClick={onConfirm} className="text-green-600 text-sm font-bold" aria-label="Confirmar">✓</button>
        <button onClick={onCancel} className="text-gray-400 text-sm" aria-label="Cancelar">✕</button>
      </span>
    )
  }
  return (
    <span
      className="cursor-pointer underline decoration-dashed decoration-gray-400 hover:decoration-gray-600"
      onClick={() => onStartEdit(field, initialValue)}
      title="Clique para editar"
    >
      {displayValue}
    </span>
  )
}

interface GoalCardProps {
  goal: Goal
  compact?: boolean
}

export default function GoalCard({ goal, compact = false }: GoalCardProps) {
  const { updateGoal, deleteGoal } = useFinanceStore()
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [editingField, setEditingField] = useState<EditingField>(null)
  const [editValue, setEditValue] = useState('')
  const [editError, setEditError] = useState(false)

  const percent = goalPercent(goal)
  const remaining = goalRemaining(goal)

  const startEdit = (field: EditingField, initialValue: string) => {
    setEditingField(field)
    setEditValue(initialValue)
    setEditError(false)
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
    setEditError(false)
  }

  const confirmEdit = async () => {
    if (editingField === 'targetAmount') {
      const val = parseFloat(editValue.replace(',', '.'))
      if (isNaN(val) || val <= 0) { setEditError(true); return }
      await updateGoal(goal.id, { targetAmount: val })
    } else if (editingField === 'currentAmount') {
      const val = parseFloat(editValue.replace(',', '.'))
      if (isNaN(val) || val < 0) { setEditError(true); return }
      await updateGoal(goal.id, { currentAmount: val })
    } else if (editingField === 'deadline') {
      await updateGoal(goal.id, { deadline: editValue || undefined })
    }
    cancelEdit()
  }

  const handleComplete = () => {
    updateGoal(goal.id, { status: 'completed' })
  }

  const handleDelete = () => {
    deleteGoal(goal.id)
    setShowConfirmDelete(false)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header: name + deadline */}
      <div className="mb-2">
        <h3 className="font-semibold text-gray-800">{goal.name}</h3>
        {!compact && (
          <div className="text-xs text-gray-400 mt-0.5">
            {editingField === 'deadline' ? (
              <span className="inline-flex items-center gap-1">
                <input
                  type="date"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-gray-50 border border-blue-400 rounded px-1 text-xs"
                  aria-label="Editar prazo"
                  autoFocus
                />
                <button onClick={confirmEdit} className="text-green-600 text-xs font-bold" aria-label="Confirmar prazo">✓</button>
                <button onClick={cancelEdit} className="text-gray-400 text-xs" aria-label="Cancelar prazo">✕</button>
              </span>
            ) : (
              <span
                className="cursor-pointer underline decoration-dashed decoration-gray-400 hover:decoration-gray-600"
                onClick={() => startEdit('deadline', goal.deadline ?? '')}
                title="Clique para editar prazo"
              >
                {goal.deadline
                  ? `Prazo: ${new Date(goal.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}`
                  : 'Sem prazo'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Progress info */}
      <p className="text-sm text-gray-600 mb-1">
        {compact ? (
          <>{formatBRL(goal.currentAmount)} de {formatBRL(goal.targetAmount)} ({percent}%)</>
        ) : (
          <>
            <EditableNumber
              field="currentAmount"
              displayValue={formatBRL(goal.currentAmount)}
              initialValue={String(goal.currentAmount)}
              editingField={editingField}
              editValue={editValue}
              editError={editError}
              onStartEdit={startEdit}
              onConfirm={confirmEdit}
              onCancel={cancelEdit}
              onChangeValue={(v) => { setEditValue(v); setEditError(false) }}
            />
            {' de '}
            <EditableNumber
              field="targetAmount"
              displayValue={formatBRL(goal.targetAmount)}
              initialValue={String(goal.targetAmount)}
              editingField={editingField}
              editValue={editValue}
              editError={editError}
              onStartEdit={startEdit}
              onConfirm={confirmEdit}
              onCancel={cancelEdit}
              onChangeValue={(v) => { setEditValue(v); setEditError(false) }}
            />
            {` (${percent}%) — Faltam ${formatBRL(remaining)}`}
          </>
        )}
      </p>

      {/* Progress bar */}
      <div
        className="w-full bg-gray-200 rounded-full h-2 mb-3"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progresso da meta ${goal.name}`}
      >
        <div
          className={`h-2 rounded-full transition-all ${percent >= 100 ? 'bg-green-500' : percent >= 60 ? 'bg-blue-500' : 'bg-blue-400'}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>

      {/* Action buttons */}
      {!compact && goal.status === 'active' && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <button
              aria-label={`Concluir meta ${goal.name}`}
              onClick={handleComplete}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md text-sm"
            >
              🎉 Meta concluída!
            </button>
            <button
              aria-label={`Remover meta ${goal.name}`}
              onClick={() => setShowConfirmDelete(true)}
              className="text-xs text-gray-400 hover:text-red-400"
            >
              Remover
            </button>
          </div>

          {/* Inline delete confirmation */}
          {showConfirmDelete && (
            <div className="mt-2 text-sm text-gray-600 flex items-center gap-2">
              <span>Remover esta meta?</span>
              <button
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 font-medium"
              >
                Confirmar
              </button>
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
