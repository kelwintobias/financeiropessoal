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
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void | Promise<void>
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'createdAt'>) => void | Promise<void>
  deleteExpense: (id: string) => void | Promise<void>
  getExpensesByMonth: (year: number, month: number) => Expense[]
  addBudget: (b: Omit<Budget, 'id'>) => void | Promise<void>
  updateBudget: (id: string, data: Partial<Budget>) => void | Promise<void>
  deleteBudget: (id: string) => void | Promise<void>
  getBudgetByCategory: (categoryId: string, month: string) => Budget | undefined
  addGoal: (g: Omit<Goal, 'id' | 'currentAmount' | 'status' | 'createdAt'>) => void | Promise<void>
  updateGoal: (id: string, data: Partial<Goal>) => void | Promise<void>
  deleteGoal: (id: string) => void | Promise<void>
  addContribution: (goalId: string, amount: number) => void | Promise<void>
}

