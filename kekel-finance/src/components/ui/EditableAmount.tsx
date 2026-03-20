import { useState, useRef } from 'react'

interface EditableAmountProps {
  value: number
  onSave: (v: number) => Promise<void>
  label: string
}

export default function EditableAmount({ value, onSave, label }: EditableAmountProps) {
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
        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
      </span>
      <span className="text-gray-300 group-hover:text-blue-400 text-xs">✏</span>
    </button>
  )
}
