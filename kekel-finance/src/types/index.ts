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
  paymentMethod: 'card' | 'cash'
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

export interface Income {
  id: string
  description: string
  amount: number
  type: 'fixed' | 'variable'
  month: string       // 'YYYY-MM'
  paymentDay?: number   // dia do mês em que cai o pagamento (1-31)
  isRecurring: boolean  // se é recorrente mensal
  createdAt: string
}

export interface FixedExpense {
  id: string
  description: string
  amount: number
  categoryId?: string
  billingDay?: number   // dia do mês em que é cobrado (1–31)
  paymentMethod: 'card' | 'cash'
  isActive: boolean
  createdAt: string
}

export interface CreditCard {
  id: string
  name: string
  closingDay: number
  paymentDay: number
  creditLimit?: number
  currentBill: number
  createdAt: string
}

export interface UserSettings {
  id: string
  accountBalance: number
  monthlyGoal: number
}

export interface PlannedExpense {
  id: string
  description: string
  amount: number
  date: string           // 'YYYY-MM-DD'
  paymentMethod: 'card' | 'cash'
  createdAt: string
}

export interface FinanceStore {
  categories: Category[]
  expenses: Expense[]
  budgets: Budget[]
  goals: Goal[]
  incomes: Income[]
  fixedExpenses: FixedExpense[]
  plannedExpenses: PlannedExpense[]
  creditCard: CreditCard | null
  userSettings: UserSettings | null
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
  addIncome: (income: Omit<Income, 'id' | 'createdAt'>) => void | Promise<void>
  updateIncome: (id: string, data: Partial<Omit<Income, 'id' | 'createdAt'>>) => void | Promise<void>
  deleteIncome: (id: string) => void | Promise<void>
  getIncomeByMonth: (month: string) => Income[]
  addFixedExpense: (fe: Omit<FixedExpense, 'id' | 'createdAt'>) => void | Promise<void>
  updateFixedExpense: (id: string, data: Partial<Omit<FixedExpense, 'id' | 'createdAt'>>) => void | Promise<void>
  deleteFixedExpense: (id: string) => void | Promise<void>
  toggleFixedExpense: (id: string) => void | Promise<void>
  getTotalFixedExpenses: () => number
  saveCreditCard: (data: Omit<CreditCard, 'id' | 'createdAt' | 'currentBill'>) => void | Promise<void>
  updateAccountBalance: (amount: number) => Promise<void>
  updateCurrentBill: (amount: number) => Promise<void>
  addPlannedExpense: (pe: Omit<PlannedExpense, 'id' | 'createdAt'>) => Promise<void>
  deletePlannedExpense: (id: string) => Promise<void>
  updateMonthlyGoal: (amount: number) => Promise<void>
}
