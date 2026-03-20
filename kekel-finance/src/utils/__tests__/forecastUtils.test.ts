import { describe, it, expect } from 'vitest'
import { calcRecurringFixedTotal, calculateForecast } from '@/utils/forecastUtils'
import type { FixedExpense, CreditCard, Income, Expense } from '@/types'

// Helper: build a minimal FixedExpense
function fe(overrides: Partial<FixedExpense> = {}): FixedExpense {
  return {
    id: '1',
    description: 'test',
    amount: 50,
    paymentMethod: 'card',
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calcRecurringFixedTotal', () => {
  // today = Wednesday 2026-03-18 (getDay() = 3)
  const today = new Date('2026-03-18T12:00:00Z')
  const cycleEnd = '2026-03-25'  // 7 days window

  describe('weekdays', () => {
    it('counts matching weekdays from tomorrow to cycleEnd inclusive', () => {
      // today=Wed Mar 18; tomorrow=Thu Mar 19; cycleEnd=Wed Mar 25
      // Thursdays in window: Mar 19 → 1 occurrence
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [4] }) // Thu
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(50)
    })

    it('excludes today even if today matches the weekday', () => {
      // today=Wed; Wednesdays from tomorrow to Mar 25: Mar 25 → 1 occurrence
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [3] }) // Wed
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(50)
    })

    it('counts multiple weekdays', () => {
      // Mon=1: Mar 23; Fri=5: Mar 20 → 2 occurrences
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [1, 5] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(100)
    })

    it('returns 0 when no matching weekday in window', () => {
      // Sun=0: use cycleEnd=2026-03-21 (Mon); no Sunday from Mar 19 to Mar 21
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [0] }) // Sun
      expect(calcRecurringFixedTotal([expense], '2026-03-21', today)).toBe(0)
    })

    it('returns 0 for empty weekdays array', () => {
      const expense = fe({ recurrenceType: 'weekdays', recurrenceWeekdays: [] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('sums multiple expenses', () => {
      // Two expenses on Mon: 50 + 30 = 80
      const exp1 = fe({ amount: 50, recurrenceType: 'weekdays', recurrenceWeekdays: [1] })
      const exp2 = fe({ id: '2', amount: 30, recurrenceType: 'weekdays', recurrenceWeekdays: [1] })
      expect(calcRecurringFixedTotal([exp1, exp2], cycleEnd, today)).toBe(80)
    })
  })

  describe('specific dates', () => {
    it('counts specific dates strictly after today and within cycleEnd', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-19', '2026-03-22', '2026-03-25'],
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(150)
    })

    it('excludes today', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-18'], // today
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('excludes dates beyond cycleEnd', () => {
      const expense = fe({
        recurrenceType: 'specific',
        recurrenceDates: ['2026-03-26', '2026-03-30'],
      })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })

    it('returns 0 for empty dates array', () => {
      const expense = fe({ recurrenceType: 'specific', recurrenceDates: [] })
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('returns 0 for empty list', () => {
      expect(calcRecurringFixedTotal([], cycleEnd, today)).toBe(0)
    })

    it('ignores expenses without recurrenceType', () => {
      const expense = fe({ billingDay: 20 }) // no recurrenceType
      expect(calcRecurringFixedTotal([expense], cycleEnd, today)).toBe(0)
    })
  })
})

describe('calculateForecast — recurring fixed expenses', () => {
  // today = Wednesday 2026-03-19
  const today = new Date('2026-03-19T12:00:00Z')
  const currentMonth = '2026-03'

  const card: CreditCard = {
    id: 'c1',
    name: 'Nubank',
    closingDay: 10,   // cycle: Mar 10 → Apr 9
    paymentDay: 17,
    currentBill: 200,
    createdAt: '2026-01-01T00:00:00Z',
  }

  const baseParams = {
    today,
    incomes: [] as Income[],
    expenses: [] as Expense[],
    fixedExpenses: [] as FixedExpense[],
    creditCard: card,
    manualBalance: 1000,
    monthlyGoal: 0,
    currentMonth,
  }

  it('monthly fixed expenses (no recurrenceType) still use billingDay logic', () => {
    const monthly = fe({ billingDay: 25, amount: 100 }) // day 25 > today(19) → pending
    const result = calculateForecast({ ...baseParams, fixedExpenses: [monthly] })
    expect(result.fixedPending).toBe(100)
    expect(result.fixedRecurring).toBe(0)
    expect(result.fixedRecurringCard).toBe(0)
    expect(result.fixedRecurringCash).toBe(0)
  })

  it('card recurring expense contributes to cardBillForecast, not realAccountBalance', () => {
    // cycleEnd = Apr 9; today = Mar 19; Mondays from Mar 20 to Apr 9: Mar 23, Mar 30, Apr 6 → 3
    const recurring = fe({
      recurrenceType: 'weekdays',
      recurrenceWeekdays: [1], // Mon
      amount: 50,
      paymentMethod: 'card',
    })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [recurring] })
    expect(result.fixedRecurringCard).toBe(150)   // 3 × 50
    expect(result.fixedRecurringCash).toBe(0)
    expect(result.fixedRecurring).toBe(150)
    // cardBillForecast = 200 (currentBill) + 0 (fixedPending) + 150 (recurringCard) + 0 (cycleExpensesCard)
    expect(result.cardBillForecast).toBe(350)
    // realAccountBalance unaffected by card recurring
    expect(result.realAccountBalance).toBe(1000)
  })

  it('cash recurring expense reduces realAccountBalance, not cardBillForecast', () => {
    const recurring = fe({
      recurrenceType: 'weekdays',
      recurrenceWeekdays: [1], // Mon → 3 occurrences
      amount: 50,
      paymentMethod: 'cash',
    })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [recurring] })
    expect(result.fixedRecurringCard).toBe(0)
    expect(result.fixedRecurringCash).toBe(150)
    // cardBillForecast unaffected
    expect(result.cardBillForecast).toBe(200)
    // realAccountBalance = 1000 - 150
    expect(result.realAccountBalance).toBe(850)
  })

  it('totalFixedActive covers only monthly fixed; invariant holds', () => {
    const monthly = fe({ billingDay: 5, amount: 100 })  // already billed (day 5 < 19)
    const recurring = fe({ id: '2', recurrenceType: 'weekdays', recurrenceWeekdays: [1], amount: 50 })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [monthly, recurring] })
    expect(result.totalFixedActive).toBe(100)            // only monthly
    expect(result.fixedAlreadyBilled).toBe(100)          // day 5 <= 19
    expect(result.fixedPending).toBe(0)
    // invariant: alreadyBilled + pending === totalFixedActive
    expect(result.fixedAlreadyBilled + result.fixedPending).toBe(result.totalFixedActive)
  })

  it('cash recurring expense reduces quantoPodeGastar', () => {
    const recurring = fe({
      recurrenceType: 'weekdays',
      recurrenceWeekdays: [1], // Mon → 3 occurrences (Mar 23, Mar 30, Apr 6)
      amount: 50,
      paymentMethod: 'cash',
    })
    const result = calculateForecast({ ...baseParams, fixedExpenses: [recurring] })
    // quantoPodeGastar = 1000 + 0 (incomeBeforePayment) - 200 (cardBill) - 0 (cycleExpensesCash) - 150 (fixedRecurringCash) - 0 (goal)
    expect(result.quantoPodeGastar).toBe(650)
  })
})
