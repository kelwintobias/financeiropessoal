import type { Income, FixedExpense, CreditCard } from '@/types'

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

  // Poder de gasto
  spendingPower: number
}

export function calculateForecast(params: {
  today: Date
  incomes: Income[]
  fixedExpenses: FixedExpense[]
  creditCard: CreditCard | null
  manualBalance: number
  currentMonth: string
}): ForecastResult {
  const { today, incomes, fixedExpenses, creditCard, manualBalance, currentMonth } = params
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

  // ── Receitas do mês (informativo) ──
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

  // ── Saldo e Poder de Gasto ──
  const accountBalance = manualBalance
  const spendingPower = manualBalance - cardBillForecast

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
  }
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
