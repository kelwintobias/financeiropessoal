import { getBudgetUsagePercent, getBudgetStatus } from '@/utils/budgetUtils'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface BudgetBarProps {
  categoryName: string
  spent: number
  limit: number
  month: string
}

export default function BudgetBar({ categoryName, spent, limit }: BudgetBarProps) {
  if (!limit) return null

  const percent = getBudgetUsagePercent(spent, limit)
  const status = getBudgetStatus(percent)

  const barColor =
    status === 'exceeded' ? 'bg-red-500' :
    status === 'warning'  ? 'bg-yellow-400' :
    'bg-green-500'

  const displayWidth = Math.min(percent, 100)

  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>
          {categoryName}: {formatBRL(spent)} / {formatBRL(limit)}
        </span>
        <span className={
          status === 'exceeded' ? 'text-red-600 font-semibold' :
          status === 'warning'  ? 'text-yellow-600 font-semibold' :
          'text-gray-400'
        }>
          {Math.round(percent)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${displayWidth}%` }}
        />
      </div>
    </div>
  )
}
