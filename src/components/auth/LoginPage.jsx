import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Flame } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setError('')
    setMessage('')
    setLoading(true)
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError('Email ou mot de passe incorrect.')
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 to-amber-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg border border-stone-200 w-full max-w-sm p-8">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-3">
            <Flame className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-800">Bougies Paroisse</h1>
          <p className="text-stone-500 text-sm mt-1">Gestion du stock de bougies</p>
        </div>

        {/* Onglets */}
        <div className="flex bg-stone-100 rounded-lg p-1 mb-6">
          <button
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'login' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}
            onClick={() => setMode('login')}
          >
            Connexion
          </button>
          <button
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === 'register' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500'}`}
            onClick={() => setMode('register')}
          >
            Créer un compte
          </button>
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

        {/* Messages */}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            {message}
          </div>
        )}

        <button
          className="btn-primary w-full mt-6"
          onClick={handleSubmit}
          disabled={loading || !email || !password}
        >
          {loading ? 'Chargement…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </div>
    </div>
  )
}
