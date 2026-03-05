import type { Income, FixedExpense, CreditCard, PlannedExpense, Expense } from '@/types'

export function getCurrentBillingCycle(closingDay: number, today: Date): { start: Date; end: Date } {
  const year = today.getFullYear()
  const month = today.getMonth()
  const dayOfMonth = today.getDate()

  if (dayOfMonth < closingDay) {
    // Ciclo: mês anterior/closingDay → este mês/closingDay
    const start = new Date(year, month - 1, closingDay)
    const end = new Date(year, month, closingDay - 1)
    return { start, end }
  } else {
    // Ciclo: este mês/closingDay → próximo mês/closingDay
    const start = new Date(year, month, closingDay)
    const end = new Date(year, month + 1, closingDay - 1)
    return { start, end }
  }
}

export interface ForecastResult {
  // Fatura
  cardBillAccumulated: number
  cardBillForecast: number
  daysUntilClosing: number
  daysUntilPayment: number

  // Receitas
  incomeReceived: number
  incomePending: number
  incomeList: Array<{ income: Income; received: boolean }>

  // Saldo em conta
  accountBalance: number

  // Poder de gasto (legado)
  spendingPower: number

  // Fórmula nova
  rendaMensal: number
  incomeBeforeClosing: number  // rendas ainda não recebidas com paymentDay <= fechamento
  faturaBill: number           // só o valor manual do cartão
  totalFixedActive: number     // soma dos gastos fixos ativos
  expensesCurrentMonth: number // gastos da aba expenses no mês
  gastosPrevistosCurrentMonth: number
  monthlyGoal: number
  quantoPodeGastar: number
}

export function calculateForecast(params: {
  today: Date
  incomes: Income[]
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  plannedExpenses: PlannedExpense[]
  creditCard: CreditCard | null
  manualBalance: number
  monthlyGoal: number
  currentMonth: string
}): ForecastResult {
  const { today, incomes, expenses, fixedExpenses, plannedExpenses, creditCard, manualBalance, monthlyGoal, currentMonth } = params
  const todayDay = today.getDate()

  // ── Fatura ──
  let cardBillAccumulated = 0
  let cardBillForecast = 0
  let daysUntilClosing = 0
  let daysUntilPayment = 0

  if (creditCard) {
    cardBillAccumulated = creditCard.currentBill

    const cardFixedBeforeClosing = fixedExpenses
      .filter((fe) => {
        if (!fe.isActive || fe.paymentMethod !== 'card') return false
        const billingDay = fe.billingDay ?? 1
        return billingDay > todayDay && billingDay <= creditCard.closingDay
      })
      .reduce((sum, fe) => sum + fe.amount, 0)

    cardBillForecast = cardBillAccumulated + cardFixedBeforeClosing

    const year = today.getFullYear()
    const month = today.getMonth()
    const closingDate = todayDay < creditCard.closingDay
      ? new Date(year, month, creditCard.closingDay)
      : new Date(year, month + 1, creditCard.closingDay)
    daysUntilClosing = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    const paymentDate = todayDay < creditCard.paymentDay
      ? new Date(year, month, creditCard.paymentDay)
      : new Date(year, month + 1, creditCard.paymentDay)
    daysUntilPayment = Math.ceil((paymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ── Receitas do mês ──
  const monthIncomes = incomes.filter((inc) => inc.month === currentMonth)
  const incomeList = monthIncomes.map((income) => {
    const received = income.paymentDay != null ? income.paymentDay <= todayDay : true
    return { income, received }
  })

  const incomeReceived = incomeList
    .filter((item) => item.received)
    .reduce((sum, item) => sum + item.income.amount, 0)

  const incomePending = incomeList
    .filter((item) => !item.received)
    .reduce((sum, item) => sum + item.income.amount, 0)

  // ── Saldo e Poder de Gasto (legado) ──
  const accountBalance = manualBalance
  const spendingPower = manualBalance - cardBillForecast

  // ── Fórmula nova ──
  const rendaMensal = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0)

  // Rendas ainda não recebidas que chegarão antes do fechamento da fatura.
  // Renda sem paymentDay é tratada como já recebida (está no saldo).
  const closingDay = creditCard?.closingDay ?? null
  const incomeBeforeClosing = monthIncomes
    .filter((inc) => {
      if (inc.paymentDay == null) return false          // sem data → já no saldo
      if (inc.paymentDay <= todayDay) return false       // já recebida → já no saldo
      if (closingDay !== null && inc.paymentDay > closingDay) return false  // chega após o fechamento
      return true
    })
    .reduce((sum, inc) => sum + inc.amount, 0)

  const faturaBill = creditCard?.currentBill ?? 0

  const totalFixedActive = fixedExpenses
    .filter((fe) => fe.isActive)
    .reduce((sum, fe) => sum + fe.amount, 0)

  const expensesCurrentMonth = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0)

  const gastosPrevistosCurrentMonth = plannedExpenses
    .filter((pe) => pe.date.startsWith(currentMonth))
    .reduce((sum, pe) => sum + pe.amount, 0)

  // Base: saldo atual + rendas a receber antes do fechamento
  const quantoPodeGastar =
    manualBalance + incomeBeforeClosing
    - faturaBill - totalFixedActive - expensesCurrentMonth - gastosPrevistosCurrentMonth - monthlyGoal

  return {
    cardBillAccumulated,
    cardBillForecast,
    daysUntilClosing,
    daysUntilPayment,
    incomeReceived,
    incomePending,
    incomeList,
    accountBalance,
    spendingPower,
    rendaMensal,
    incomeBeforeClosing,
    faturaBill,
    totalFixedActive,
    expensesCurrentMonth,
    gastosPrevistosCurrentMonth,
    monthlyGoal,
    quantoPodeGastar,
  }
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
