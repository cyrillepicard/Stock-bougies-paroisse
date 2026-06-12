import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profil, setProfil] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchProfil(userId) {
    const { data } = await supabase
      .from('profils')
      .select('*')
      .eq('id', userId)
      .single()
    setProfil(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfil(session.user.id)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfil(session.user.id)
      } else {
        setProfil(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const isAdmin = profil?.role === 'admin'

  return (
    <AuthContext.Provider value={{ user, profil, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
