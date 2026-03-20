import type { Income, FixedExpense, CreditCard, Expense } from '@/types'

export function getCurrentBillingCycle(closingDay: number, today: Date): { start: Date; end: Date } {
  const year = today.getFullYear()
  const month = today.getMonth()
  const dayOfMonth = today.getDate()

  if (dayOfMonth < closingDay) {
    const start = new Date(year, month - 1, closingDay)
    const end = new Date(year, month, closingDay - 1)
    return { start, end }
  } else {
    const start = new Date(year, month, closingDay)
    const end = new Date(year, month + 1, closingDay - 1)
    return { start, end }
  }
}

export interface IncomeListItem {
  income: Income
  received: boolean
  // true = projeção do próximo mês para renda recorrente já recebida neste mês
  isProjected: boolean
}

export function isReceivedInCycle(income: Income, cycleStart: string, cycleEnd: string): boolean {
  if (!income.receivedAt) return false
  const date = income.receivedAt.split('T')[0]  // 'YYYY-MM-DD'
  return date >= cycleStart && date <= cycleEnd
}

export interface ForecastResult {
  // Fatura
  cardBillAccumulated: number  // = currentBill (valor manual do cartão)
  cardBillForecast: number     // = currentBill + fixedTotal + cycleExpensesCard
  daysUntilClosing: number
  daysUntilPayment: number

  // Receitas
  incomeReceived: number
  incomePending: number
  incomeList: IncomeListItem[]

  // Saldo em conta
  accountBalance: number
  realAccountBalance: number   // saldo - gastos em dinheiro/PIX do ciclo

  // Componentes da fatura
  totalFixedActive: number
  fixedAlreadyBilled: number  // fixos com billingDay <= hoje (já na fatura atual)
  fixedPending: number        // fixos com billingDay > hoje (ainda não cobrados)
  fixedRecurring: number      // total (card + cash) recurring in this cycle
  fixedRecurringCard: number
  fixedRecurringCash: number
  cycleExpensesCard: number  // gastos do ciclo pagos no cartão
  cycleExpensesCash: number  // gastos do ciclo pagos em dinheiro/PIX

  // Ciclo de faturamento
  cycleStart: string  // 'YYYY-MM-DD'
  cycleEnd: string    // 'YYYY-MM-DD'

  // Disponível
  incomeBeforePayment: number  // rendas a receber antes do próximo pagamento da fatura
  monthlyGoal: number
  quantoPodeGastar: number

  // Legacy
  spendingPower: number
  rendaMensal: number
}

export function calcRecurringFixedTotal(
  fixedExpenses: FixedExpense[],
  cycleEnd: string,
  today: Date
): number {
  const todayStr = today.toISOString().split('T')[0]
  let total = 0

  for (const fe of fixedExpenses) {
    if (!fe.recurrenceType) continue

    if (fe.recurrenceType === 'weekdays') {
      const weekdays = fe.recurrenceWeekdays ?? []
      if (weekdays.length === 0) continue

      // Iterate from tomorrow to cycleEnd inclusive
      const cursor = new Date(today)
      cursor.setDate(cursor.getDate() + 1)
      while (cursor.toISOString().split('T')[0] <= cycleEnd) {
        if (weekdays.includes(cursor.getDay())) {
          total += fe.amount
        }
        cursor.setDate(cursor.getDate() + 1)
      }
    } else if (fe.recurrenceType === 'specific') {
      const dates = fe.recurrenceDates ?? []
      for (const d of dates) {
        if (d > todayStr && d <= cycleEnd) {
          total += fe.amount
        }
      }
    }
  }

  return total
}

