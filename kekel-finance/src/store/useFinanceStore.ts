import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Category, Expense, Budget, Goal, Income, FixedExpense, CreditCard, UserSettings, PlannedExpense, FinanceStore } from '@/types'

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
  paymentMethod: (row.payment_method as Expense['paymentMethod']) ?? 'card',
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
  paymentDay: row.payment_day != null ? Number(row.payment_day) : undefined,
  isRecurring: (row.is_recurring as boolean) ?? false,
  receivedAt: row.received_at != null ? (row.received_at as string) : undefined,
  createdAt: row.created_at as string,
})

const mapFixedExpenseFromDB = (row: Record<string, unknown>): FixedExpense => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  categoryId: (row.category_id as string) ?? undefined,
  billingDay: row.billing_day != null ? Number(row.billing_day) : undefined,
  paymentMethod: (row.payment_method as FixedExpense['paymentMethod']) ?? 'card',
  isActive: row.is_active as boolean,
  createdAt: row.created_at as string,
  recurrenceType: (row.recurrence_type as FixedExpense['recurrenceType']) ?? undefined,
  recurrenceWeekdays: (row.recurrence_weekdays as number[] | null) ?? undefined,
  recurrenceDates: (row.recurrence_dates as string[] | null) ?? undefined,
})

const mapCreditCardFromDB = (row: Record<string, unknown>): CreditCard => ({
  id: row.id as string,
  name: row.name as string,
  closingDay: Number(row.closing_day),
  paymentDay: Number(row.payment_day),
  creditLimit: row.credit_limit != null ? Number(row.credit_limit) : undefined,
  currentBill: Number(row.current_bill ?? 0),
  createdAt: row.created_at as string,
})

const mapUserSettingsFromDB = (row: Record<string, unknown>): UserSettings => ({
  id: row.id as string,
  accountBalance: Number(row.account_balance ?? 0),
  monthlyGoal: Number(row.monthly_goal ?? 0),
})

