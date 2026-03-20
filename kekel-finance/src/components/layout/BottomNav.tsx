import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/',         icon: '🏠', label: 'Início'   },
  { to: '/income',   icon: '💰', label: 'Renda'    },
  { to: '/expenses', icon: '💸', label: 'Gastos'   },
  { to: '/fixed',    icon: '📋', label: 'Fixos'    },
  { to: '/goals',    icon: '🎯', label: 'Metas'    },
  { to: '/credit',   icon: '💳', label: 'Crédito'  },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
