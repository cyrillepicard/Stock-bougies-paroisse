import { Flame, LogOut, Shield, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export default function Navbar() {
  const { user, profil, isAdmin } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  return (
    <nav className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
          <Flame className="w-5 h-5 text-amber-600" />
        </div>
        <span className="font-serif font-bold text-stone-800 text-lg hidden sm:block">
          Bougies Paroisse
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-sm text-stone-500">
          {isAdmin
            ? <><Shield className="w-4 h-4 text-amber-600" /><span className="hidden sm:block text-amber-700 font-medium">Administrateur</span></>
            : <><User className="w-4 h-4" /><span className="hidden sm:block">{user?.email}</span></>
          }
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-red-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Déconnexion</span>
        </button>
      </div>
    </nav>
  )
}