const mapPlannedExpenseFromDB = (row: Record<string, unknown>): PlannedExpense => ({
  id: row.id as string,
  description: row.description as string,
  amount: Number(row.amount),
  date: row.date as string,
  paymentMethod: (row.payment_method as PlannedExpense['paymentMethod']) ?? 'card',
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
  plannedExpenses: [],
  creditCard: null,
  userSettings: null,

  // ── Bootstrap — load everything from Supabase ──
  _hydrate: async () => {
    const [catRes, expRes, budRes, goalRes, incRes, feRes, ccRes, usRes, peRes] = await Promise.all([
      supabase.from('categories').select('*').order('name'),
      supabase.from('expenses').select('*').order('date', { ascending: false }),
      supabase.from('budgets').select('*'),
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('incomes').select('*').order('created_at', { ascending: false }),
      supabase.from('fixed_expenses').select('*').order('created_at', { ascending: false }),
      supabase.from('credit_card_config').select('*').limit(1),
      supabase.from('user_settings').select('*').limit(1),
      supabase.from('planned_expenses').select('*').order('date'),
    ])

    set({
      _hydrated: true,
      categories: (catRes.data ?? []).map(mapCategoryFromDB),
      expenses: (expRes.data ?? []).map(mapExpenseFromDB),
      budgets: (budRes.data ?? []).map(mapBudgetFromDB),
      goals: (goalRes.data ?? []).map(mapGoalFromDB),
      incomes: (incRes.data ?? []).map(mapIncomeFromDB),
      fixedExpenses: (feRes.data ?? []).map(mapFixedExpenseFromDB),
      plannedExpenses: (peRes.data ?? []).map(mapPlannedExpenseFromDB),
      creditCard: ccRes.data && ccRes.data.length > 0 ? mapCreditCardFromDB(ccRes.data[0]) : null,
      userSettings: usRes.data && usRes.data.length > 0 ? mapUserSettingsFromDB(usRes.data[0]) : null,
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
        payment_method: expense.paymentMethod,
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
        payment_method: expense.paymentMethod,
      })
      .eq('id', id)

    if (!error) {
      set((state) => ({
        expenses: state.expenses.map((e) =>
          e.id === id
            ? { ...e, amount: expense.amount, description: expense.description, categoryId: expense.categoryId, date: expense.date, paymentMethod: expense.paymentMethod }
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
        payment_day: income.paymentDay ?? null,
        is_recurring: income.isRecurring,
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
    if (data.paymentDay !== undefined) updatePayload.payment_day = data.paymentDay ?? null
    if (data.isRecurring !== undefined) updatePayload.is_recurring = data.isRecurring

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

  markIncomeReceived: async (id, received) => {
    const value = received ? new Date().toISOString() : null
    const { error } = await supabase
      .from('incomes')
      .update({ received_at: value })
      .eq('id', id)
    if (error) {
      console.error('Failed to mark income received:', error)
      return
    }
    set((state) => ({
      incomes: state.incomes.map((inc) =>
        inc.id === id ? { ...inc, receivedAt: value ?? undefined } : inc
      ),
    }))
  },

  // ── Fixed Expenses ──
  addFixedExpense: async (fe) => {
    const { data, error } = await supabase
      .from('fixed_expenses')
      .insert({
        description: fe.description,
        amount: fe.amount,
        category_id: fe.categoryId ?? null,
        billing_day: fe.recurrenceType ? null : (fe.billingDay ?? null),
        payment_method: fe.paymentMethod,
        is_active: fe.isActive,
        recurrence_type: fe.recurrenceType ?? null,
        recurrence_weekdays: fe.recurrenceWeekdays ?? null,
        recurrence_dates: fe.recurrenceDates ?? null,
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
    updatePayload.recurrence_type = data.recurrenceType ?? null
    updatePayload.recurrence_weekdays = data.recurrenceWeekdays ?? null
    updatePayload.recurrence_dates = data.recurrenceDates ?? null
    // When setting recurrenceType, clear billingDay; when clearing it, use whatever billingDay was passed
    if (data.recurrenceType) {
      updatePayload.billing_day = null
    } else {
      updatePayload.billing_day = data.billingDay ?? null
    }
    if (data.paymentMethod !== undefined) updatePayload.payment_method = data.paymentMethod
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

  // ── Credit Card ──
  saveCreditCard: async (data) => {
    const existing = get().creditCard

    if (existing) {
      const { error } = await supabase
        .from('credit_card_config')
        .update({
          name: data.name,
          closing_day: data.closingDay,
          payment_day: data.paymentDay,
          credit_limit: data.creditLimit ?? null,
        })
        .eq('id', existing.id)

      if (!error) {
        set({ creditCard: { ...existing, ...data } })
      }
    } else {
      const { data: row, error } = await supabase
        .from('credit_card_config')
        .insert({
          name: data.name,
          closing_day: data.closingDay,
          payment_day: data.paymentDay,
          credit_limit: data.creditLimit ?? null,
          current_bill: 0,
        })
        .select()
        .single()

      if (!error && row) {
        set({ creditCard: mapCreditCardFromDB(row) })
      }
    }
  },
  // ── User Settings ──
  updateAccountBalance: async (amount) => {
    const { userSettings } = get()
    if (userSettings) {
      const { error } = await supabase
        .from('user_settings')
        .update({ account_balance: amount, updated_at: new Date().toISOString() })
        .eq('id', userSettings.id)
      if (!error) {
        set({ userSettings: { ...userSettings, accountBalance: amount } })
      }
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ account_balance: amount })
        .select()
        .single()
      if (!error && data) {
        set({ userSettings: mapUserSettingsFromDB(data) })
      }
    }
  },

  updateCurrentBill: async (amount) => {
    const { creditCard } = get()
    if (!creditCard) return
    const { error } = await supabase
      .from('credit_card_config')
      .update({ current_bill: amount })
      .eq('id', creditCard.id)
    if (!error) {
      set({ creditCard: { ...creditCard, currentBill: amount } })
    }
  },

  updateBillAndRecord: async (newAmount) => {
    const { creditCard, categories, updateCurrentBill } = get()
    if (!creditCard) return

    const diff = Math.round((newAmount - creditCard.currentBill) * 100) / 100

    if (diff <= 0) {
      await updateCurrentBill(newAmount)
      return
    }

    const cardCategory = categories.find((c) => c.name === 'Cartão')
    if (!cardCategory) {
      console.warn('[updateBillAndRecord] Categoria "Cartão" não encontrada. Apenas atualizando fatura.')
      await updateCurrentBill(newAmount)
      return
    }

    const today = new Date()
    const dd = String(today.getDate()).padStart(2, '0')
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dateStr = `${today.getFullYear()}-${mm}-${dd}`
    const description = `Fatura ${dd}/${mm}`

    await get().addExpense({
      amount: diff,
      description,
      categoryId: cardCategory.id,
      date: dateStr,
      paymentMethod: 'card',
    })

    await updateCurrentBill(newAmount)
  },

  // ── Planned Expenses ──
  addPlannedExpense: async (pe) => {
    const { data, error } = await supabase
      .from('planned_expenses')
      .insert({
        description: pe.description,
        amount: pe.amount,
        date: pe.date,
        payment_method: pe.paymentMethod,
      })
      .select()
      .single()

    if (!error && data) {
      const mapped = mapPlannedExpenseFromDB(data)
      set((state) => ({
        plannedExpenses: [...state.plannedExpenses, mapped].sort((a, b) => a.date.localeCompare(b.date)),
      }))
    }
  },

  deletePlannedExpense: async (id) => {
    const { error } = await supabase.from('planned_expenses').delete().eq('id', id)
    if (!error) {
      set((state) => ({ plannedExpenses: state.plannedExpenses.filter((pe) => pe.id !== id) }))
    }
  },

  updateMonthlyGoal: async (amount) => {
    const { userSettings } = get()
    if (userSettings) {
      const { error } = await supabase
        .from('user_settings')
        .update({ monthly_goal: amount })
        .eq('id', userSettings.id)
      if (!error) {
        set({ userSettings: { ...userSettings, monthlyGoal: amount } })
      }
    } else {
      const { data, error } = await supabase
        .from('user_settings')
        .insert({ monthly_goal: amount })
        .select()
        .single()
      if (!error && data) {
        set({ userSettings: mapUserSettingsFromDB(data) })
      }
    }
  },
}))

// ── Auto-hydrate on app start ──
useFinanceStore.getState()._hydrate()
