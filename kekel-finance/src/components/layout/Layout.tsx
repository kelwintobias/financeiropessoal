import { Outlet } from 'react-router-dom'
import BottomNav from '@/components/layout/BottomNav'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-lg mx-auto px-4 pt-4 pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
