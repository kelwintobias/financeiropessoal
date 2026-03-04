import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, FinanceStore } from '@/types'



const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Alimentação', color: '#22c55e', isDefault: true },
  { id: 'cat-2', name: 'Transporte',  color: '#3b82f6', isDefault: true },
  { id: 'cat-3', name: 'Moradia',     color: '#f59e0b', isDefault: true },
  { id: 'cat-4', name: 'Saúde',       color: '#ef4444', isDefault: true },
  { id: 'cat-5', name: 'Lazer',       color: '#8b5cf6', isDefault: true },
  { id: 'cat-6', name: 'Educação',    color: '#06b6d4', isDefault: true },
  { id: 'cat-7', name: 'Outros',      color: '#6b7280', isDefault: true },
]

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      categories: DEFAULT_CATEGORIES,
      expenses: [],
      budgets: [],
      goals: [],

      addExpense: (expense) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            {
              ...expense,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateExpense: (id, expense) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === id ? { ...expense, id, createdAt: e.createdAt } : e
          ),
        })),

      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        })),

      getExpensesByMonth: (year, month) =>
        get().expenses.filter((e) => {
          const [y, m] = e.date.split('-').map(Number)
          return y === year && m === month
        }),

      addBudget: (b) =>
        set((state) => ({
          budgets: [
            ...state.budgets,
            { ...b, id: crypto.randomUUID() },
          ],
        })),

      updateBudget: (id, data) =>
        set((state) => ({
          budgets: state.budgets.map((b) =>
            b.id === id ? { ...b, ...data } : b
          ),
        })),

      deleteBudget: (id) =>
        set((state) => ({
          budgets: state.budgets.filter((b) => b.id !== id),
        })),

      getBudgetByCategory: (categoryId, month) =>
        get().budgets.find((b) => b.categoryId === categoryId && b.month === month),

      addGoal: (g) =>
        set((state) => ({
          goals: [
            ...state.goals,
            {
              ...g,
              id: crypto.randomUUID(),
              currentAmount: 0,
              status: 'active' as const,
              createdAt: new Date().toISOString(),
            },
          ],
        })),

      updateGoal: (id, data) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === id ? { ...g, ...data } : g
          ),
        })),

      deleteGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),

      addContribution: (goalId, amount) =>
        set((state) => ({
          goals: state.goals.map((g) =>
            g.id === goalId
              ? { ...g, currentAmount: Math.min(g.currentAmount + amount, g.targetAmount) }
              : g
          ),
        })),
    }),
    {
      name: 'kekel-finance',
    }
  )
)
