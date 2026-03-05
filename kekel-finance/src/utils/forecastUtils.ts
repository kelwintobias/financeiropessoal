import type { Income, FixedExpense, CreditCard, PlannedExpense, Expense } from '@/types'

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

export interface ForecastResult {
  // Fatura
  cardBillAccumulated: number  // = currentBill (valor manual do cartão)
  cardBillForecast: number     // = currentBill + fixedTotal + plannedCard
  daysUntilClosing: number
  daysUntilPayment: number

  // Receitas
  incomeReceived: number
  incomePending: number
  incomeList: IncomeListItem[]

  // Saldo em conta
  accountBalance: number
  realAccountBalance: number   // saldo - gastos previstos em dinheiro/PIX

  // Componentes da fatura
  totalFixedActive: number
  plannedCard: number   // gastos previstos pagos no cartão
  plannedCash: number   // gastos previstos pagos em dinheiro/PIX

  // Gastos históricos (somente informativo)
  expensesCurrentMonth: number

  // Disponível
  incomeBeforePayment: number  // rendas a receber antes do próximo pagamento da fatura
  monthlyGoal: number
  quantoPodeGastar: number

  // Legacy
  spendingPower: number
  rendaMensal: number
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

  // ── Receitas do mês corrente ──
  const monthIncomes = incomes.filter((inc) => inc.month === currentMonth)

  // Monta lista de itens de renda para exibição:
  // - Rendas do mês com status recebido/pendente
  // - Rendas recorrentes já recebidas geram uma projeção para o próximo mês
  const incomeList: IncomeListItem[] = []
  for (const income of monthIncomes) {
    const received = income.paymentDay != null ? income.paymentDay <= todayDay : true
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

  // ── Gastos previstos separados por forma de pagamento ──
  const plannedCard = plannedExpenses
    .filter((pe) => pe.paymentMethod === 'card')
    .reduce((sum, pe) => sum + pe.amount, 0)

  const plannedCash = plannedExpenses
    .filter((pe) => pe.paymentMethod === 'cash')
    .reduce((sum, pe) => sum + pe.amount, 0)

  // ── Custos fixos (todos entram na fatura do cartão) ──
  const totalFixedActive = fixedExpenses
    .filter((fe) => fe.isActive)
    .reduce((sum, fe) => sum + fe.amount, 0)

  // ── Fatura ──
  const cardBillAccumulated = creditCard?.currentBill ?? 0
  // Fatura total = fatura atual + custos fixos ativos + gastos previstos no cartão
  const cardBillForecast = cardBillAccumulated + totalFixedActive + plannedCard

  // ── Saldo real em conta ──
  const accountBalance = manualBalance
  const realAccountBalance = manualBalance - plannedCash  // pode ser negativo

  // ── Gastos históricos do mês (somente informativo) ──
  const expensesCurrentMonth = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0)

  // ── Disponível para gastar ──
  // = saldo + rendas antes do pagamento - fatura total - gastos previstos em dinheiro - meta
  const quantoPodeGastar =
    manualBalance + incomeBeforePayment - cardBillForecast - plannedCash - monthlyGoal

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
    plannedCard,
    plannedCash,
    expensesCurrentMonth,
    incomeBeforePayment,
    monthlyGoal,
    quantoPodeGastar,
    spendingPower,
    rendaMensal,
  }
}

export const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