export function calculateForecast(params: {
  today: Date
  incomes: Income[]
  expenses: Expense[]
  fixedExpenses: FixedExpense[]
  creditCard: CreditCard | null
  manualBalance: number
  monthlyGoal: number
  currentMonth: string
}): ForecastResult {
  const { today, incomes, expenses, fixedExpenses, creditCard, manualBalance, monthlyGoal, currentMonth } = params
  const todayDay = today.getDate()
  const year = today.getFullYear()
  const month = today.getMonth()

  // ── Datas de fechamento e pagamento ──
  let daysUntilClosing = 0
  let daysUntilPayment = 0
  let nextPaymentDate: Date | null = null

  if (creditCard) {
    const closingDate = todayDay < creditCard.closingDay
      ? new Date(year, month, creditCard.closingDay)
      : new Date(year, month + 1, creditCard.closingDay)
    daysUntilClosing = Math.ceil((closingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    // Ciclo reinicia no dia do pagamento: se hoje >= paymentDay, próximo pagamento é mês que vem
    nextPaymentDate = todayDay >= creditCard.paymentDay
      ? new Date(year, month + 1, creditCard.paymentDay)
      : new Date(year, month, creditCard.paymentDay)
    daysUntilPayment = Math.ceil((nextPaymentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  // ── Ciclo de faturamento ──
  // Se não há cartão, usa o mês corrente inteiro como ciclo
  const billingCycle = creditCard
    ? getCurrentBillingCycle(creditCard.closingDay, today)
    : { start: new Date(year, month, 1), end: new Date(year, month + 1, 0) }

  const cycleStart = billingCycle.start.toISOString().split('T')[0]
  const cycleEnd = billingCycle.end.toISOString().split('T')[0]

  // ── Receitas do mês corrente ──
  const monthIncomes = incomes.filter((inc) => inc.month === currentMonth)

  // Monta lista de itens de renda para exibição:
  // - Rendas do mês com status recebido/pendente
  // - Rendas recorrentes já recebidas geram uma projeção para o próximo mês
  const incomeList: IncomeListItem[] = []
  for (const income of monthIncomes) {
    const received = isReceivedInCycle(income, cycleStart, cycleEnd)
      || (income.paymentDay == null)
      || (income.paymentDay <= todayDay)
    incomeList.push({ income, received, isProjected: false })

    // Projeta próximo mês para recorrentes já recebidas
    if (received && income.isRecurring && income.paymentDay != null) {
      incomeList.push({ income, received: false, isProjected: true })
    }
  }

  const incomeReceived = incomeList
    .filter((item) => item.received && !item.isProjected)
    .reduce((sum, item) => sum + item.income.amount, 0)

  // "A receber" inclui pendentes do mês + projeções do próximo ciclo
  const incomePending = incomeList
    .filter((item) => !item.received)
    .reduce((sum, item) => sum + item.income.amount, 0)

  // ── Rendas que chegarão antes do próximo pagamento da fatura ──
  // Regras:
  // 1. paymentDay > todayDay → chega ainda neste mês; compara data com nextPaymentDate
  // 2. paymentDay <= todayDay E isRecurring → projeta para mês seguinte; compara com nextPaymentDate
  // 3. paymentDay == null → sem data definida, considerada já no saldo
  const incomeBeforePayment = monthIncomes.reduce((sum, inc) => {
    if (inc.paymentDay == null) return sum  // sem data → já no saldo
    if (isReceivedInCycle(inc, cycleStart, cycleEnd)) return sum  // marcada recebida → já no saldo

    let nextOccurrence: Date
    if (inc.paymentDay > todayDay) {
      // Ainda não chegou neste mês
      nextOccurrence = new Date(year, month, inc.paymentDay)
    } else {
      // Já recebida este mês; projeta para o próximo se recorrente
      if (!inc.isRecurring) return sum
      nextOccurrence = new Date(year, month + 1, inc.paymentDay)
    }

    // Inclui se a próxima ocorrência chegar até o dia do pagamento (inclusive)
    if (nextPaymentDate != null && nextOccurrence <= nextPaymentDate) {
      return sum + inc.amount
    }
    return sum
  }, 0)

  // ── Gastos da aba Gastos dentro do ciclo atual ──
  const cycleExpensesCard = expenses
    .filter((e) => e.paymentMethod === 'card' && e.date >= cycleStart && e.date <= cycleEnd)
    .reduce((sum, e) => sum + e.amount, 0)

  const cycleExpensesCash = expenses
    .filter((e) => e.paymentMethod === 'cash' && e.date >= cycleStart && e.date <= cycleEnd)
    .reduce((sum, e) => sum + e.amount, 0)

  // ── Custos fixos ──
  const activeFixed = fixedExpenses.filter((fe) => fe.isActive)

  // Split: monthly (billingDay-based) vs recurring (weekdays/specific)
  const monthlyFixed = activeFixed.filter((fe) => !fe.recurrenceType)
  const recurringFixed = activeFixed.filter((fe) => !!fe.recurrenceType)

  // Monthly fixed — existing logic, restricted to monthlyFixed only
  const totalFixedActive = monthlyFixed.reduce((sum, fe) => sum + fe.amount, 0)
  const fixedAlreadyBilled = monthlyFixed
    .filter((fe) => fe.billingDay != null && fe.billingDay <= todayDay)
    .reduce((sum, fe) => sum + fe.amount, 0)
  const fixedPending = totalFixedActive - fixedAlreadyBilled

  // Recurring fixed — split by payment method
  const recurringCard = recurringFixed.filter((fe) => fe.paymentMethod === 'card')
  const recurringCash  = recurringFixed.filter((fe) => fe.paymentMethod === 'cash')
  const fixedRecurringCard = calcRecurringFixedTotal(recurringCard, cycleEnd, today)
  const fixedRecurringCash  = calcRecurringFixedTotal(recurringCash,  cycleEnd, today)
  const fixedRecurring = fixedRecurringCard + fixedRecurringCash

  // ── Fatura ──
  const cardBillAccumulated = creditCard?.currentBill ?? 0
  // Fatura total = fatura atual + fixos pendentes + gastos do ciclo no cartão
  // (fixos já cobrados já estão dentro de cardBillAccumulated)
  const cardBillForecast = cardBillAccumulated + fixedPending + fixedRecurringCard + cycleExpensesCard

  // ── Saldo real em conta ──
  const accountBalance = manualBalance
  const realAccountBalance = manualBalance - cycleExpensesCash - fixedRecurringCash  // pode ser negativo

  // ── Disponível para gastar ──
  // = saldo + rendas antes do pagamento - fatura total - gastos do ciclo em dinheiro - meta
  const quantoPodeGastar =
    manualBalance + incomeBeforePayment - cardBillForecast - cycleExpensesCash - monthlyGoal

  // Legacy
  const rendaMensal = monthIncomes.reduce((sum, inc) => sum + inc.amount, 0)
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
    realAccountBalance,
    totalFixedActive,
    fixedAlreadyBilled,
    fixedPending,
    fixedRecurring,
    fixedRecurringCard,
    fixedRecurringCash,
    cycleExpensesCard,
    cycleExpensesCash,
    cycleStart,
    cycleEnd,
    incomeBeforePayment,
    monthlyGoal,
    quantoPodeGastar,
    spendingPower,
    rendaMensal,
  }
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
