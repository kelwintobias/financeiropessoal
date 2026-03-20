import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout'
import DashboardPage from '@/pages/DashboardPage'
import ExpensesPage from '@/pages/ExpensesPage'
import GoalsPage from '@/pages/GoalsPage'
import IncomePage from '@/pages/IncomePage'
import FixedExpensesPage from '@/pages/FixedExpensesPage'
import CardPage from '@/pages/CardPage'
import CreditPage from '@/pages/CreditPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="income" element={<IncomePage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="fixed" element={<FixedExpensesPage />} />
        <Route path="goals" element={<GoalsPage />} />
        <Route path="card" element={<CardPage />} />
        <Route path="credit" element={<CreditPage />} />
      </Route>
    </Routes>
  )
}
