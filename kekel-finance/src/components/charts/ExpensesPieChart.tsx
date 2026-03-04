import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { Expense, Category } from '@/types'

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

interface ExpensesPieChartProps {
  expenses: Expense[]
  categories: Category[]
  month: string
}

export default function ExpensesPieChart({ expenses, categories, month }: ExpensesPieChartProps) {
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month))

  const chartData = categories
    .map((cat) => ({
      name: cat.name,
      value: monthExpenses
        .filter((e) => e.categoryId === cat.id)
        .reduce((sum, e) => sum + e.amount, 0),
      color: cat.color,
    }))
    .filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-6">
        Nenhum gasto registrado neste mês
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={100}
        >
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number | string | undefined) => value != null ? formatBRL(Number(value)) : ''} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
