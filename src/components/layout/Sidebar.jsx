import { BarChart3, History, Package, Settings, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const navItems = [
  { id: 'stock',     label: 'Stock',      icon: Package },
  { id: 'historique',label: 'Historique', icon: History },
  { id: 'transfert', label: 'Transfert',  icon: ArrowLeftRight },
  { id: 'admin',     label: 'Admin',      icon: Settings, adminOnly: true },
]

export default function Sidebar({ page, setPage }) {
  const { isAdmin } = useAuth()
  const items = navItems.filter(i => !i.adminOnly || isAdmin)

  return (
    <aside className="w-16 sm:w-52 bg-white border-r border-stone-200 flex flex-col py-4 shrink-0">
      <nav className="flex flex-col gap-1 px-2">
        {items.map(({ id, label, icon: Icon }) => {
          const active = page === id
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left
                ${active
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'text-stone-600 hover:bg-stone-100 border border-transparent'
                }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-amber-600' : 'text-stone-400'}`} />
              <span className="hidden sm:block">{label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
