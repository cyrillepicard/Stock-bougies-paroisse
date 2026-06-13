import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Bell, Users, MapPin, Flame, UserPlus } from 'lucide-react'
import Modal from '../shared/Modal'

export default function AdminPage() {
  const [tab, setTab] = useState('lieux')
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [profils, setProfils] = useState([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [newLieuNom, setNewLieuNom] = useState('')
  const [newBougieNom, setNewBougieNom] = useState('')
  const [newBougieDesc, setNewBougieDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [seuilModal, setSeuilModal] = useState(null) // { bougie, lieu, current }
  const [seuilValue, setSeuilValue] = useState('')

  // Création utilisateur
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('utilisateur')
  const [newUserError, setNewUserError] = useState('')
  const [newUserSuccess, setNewUserSuccess] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: l }, { data: b }, { data: s }, { data: p }] = await Promise.all([
      supabase.from('lieux').select('*').order('nom'),
      supabase.from('bougies').select('*').order('nom'),
      supabase.from('stock_par_lieu').select('*'),
      supabase.from('profils').select('*').order('email'),
    ])
    setLieux(l || [])
    setBougies(b || [])
    setStock(s || [])
    setProfils(p || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ---- LIEUX ----
  async function addLieu() {
    if (!newLieuNom.trim()) return
    setSaving(true)
    await supabase.from('lieux').insert({ nom: newLieuNom.trim() })
    setNewLieuNom('')
    setSaving(false)
    loadAll()
  }

  async function deleteLieu(id) {
    if (!window.confirm('Supprimer ce lieu ? Tout le stock et l\'historique associés seront conservés.')) return
    await supabase.from('lieux').delete().eq('id', id)
    loadAll()
  }

  // ---- BOUGIES ----
  async function addBougie() {
    if (!newBougieNom.trim()) return
    setSaving(true)
    await supabase.from('bougies').insert({ nom: newBougieNom.trim(), description: newBougieDesc.trim() || null })
    setNewBougieNom('')
    setNewBougieDesc('')
    setSaving(false)
    loadAll()
  }

  async function deleteBougie(id) {
    if (!window.confirm('Supprimer cette référence ? Tout le stock associé sera également supprimé.')) return
    await supabase.from('bougies').delete().eq('id', id)
    loadAll()
  }

  // ---- SEUILS ----
  function openSeuil(bougie, lieu) {
    const s = stock.find(s => s.bougie_id === bougie.id && s.lieu_id === lieu.id)
    setSeuilModal({ bougie, lieu, current: s })
    setSeuilValue(s?.seuil_alerte?.toString() ?? '')
  }

  async function saveSeuil() {
    const { bougie, lieu } = seuilModal
    const val = seuilValue === '' ? null : Number(seuilValue)
    const current = stock.find(s => s.bougie_id === bougie.id && s.lieu_id === lieu.id)

    await supabase.from('stock_par_lieu').upsert({
      bougie_id: bougie.id,
      lieu_id: lieu.id,
      quantite: current?.quantite || 0,
      seuil_alerte: val,
    }, { onConflict: 'bougie_id,lieu_id' })

    setSeuilModal(null)
    loadAll()
  }

  // ---- UTILISATEURS ----
  async function createUser() {
    setNewUserError('')
    setNewUserSuccess('')
    if (!newUserEmail.trim() || !newUserPassword.trim()) {
      setNewUserError('Email et mot de passe requis.')
      return
    }
    if (newUserPassword.length < 6) {
      setNewUserError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setCreatingUser(true)
    const { data, error } = await supabase.auth.admin
      ? // Tentative via admin API (nécessite service_role key, non disponible côté client)
        { data: null, error: { message: 'fallback' } }
      : { data: null, error: { message: 'fallback' } }

    // Fallback : création via signUp standard + mise à jour du rôle
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newUserEmail.trim(),
      password: newUserPassword.trim(),
      options: { emailRedirectTo: window.location.origin }
    })

    if (signUpError) {
      setNewUserError(signUpError.message)
      setCreatingUser(false)
      return
    }

    // Si rôle admin demandé, mettre à jour après création
    if (newUserRole === 'admin' && signUpData?.user) {
      await supabase.from('profils').update({ role: 'admin' }).eq('id', signUpData.user.id)
    }

    setNewUserSuccess(`Compte créé pour ${newUserEmail.trim()}. L'utilisateur recevra un email de confirmation.`)
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('utilisateur')
    setCreatingUser(false)
    loadAll()
  }

  async function deleteUser(profil) {
    if (!window.confirm(`Supprimer le compte de ${profil.email} ? Cette action est irréversible.`)) return
    await supabase.from('profils').delete().eq('id', profil.id)
    loadAll()
  }

  async function toggleRole(profil) {
    const newRole = profil.role === 'admin' ? 'utilisateur' : 'admin'
    await supabase.from('profils').update({ role: newRole }).eq('id', profil.id)
    loadAll()
  }

  if (loading) return <div className="p-8 text-stone-400 text-center">Chargement…</div>

  const tabs = [
    { id: 'lieux', label: 'Lieux', icon: MapPin },
    { id: 'bougies', label: 'Bougies', icon: Flame },
    { id: 'seuils', label: 'Seuils d\'alerte', icon: Bell },
    { id: 'users', label: 'Utilisateurs', icon: Users },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Administration</h1>
        <p className="text-stone-500 text-sm mt-0.5">Gestion des références, lieux, seuils et accès</p>
      </div>

      {/* Sous-onglets */}
      <div className="px-6 pt-4 flex gap-2 flex-wrap border-b border-stone-200 pb-0 bg-white">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === id ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* ---- LIEUX ---- */}
        {tab === 'lieux' && (
          <div className="max-w-lg space-y-4">
            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">Ajouter un lieu</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-field"
                  placeholder="Nom du lieu"
                  value={newLieuNom}
                  onChange={e => setNewLieuNom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLieu()}
                />
                <button onClick={addLieu} disabled={saving || !newLieuNom.trim()} className="btn-primary flex items-center gap-1 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">{lieux.length} lieu{lieux.length !== 1 ? 'x' : ''}</h2>
              <ul className="divide-y divide-stone-100">
                {lieux.map(l => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <span className="font-medium text-stone-800">{l.nom}</span>
                    <button
                      onClick={() => deleteLieu(l.id)}
                      className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---- BOUGIES ---- */}
        {tab === 'bougies' && (
          <div className="max-w-lg space-y-4">
            <div className="card space-y-3">
              <h2 className="font-medium text-stone-700">Ajouter une référence</h2>
              <input
                type="text"
                className="input-field"
                placeholder="Nom de la bougie (ex : Cierge pascal)"
                value={newBougieNom}
                onChange={e => setNewBougieNom(e.target.value)}
              />
              <input
                type="text"
                className="input-field"
                placeholder="Description (optionnel)"
                value={newBougieDesc}
                onChange={e => setNewBougieDesc(e.target.value)}
              />
              <button onClick={addBougie} disabled={saving || !newBougieNom.trim()} className="btn-primary flex items-center gap-1">
                <Plus className="w-4 h-4" /> Ajouter la référence
              </button>
            </div>

            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">{bougies.length} référence{bougies.length !== 1 ? 's' : ''}</h2>
              <ul className="divide-y divide-stone-100">
                {bougies.map(b => (
                  <li key={b.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-medium text-stone-800">{b.nom}</p>
                      {b.description && <p className="text-xs text-stone-400">{b.description}</p>}
                    </div>
                    <button
                      onClick={() => deleteBougie(b.id)}
                      className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ---- SEUILS ---- */}
        {tab === 'seuils' && (
          <div className="card overflow-x-auto">
            <p className="text-sm text-stone-500 mb-4">
              Cliquer sur une cellule pour définir le seuil d'alerte. En dessous de ce seuil, la quantité s'affiche en rouge.
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                  <th className="text-left py-3 pr-4 font-medium">Bougie</th>
                  {lieux.map(l => (
                    <th key={l.id} className="text-center py-3 pr-4 font-medium">{l.nom}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bougies.map(b => (
                  <tr key={b.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4 font-medium text-stone-800">{b.nom}</td>
                    {lieux.map(l => {
                      const s = stock.find(s => s.bougie_id === b.id && s.lieu_id === l.id)
                      return (
                        <td key={l.id} className="py-3 pr-4 text-center">
                          <button
                            onClick={() => openSeuil(b, l)}
                            className="px-2 py-1 rounded hover:bg-amber-50 text-stone-600 hover:text-amber-700 transition-colors"
                            title="Modifier le seuil"
                          >
                            {s?.seuil_alerte !== null && s?.seuil_alerte !== undefined
                              ? <span className="font-medium text-amber-700">≤ {s.seuil_alerte}</span>
                              : <span className="text-stone-300">—</span>
                            }
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- UTILISATEURS ---- */}
        {tab === 'users' && (
          <div className="max-w-lg space-y-4">
            {/* Bouton créer */}
            <div className="flex justify-end">
              <button
                onClick={() => { setShowNewUser(true); setNewUserError(''); setNewUserSuccess('') }}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <UserPlus className="w-4 h-4" /> Créer un compte
              </button>
            </div>

            {/* Liste */}
            <div className="card">
              <p className="text-sm text-stone-500 mb-3">
                {profils.length} compte{profils.length !== 1 ? 's' : ''} enregistré{profils.length !== 1 ? 's' : ''}
              </p>
              <ul className="divide-y divide-stone-100">
                {profils.map(p => (
                  <li key={p.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 text-sm truncate">{p.email}</p>
                      <p className="text-xs text-stone-400">
                        Créé le {new Date(p.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleRole(p)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                          p.role === 'admin'
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {p.role === 'admin' ? '⭐ Admin' : 'Utilisateur'}
                      </button>
                      <button
                        onClick={() => deleteUser(p)}
                        className="text-stone-300 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Supprimer ce compte"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Modal création utilisateur */}
      {showNewUser && (
        <Modal title="Créer un compte utilisateur" onClose={() => setShowNewUser(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input
                type="email"
                className="input-field"
                placeholder="membre@paroisse.fr"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe provisoire</label>
              <input
                type="text"
                className="input-field"
                placeholder="Au moins 6 caractères"
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
              />
              <p className="text-xs text-stone-400 mt-1">À communiquer à l'utilisateur, qui pourra le changer.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Rôle</label>
              <select className="input-field" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                <option value="utilisateur">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            {newUserError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{newUserError}</div>
            )}
            {newUserSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{newUserSuccess}</div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNewUser(false)} className="btn-secondary flex-1">Fermer</button>
              {!newUserSuccess && (
                <button onClick={createUser} disabled={creatingUser} className="btn-primary flex-1">
                  {creatingUser ? 'Création…' : 'Créer le compte'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Modal seuil */}
      {seuilModal && (
        <Modal
          title={`Seuil — ${seuilModal.bougie.nom} @ ${seuilModal.lieu.nom}`}
          onClose={() => setSeuilModal(null)}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Stock actuel : <strong>{seuilModal.current?.quantite ?? 0}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Seuil d'alerte (laisser vide pour désactiver)
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                placeholder="ex : 10"
                value={seuilValue}
                onChange={e => setSeuilValue(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setSeuilModal(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={saveSeuil} className="btn-primary flex-1">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
