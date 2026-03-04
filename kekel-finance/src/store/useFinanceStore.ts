import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Category, Expense, Budget, Goal, Income, FixedExpense, FinanceStore } from '@/types'

// ── helpers: snake_case ↔ camelCase mapping ──────────────────────────

const mapCategoryFromDB = (row: Record<string, unknown>): Category => ({
  id: row.id as string,
  name: row.name as string,
  color: row.color as string,
  isDefault: row.is_default as boolean,
})

const mapExpenseFromDB = (row: Record<string, unknown>): Expense => ({
  id: row.id as string,
  amount: Number(row.amount),
  description: (row.description as string) ?? undefined,
  categoryId: row.category_id as string,
  date: row.date as string,
  createdAt: row.created_at as string,
})

const mapBudgetFromDB = (row: Record<string, unknown>): Budget => ({
  id: row.id as string,
  categoryId: row.category_id as string,
  month: row.month as string,
  limitAmount: Number(row.limit_amount),
})

const mapGoalFromDB = (row: Record<string, unknown>): Goal => ({
  id: row.id as string,
  name: row.name as string,
  targetAmount: Number(row.target_amount),
  currentAmount: Number(row.current_amount),
  deadline: (row.deadline as string) ?? undefined,
  status: row.status as Goal['status'],
  createdAt: row.created_at as string,
})

const mapIncomeFromDB = (row: Record<string, unknown>): Income => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  type: row.type as Income['type'],
  month: row.month as string,
  createdAt: row.created_at as string,
})

const mapFixedExpenseFromDB = (row: Record<string, unknown>): FixedExpense => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  categoryId: (row.category_id as string) ?? undefined,
  isActive: row.is_active as boolean,
  createdAt: row.created_at as string,
})

// ── Store ────────────────────────────────────────────────────────────

