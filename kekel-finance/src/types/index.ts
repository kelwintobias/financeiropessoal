export interface Category {
  id: string
  name: string
  color: string
  isDefault: boolean
}

export interface Expense {
  id: string
  amount: number
  description?: string
  categoryId: string
  date: string
  createdAt: string
}

export interface Budget {
  id: string
  categoryId: string
  month: string       // 'YYYY-MM', ex: '2026-03'
  limitAmount: number
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline?: string
  status: 'active' | 'completed' | 'archived'
  createdAt: string
}

export interface FinanceStore {
  categories: Category[]
  expenses: Expense[]
  budgets: Budget[]
  goals: Goal[]
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'createdAt'>) => void
  deleteExpense: (id: string) => void
  getExpensesByMonth: (year: number, month: number) => Expense[]
  addBudget: (b: Omit<Budget, 'id'>) => void
  updateBudget: (id: string, data: Partial<Budget>) => void
  deleteBudget: (id: string) => void
  getBudgetByCategory: (categoryId: string, month: string) => Budget | undefined
  addGoal: (g: Omit<Goal, 'id' | 'currentAmount' | 'status' | 'createdAt'>) => void
  updateGoal: (id: string, data: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addContribution: (goalId: string, amount: number) => void
}
