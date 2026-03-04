import type { Expense } from '@/types'

export function getSpentByCategory(
  expenses: Expense[],
  categoryId: string,
  month: string
): number {
  return expenses
    .filter((e) => e.categoryId === categoryId && e.date.startsWith(month))
    .reduce((sum, e) => sum + e.amount, 0)
}

export function getBudgetUsagePercent(spent: number, limit: number): number {
  if (limit <= 0) return 0
  return (spent / limit) * 100
}

export function getBudgetStatus(percent: number): 'safe' | 'warning' | 'exceeded' {
  if (percent > 100) return 'exceeded'
  if (percent >= 80) return 'warning'
  return 'safe'
}

export const STATUS_COLORS = {
  safe: 'green',
  warning: 'yellow',
  exceeded: 'red',
} as const

export function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