export const useFinanceStore = create<FinanceStore & { _hydrated: boolean; _hydrate: () => Promise<void> }>()((set, get) => ({
  _hydrated: false,
  categories: [],
  expenses: [],
  budgets: [],
  goals: [],
  incomes: [],
  fixedExpenses: [],

  // ── Bootstrap — load everything from Supabase ──
  _hydrate: async () => {
    const [catRes, expRes, budRes, goalRes, incRes, feRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('incomes').select('*').order('created_at', { ascending: false }),
      supabase.from('fixed_expenses').select('*').order('created_at', { ascending: false }),
    ])

    set({
      _hydrated: true,
      categories: (catRes.data ?? []).map(mapCategoryFromDB),
      expenses: (expRes.data ?? []).map(mapExpenseFromDB),
      budgets: (budRes.data ?? []).map(mapBudgetFromDB),
      goals: (goalRes.data ?? []).map(mapGoalFromDB),
      incomes: (incRes.data ?? []).map(mapIncomeFromDB),
      fixedExpenses: (feRes.data ?? []).map(mapFixedExpenseFromDB),
    })
  },

  // ── Expenses ──
  addExpense: async (expense) => {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        amount: expense.amount,
        description: expense.description ?? null,
        category_id: expense.categoryId,
        date: expense.date,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapExpenseFromDB(data)
      set((state) => ({ expenses: [mapped, ...state.expenses] }))
    }
  },

  updateExpense: async (id, expense) => {
    const { error } = await supabase
      .from('expenses')
      .update({
        amount: expense.amount,
        description: expense.description ?? null,
        category_id: expense.categoryId,
        date: expense.date,
      })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        expenses: state.expenses.map((e) =>
          e.id === id
            ? { ...e, amount: expense.amount, description: expense.description, categoryId: expense.categoryId, date: expense.date }
            : e
        ),
      }))
    }
  },

  deleteExpense: async (id) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (!error) {
      set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }))
    }
  },

  getExpensesByMonth: (year, month) =>
    get().expenses.filter((e) => {
      const [y, m] = e.date.split('-').map(Number)
      return y === year && m === month
    }),

  // ── Budgets ──
  addBudget: async (b) => {
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        category_id: b.categoryId,
        month: b.month,
        limit_amount: b.limitAmount,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapBudgetFromDB(data)
      set((state) => ({ budgets: [...state.budgets, mapped] }))
    }
  },

  updateBudget: async (id, data) => {
    const updatePayload: Record<string, unknown> = {}
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId
    if (data.month !== undefined) updatePayload.month = data.month
    if (data.limitAmount !== undefined) updatePayload.limit_amount = data.limitAmount

    const { error } = await supabase.from('budgets').update(updatePayload).eq('id', id)
    if (!error) {
      set((state) => ({
        budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...data } : b)),
      }))
    }
  },

  deleteBudget: async (id) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (!error) {
      set((state) => ({ budgets: state.budgets.filter((b) => b.id !== id) }))
    }
  },

  getBudgetByCategory: (categoryId, month) =>
    get().budgets.find((b) => b.categoryId === categoryId && b.month === month),

  // ── Goals ──
  addGoal: async (g) => {
    const { data, error } = await supabase
      .from('goals')
      .insert({
        name: g.name,
        target_amount: g.targetAmount,
        current_amount: 0,
        status: 'active',
        deadline: g.deadline ?? null,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapGoalFromDB(data)
      set((state) => ({ goals: [mapped, ...state.goals] }))
    }
  },

  updateGoal: async (id, data) => {
    const updatePayload: Record<string, unknown> = {}
    if (data.name !== undefined) updatePayload.name = data.name
    if (data.targetAmount !== undefined) updatePayload.target_amount = data.targetAmount
    if (data.currentAmount !== undefined) updatePayload.current_amount = data.currentAmount
    if (data.deadline !== undefined) updatePayload.deadline = data.deadline
    if (data.status !== undefined) updatePayload.status = data.status

    const { error } = await supabase.from('goals').update(updatePayload).eq('id', id)
    if (!error) {
      set((state) => ({
        goals: state.goals.map((goal) => (goal.id === id ? { ...goal, ...data } : goal)),
      }))
    }
  },

  deleteGoal: async (id) => {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (!error) {
      set((state) => ({ goals: state.goals.filter((g) => g.id !== id) }))
    }
  },

  addContribution: async (goalId, amount) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return

    const newAmount = Math.min(goal.currentAmount + amount, goal.targetAmount)
    const { error } = await supabase
      .from('goals')
      .update({ current_amount: newAmount })
      .eq('id', goalId)

    if (!error) {
      set((state) => ({
        goals: state.goals.map((g) =>
          g.id === goalId ? { ...g, currentAmount: newAmount } : g
        ),
      }))
    }
  },

  // ── Incomes ──
  addIncome: async (income) => {
    const { data, error } = await supabase
      .from('incomes')
      .insert({
        description: income.description,
        amount: income.amount,
        type: income.type,
        month: income.month,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapIncomeFromDB(data)
      set((state) => ({ incomes: [mapped, ...state.incomes] }))
    }
  },

  updateIncome: async (id, data) => {
    const updatePayload: Record<string, unknown> = {}
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.amount !== undefined) updatePayload.amount = data.amount
    if (data.type !== undefined) updatePayload.type = data.type
    if (data.month !== undefined) updatePayload.month = data.month

    const { error } = await supabase.from('incomes').update(updatePayload).eq('id', id)
    if (!error) {
      set((state) => ({
        incomes: state.incomes.map((inc) => (inc.id === id ? { ...inc, ...data } : inc)),
      }))
    }
  },

  deleteIncome: async (id) => {
    const { error } = await supabase.from('incomes').delete().eq('id', id)
    if (!error) {
      set((state) => ({ incomes: state.incomes.filter((inc) => inc.id !== id) }))
    }
  },

  getIncomeByMonth: (month) =>
    get().incomes.filter((inc) => inc.month === month),

  // ── Fixed Expenses ──
  addFixedExpense: async (fe) => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        description: fe.description,
        amount: fe.amount,
        category_id: fe.categoryId ?? null,
        is_active: fe.isActive,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapFixedExpenseFromDB(data)
      set((state) => ({ fixedExpenses: [mapped, ...state.fixedExpenses] }))
    }
  },

  updateFixedExpense: async (id, data) => {
    const updatePayload: Record<string, unknown> = {}
    if (data.description !== undefined) updatePayload.description = data.description
    if (data.amount !== undefined) updatePayload.amount = data.amount
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId ?? null
    if (data.isActive !== undefined) updatePayload.is_active = data.isActive

    const { error } = await supabase.from('fixed_expenses').update(updatePayload).eq('id', id)
    if (!error) {
      set((state) => ({
        fixedExpenses: state.fixedExpenses.map((fe) => (fe.id === id ? { ...fe, ...data } : fe)),
      }))
    }
  },

  deleteFixedExpense: async (id) => {
    const { error } = await supabase.from('fixed_expenses').delete().eq('id', id)
    if (!error) {
      set((state) => ({ fixedExpenses: state.fixedExpenses.filter((fe) => fe.id !== id) }))
    }
  },

  toggleFixedExpense: async (id) => {
    const fe = get().fixedExpenses.find((f) => f.id === id)
    if (!fe) return
    const newActive = !fe.isActive
    const { error } = await supabase
      .from('fixed_expenses')
      .update({ is_active: newActive })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        fixedExpenses: state.fixedExpenses.map((f) =>
          f.id === id ? { ...f, isActive: newActive } : f
        ),
      }))
    }
  },

  getTotalFixedExpenses: () =>
    get().fixedExpenses.filter((fe) => fe.isActive).reduce((sum, fe) => sum + fe.amount, 0),
}))

// ── Auto-hydrate on app start ──
useFinanceStore.getState()._hydrate()
