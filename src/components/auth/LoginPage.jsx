import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Flame } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Email ou mot de passe incorrect.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Logo Paroisse" className="w-20 h-20 object-contain mb-1" />
          <h1 className="text-2xl font-serif font-bold text-stone-800">Gestion de Stock Paroisse</h1>
          <p className="text-stone-500 text-sm mt-1">Connectez-vous pour accéder au stock</p>
        </div>

        {/* Champs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="votre@email.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full mt-6"
          onClick={handleSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>

        <p className="text-center text-xs text-stone-400 mt-4">
          Accès réservé — contactez un administrateur pour obtenir un compte.
        </p>
      </div>
    </div>
  )
}
