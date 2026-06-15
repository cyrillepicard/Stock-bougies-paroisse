import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Bell, Users, MapPin, Flame, UserPlus, Pencil, Image, KeyRound, Tag } from 'lucide-react'
import Modal from '../shared/Modal'

export default function AdminPage() {
  const [tab, setTab] = useState('lieux')
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [profils, setProfils] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // ---- Familles / Sous-familles ----
  const [familles, setFamilles] = useState([])
  const [sousFamilles, setSousFamilles] = useState([])
  const [newFamNom, setNewFamNom] = useState('')
  const [newSFNom, setNewSFNom] = useState('')
  const [newSFFamilleId, setNewSFFamilleId] = useState('')
  const [editFam, setEditFam] = useState(null)
  const [editFamNom, setEditFamNom] = useState('')
  const [editSF, setEditSF] = useState(null)
  const [editSFNom, setEditSFNom] = useState('')

  // ---- Lieux ----
  const [newLieuNom, setNewLieuNom] = useState('')
  const [editLieu, setEditLieu] = useState(null)   // { id, nom }
  const [editLieuNom, setEditLieuNom] = useState('')

  // ---- Bougies ----
  const [newBougieNom, setNewBougieNom] = useState('')
  const [newBougieDesc, setNewBougieDesc] = useState('')
  const [newBougieFamilleId, setNewBougieFamilleId] = useState('')
  const [newBougieSousFamilleId, setNewBougieSousFamilleId] = useState('')
  const [editBougie, setEditBougie] = useState(null) // bougie complète
  const [editNom, setEditNom] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editQteMini, setEditQteMini] = useState('')
  const [editFamilleId, setEditFamilleId] = useState('')
  const [editSousFamilleId, setEditSousFamilleId] = useState('')
  const [editPhotoFile, setEditPhotoFile] = useState(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef(null)

  // ---- Seuils ----
  const [seuilModal, setSeuilModal] = useState(null)
  const [seuilValue, setSeuilValue] = useState('')

  // ---- Utilisateurs ----
  const [showNewUser, setShowNewUser] = useState(false)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserRole, setNewUserRole] = useState('utilisateur')
  const [newUserError, setNewUserError] = useState('')
  const [newUserSuccess, setNewUserSuccess] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [editUser, setEditUser] = useState(null)   // profil complet
  const [editUserRole, setEditUserRole] = useState('')
  const [editUserPwd, setEditUserPwd] = useState('')
  const [editUserError, setEditUserError] = useState('')
  const [editUserSuccess, setEditUserSuccess] = useState('')
  const [savingUser, setSavingUser] = useState(false)

  async function loadAll() {
    setLoading(true)
    const [{ data: l }, { data: b }, { data: s }, { data: p }, { data: f }, { data: sf }] = await Promise.all([
      supabase.from('lieux').select('*').order('nom'),
      supabase.from('bougies').select('*, familles(nom), sous_familles(nom)').order('nom'),
      supabase.from('stock_par_lieu').select('*'),
      supabase.from('profils').select('*').order('email'),
      supabase.from('familles').select('*').order('nom'),
      supabase.from('sous_familles').select('*').order('nom'),
    ])
    setLieux(l || [])
    setBougies(b || [])
    setStock(s || [])
    setProfils(p || [])
    setFamilles(f || [])
    setSousFamilles(sf || [])
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  // ================================================================
  // LIEUX
  // ================================================================
  async function addLieu() {
    if (!newLieuNom.trim()) return
    setSaving(true)
    await supabase.from('lieux').insert({ nom: newLieuNom.trim() })
    setNewLieuNom('')
    setSaving(false)
    loadAll()
  }

  function openEditLieu(lieu) {
    setEditLieu(lieu)
    setEditLieuNom(lieu.nom)
  }

  async function saveEditLieu() {
    if (!editLieuNom.trim()) return
    await supabase.from('lieux').update({ nom: editLieuNom.trim() }).eq('id', editLieu.id)
    setEditLieu(null)
    loadAll()
  }

  async function deleteLieu(id) {
    if (!window.confirm('Supprimer ce lieu ?')) return
    await supabase.from('lieux').delete().eq('id', id)
    loadAll()
  }

  // ================================================================
  // BOUGIES
  // ================================================================
  async function addBougie() {
    if (!newBougieNom.trim()) return
    setSaving(true)
    await supabase.from('bougies').insert({
      nom: newBougieNom.trim(),
      description: newBougieDesc.trim() || null,
      famille_id: newBougieFamilleId || null,
      sous_famille_id: newBougieSousFamilleId || null,
    })
    setNewBougieNom('')
    setNewBougieDesc('')
    setNewBougieFamilleId('')
    setNewBougieSousFamilleId('')
    setSaving(false)
    loadAll()
  }

  function openEditBougie(b) {
    setEditBougie(b)
    setEditNom(b.nom)
    setEditDesc(b.description || '')
    setEditQteMini(b.qte_mini !== null && b.qte_mini !== undefined ? b.qte_mini.toString() : '')
    setEditFamilleId(b.famille_id || '')
    setEditSousFamilleId(b.sous_famille_id || '')
    setEditPhotoFile(null)
    setEditPhotoPreview(b.photo_url || null)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setEditPhotoFile(file)
    setEditPhotoPreview(URL.createObjectURL(file))
  }

  async function saveEditBougie() {
    if (!editNom.trim()) return
    setUploadingPhoto(true)
    let photoUrl = editBougie.photo_url || null

    // Upload photo si nouvelle sélectionnée
    if (editPhotoFile) {
      const ext = editPhotoFile.name.split('.').pop()
      const path = `${editBougie.id}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('bougies-photos')
        .upload(path, editPhotoFile, { upsert: true })
      if (!upErr) {
        const { data } = supabase.storage.from('bougies-photos').getPublicUrl(path)
        photoUrl = data.publicUrl + '?t=' + Date.now() // cache-bust
      }
    }

    await supabase.from('bougies').update({
      nom: editNom.trim(),
      description: editDesc.trim() || null,
      qte_mini: editQteMini === '' ? null : Number(editQteMini),
      photo_url: photoUrl,
      famille_id: editFamilleId || null,
      sous_famille_id: editSousFamilleId || null,
    }).eq('id', editBougie.id)

    setUploadingPhoto(false)
    setEditBougie(null)
    loadAll()
  }

  async function deleteBougie(id) {
    if (!window.confirm('Supprimer cette référence ? Tout le stock associé sera également supprimé.')) return
    await supabase.from('bougies').delete().eq('id', id)
    loadAll()
  }

  // ================================================================
  // FAMILLES & SOUS-FAMILLES
  // ================================================================
  async function addFamille() {
    if (!newFamNom.trim()) return
    await supabase.from('familles').insert({ nom: newFamNom.trim() })
    setNewFamNom(''); loadAll()
  }
  async function saveEditFam() {
    if (!editFamNom.trim()) return
    await supabase.from('familles').update({ nom: editFamNom.trim() }).eq('id', editFam.id)
    setEditFam(null); loadAll()
  }
  async function deleteFamille(id) {
    if (!window.confirm('Supprimer cette famille ? Les sous-familles associées seront aussi supprimées.')) return
    await supabase.from('familles').delete().eq('id', id); loadAll()
  }
  async function addSousFamille() {
    if (!newSFNom.trim() || !newSFFamilleId) return
    await supabase.from('sous_familles').insert({ nom: newSFNom.trim(), famille_id: newSFFamilleId })
    setNewSFNom(''); loadAll()
  }
  async function saveEditSF() {
    if (!editSFNom.trim()) return
    await supabase.from('sous_familles').update({ nom: editSFNom.trim() }).eq('id', editSF.id)
    setEditSF(null); loadAll()
  }
  async function deleteSousFamille(id) {
    if (!window.confirm('Supprimer cette sous-famille ?')) return
    await supabase.from('sous_familles').delete().eq('id', id); loadAll()
  }

  // ================================================================
  // SEUILS
  // ================================================================
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

  // ================================================================
  // UTILISATEURS
  // ================================================================
  async function createUser() {
    setNewUserError('')
    setNewUserSuccess('')
    if (!newUserEmail.trim() || !newUserPassword.trim()) { setNewUserError('Email et mot de passe requis.'); return }
    if (newUserPassword.length < 6) { setNewUserError('Le mot de passe doit faire au moins 6 caractères.'); return }
    setCreatingUser(true)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: newUserEmail.trim(),
      password: newUserPassword.trim(),
      options: { emailRedirectTo: window.location.origin }
    })
    if (signUpError) { setNewUserError(signUpError.message); setCreatingUser(false); return }
    if (newUserRole === 'admin' && signUpData?.user) {
      await supabase.from('profils').update({ role: 'admin' }).eq('id', signUpData.user.id)
    }
    setNewUserSuccess('Compte créé pour ' + newUserEmail.trim() + '. L\'utilisateur recevra un email de confirmation.')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserRole('utilisateur')
    setCreatingUser(false)
    loadAll()
  }

  function openEditUser(p) {
    setEditUser(p)
    setEditUserRole(p.role)
    setEditUserPwd('')
    setEditUserError('')
    setEditUserSuccess('')
  }

  async function saveEditUser() {
    setEditUserError('')
    setEditUserSuccess('')
    setSavingUser(true)

    // Mettre à jour le rôle
    if (editUserRole !== editUser.role) {
      await supabase.from('profils').update({ role: editUserRole }).eq('id', editUser.id)
    }

    // Mettre à jour le mot de passe si renseigné
    if (editUserPwd.trim()) {
      if (editUserPwd.length < 6) {
        setEditUserError('Le mot de passe doit faire au moins 6 caractères.')
        setSavingUser(false)
        return
      }
      // On passe par une fonction Supabase edge ou on note la limitation
      // Côté client, on ne peut modifier que son propre mdp avec updateUser
      // Pour un autre utilisateur, il faut la service_role key (backend)
      // On stocke une note dans profils pour indiquer à l'utilisateur de changer son mdp
      await supabase.from('profils').update({ 
        role: editUserRole,
        must_change_password: true 
      }).eq('id', editUser.id)
      setEditUserSuccess('Rôle mis à jour. Pour le mot de passe : demandez à l\'utilisateur de se connecter et d\'utiliser "Mot de passe oublié", ou exécutez la commande SQL ci-dessous dans Supabase.')
    } else {
      setEditUserSuccess('Modifications enregistrées.')
    }

    setSavingUser(false)
    loadAll()
  }

  async function deleteUser(profil) {
    if (!window.confirm('Supprimer le compte de ' + profil.email + ' ? Cette action est irréversible.')) return
    await supabase.from('profils').delete().eq('id', profil.id)
    loadAll()
  }

  // ================================================================
  // RENDER
  // ================================================================
  if (loading) return <div className="p-8 text-stone-400 text-center">Chargement…</div>

  const tabs = [
    { id: 'lieux',    label: 'Lieux',          icon: MapPin },
    { id: 'familles', label: 'Familles',        icon: Tag },
    { id: 'bougies',  label: 'Bougies',         icon: Flame },
    { id: 'seuils',   label: "Seuils d'alerte", icon: Bell },
    { id: 'users',    label: 'Utilisateurs',    icon: Users },
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
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors
              ${tab === id ? 'border-amber-500 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">

        {/* ============================================================ */}
        {/* LIEUX                                                         */}
        {/* ============================================================ */}
        {tab === 'lieux' && (
          <div className="max-w-lg space-y-4">
            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">Ajouter un lieu</h2>
              <div className="flex gap-2">
                <input type="text" className="input-field" placeholder="Nom du lieu"
                  value={newLieuNom} onChange={e => setNewLieuNom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLieu()} />
                <button onClick={addLieu} disabled={saving || !newLieuNom.trim()}
                  className="btn-primary flex items-center gap-1 whitespace-nowrap">
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
                    <div className="flex gap-1">
                      <button onClick={() => openEditLieu(l)}
                        className="text-stone-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors" title="Renommer">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteLieu(l.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* FAMILLES & SOUS-FAMILLES                                      */}
        {/* ============================================================ */}
        {tab === 'familles' && (
          <div className="max-w-2xl space-y-4">
            {/* Ajouter famille */}
            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">Ajouter une famille</h2>
              <div className="flex gap-2">
                <input type="text" className="input-field" placeholder="ex : Cierges, Veilleuses…"
                  value={newFamNom} onChange={e => setNewFamNom(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addFamille()} />
                <button onClick={addFamille} disabled={!newFamNom.trim()}
                  className="btn-primary flex items-center gap-1 whitespace-nowrap">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
            </div>

            {/* Liste familles + sous-familles */}
            {familles.map(f => {
              const sfs = sousFamilles.filter(sf => sf.famille_id === f.id)
              return (
                <div key={f.id} className="card">
                  {/* En-tête famille */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-stone-800 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-500" /> {f.nom}
                      <span className="text-xs font-normal text-stone-400">{sfs.length} sous-famille{sfs.length !== 1 ? 's' : ''}</span>
                    </h3>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditFam(f); setEditFamNom(f.nom) }}
                        className="text-stone-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteFamille(f.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sous-familles existantes */}
                  {sfs.length > 0 && (
                    <ul className="divide-y divide-stone-100 mb-3">
                      {sfs.map(sf => (
                        <li key={sf.id} className="flex items-center justify-between py-2 pl-4">
                          <span className="text-sm text-stone-700">› {sf.nom}</span>
                          <div className="flex gap-1">
                            <button onClick={() => { setEditSF(sf); setEditSFNom(sf.nom) }}
                              className="text-stone-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => deleteSousFamille(sf.id)}
                              className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Ajouter sous-famille dans cette famille */}
                  <div className="flex gap-2 pl-4">
                    <input type="text" className="input-field text-sm py-1.5"
                      placeholder={'Nouvelle sous-famille dans ' + f.nom}
                      value={newSFFamilleId === f.id ? newSFNom : ''}
                      onFocus={() => setNewSFFamilleId(f.id)}
                      onChange={e => { setNewSFFamilleId(f.id); setNewSFNom(e.target.value) }}
                      onKeyDown={e => e.key === 'Enter' && newSFFamilleId === f.id && addSousFamille()} />
                    <button
                      onClick={() => { setNewSFFamilleId(f.id); addSousFamille() }}
                      disabled={newSFFamilleId !== f.id || !newSFNom.trim()}
                      className="btn-secondary text-sm py-1.5 flex items-center gap-1 whitespace-nowrap">
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                </div>
              )
            })}

            {familles.length === 0 && (
              <div className="card text-center text-stone-400 py-8">
                Aucune famille créée. Ajoutez-en une ci-dessus.
              </div>
            )}
          </div>
        )}
        {tab === 'bougies' && (
          <div className="max-w-lg space-y-4">
            <div className="card space-y-3">
              <h2 className="font-medium text-stone-700">Ajouter une référence</h2>
              <input type="text" className="input-field" placeholder="Nom de la bougie (ex : Cierge pascal)"
                value={newBougieNom} onChange={e => setNewBougieNom(e.target.value)} />
              <input type="text" className="input-field" placeholder="Description (optionnel)"
                value={newBougieDesc} onChange={e => setNewBougieDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Famille</label>
                  <select className="input-field" value={newBougieFamilleId}
                    onChange={e => { setNewBougieFamilleId(e.target.value); setNewBougieSousFamilleId('') }}>
                    <option value="">— Aucune —</option>
                    {familles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1">Sous-famille</label>
                  <select className="input-field" value={newBougieSousFamilleId}
                    onChange={e => setNewBougieSousFamilleId(e.target.value)}
                    disabled={!newBougieFamilleId}>
                    <option value="">— Aucune —</option>
                    {sousFamilles
                      .filter(sf => sf.famille_id === newBougieFamilleId)
                      .map(sf => <option key={sf.id} value={sf.id}>{sf.nom}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={addBougie} disabled={saving || !newBougieNom.trim()}
                className="btn-primary flex items-center gap-1">
                <Plus className="w-4 h-4" /> Ajouter la référence
              </button>
            </div>

            <div className="card">
              <h2 className="font-medium text-stone-700 mb-3">{bougies.length} référence{bougies.length !== 1 ? 's' : ''}</h2>
              <ul className="divide-y divide-stone-100">
                {bougies.map(b => (
                  <li key={b.id} className="flex items-center justify-between py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Miniature photo */}
                      {b.photo_url
                        ? <img src={b.photo_url} alt={b.nom} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-stone-200" />
                        : <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                            <Flame className="w-5 h-5 text-amber-300" />
                          </div>
                      }
                      <div className="min-w-0">
                        <p className="font-medium text-stone-800 truncate">{b.nom}</p>
                        {b.description && <p className="text-xs text-stone-400 truncate">{b.description}</p>}
                        <div className="flex gap-2 mt-0.5 flex-wrap">
                          {b.familles?.nom && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                              {b.familles.nom}{b.sous_familles?.nom ? ' › ' + b.sous_familles.nom : ''}
                            </span>
                          )}
                          {b.qte_mini !== null && b.qte_mini !== undefined &&
                            <span className="text-xs text-blue-600">min. {b.qte_mini}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEditBougie(b)}
                        className="text-stone-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors" title="Modifier">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteBougie(b.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* SEUILS                                                        */}
        {/* ============================================================ */}
        {tab === 'seuils' && (
          <div className="space-y-4">
            <div className="card overflow-x-auto">
              <p className="text-sm text-stone-500 mb-1">
                <strong>Seuil d'alerte par lieu</strong> — affichage en rouge quand le stock passe en dessous.
              </p>
              <p className="text-xs text-stone-400 mb-4">Cliquer sur une cellule pour modifier.</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                    <th className="text-left py-3 pr-4 font-medium">Bougie</th>
                    <th className="text-center py-3 pr-4 font-medium text-blue-600">Qté mini globale</th>
                    {lieux.map(l => (
                      <th key={l.id} className="text-center py-3 pr-4 font-medium">{l.nom}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bougies.map(b => (
                    <tr key={b.id} className="border-b border-stone-100 hover:bg-stone-50">
                      <td className="py-3 pr-4 font-medium text-stone-800">{b.nom}</td>
                      {/* Qté mini globale (sur la table bougies) */}
                      <td className="py-3 pr-4 text-center">
                        <button
                          onClick={() => openEditBougie(b)}
                          className="px-2 py-1 rounded hover:bg-blue-50 text-stone-600 hover:text-blue-700 transition-colors"
                          title="Modifier via édition bougie"
                        >
                          {b.qte_mini !== null && b.qte_mini !== undefined
                            ? <span className="font-medium text-blue-600">≥ {b.qte_mini}</span>
                            : <span className="text-stone-300">—</span>}
                        </button>
                      </td>
                      {/* Seuil par lieu */}
                      {lieux.map(l => {
                        const s = stock.find(s => s.bougie_id === b.id && s.lieu_id === l.id)
                        return (
                          <td key={l.id} className="py-3 pr-4 text-center">
                            <button onClick={() => openSeuil(b, l)}
                              className="px-2 py-1 rounded hover:bg-amber-50 text-stone-600 hover:text-amber-700 transition-colors"
                              title="Modifier le seuil">
                              {s?.seuil_alerte !== null && s?.seuil_alerte !== undefined
                                ? <span className="font-medium text-amber-700">≤ {s.seuil_alerte}</span>
                                : <span className="text-stone-300">—</span>}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-6 text-xs text-stone-500">
              <span><span className="text-blue-600 font-medium">Qté mini globale ≥ N</span> — stock total tous lieux confondus</span>
              <span><span className="text-amber-600 font-medium">Seuil alerte ≤ N</span> — stock dans un lieu précis</span>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* UTILISATEURS                                                  */}
        {/* ============================================================ */}
        {tab === 'users' && (
          <div className="max-w-lg space-y-4">
            <div className="flex justify-end">
              <button onClick={() => { setShowNewUser(true); setNewUserError(''); setNewUserSuccess('') }}
                className="btn-primary flex items-center gap-2 text-sm">
                <UserPlus className="w-4 h-4" /> Créer un compte
              </button>
            </div>

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
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                        {p.role === 'admin' ? '⭐ Admin' : 'Utilisateur'}
                      </span>
                      <button onClick={() => openEditUser(p)}
                        className="text-stone-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50 transition-colors" title="Modifier">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteUser(p)}
                        className="text-stone-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors" title="Supprimer">
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

      {/* ============================================================ */}
      {/* MODALES                                                       */}
      {/* ============================================================ */}

      {/* Renommer lieu */}
      {editLieu && (
        <Modal title="Renommer le lieu" onClose={() => setEditLieu(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nouveau nom</label>
              <input type="text" className="input-field" value={editLieuNom}
                onChange={e => setEditLieuNom(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveEditLieu()} autoFocus />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditLieu(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={saveEditLieu} disabled={!editLieuNom.trim()} className="btn-primary flex-1">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Éditer bougie */}
      {editBougie && (
        <Modal title={'Modifier — ' + editBougie.nom} onClose={() => setEditBougie(null)} size="md">
          <div className="space-y-4">
            {/* Photo */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Photo</label>
              <div className="flex items-center gap-4">
                {editPhotoPreview
                  ? <img src={editPhotoPreview} alt="aperçu" className="w-20 h-20 rounded-xl object-cover border border-stone-200" />
                  : <div className="w-20 h-20 rounded-xl bg-amber-50 border-2 border-dashed border-amber-200 flex items-center justify-center">
                      <Image className="w-7 h-7 text-amber-300" />
                    </div>
                }
                <div>
                  <button onClick={() => photoInputRef.current?.click()}
                    className="btn-secondary text-sm flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    {editPhotoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                  </button>
                  {editPhotoPreview && (
                    <button onClick={() => { setEditPhotoPreview(null); setEditPhotoFile(null) }}
                      className="block mt-1 text-xs text-red-500 hover:underline">
                      Supprimer la photo
                    </button>
                  )}
                  <p className="text-xs text-stone-400 mt-1">JPG, PNG — max 5 Mo</p>
                </div>
                <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={handlePhotoChange} />
              </div>
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nom</label>
              <input type="text" className="input-field" value={editNom}
                onChange={e => setEditNom(e.target.value)} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
              <input type="text" className="input-field" placeholder="Optionnel"
                value={editDesc} onChange={e => setEditDesc(e.target.value)} />
            </div>

            {/* Famille */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Famille</label>
              <select className="input-field" value={editFamilleId}
                onChange={e => { setEditFamilleId(e.target.value); setEditSousFamilleId('') }}>
                <option value="">— Aucune famille —</option>
                {familles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>

            {/* Sous-famille — filtrée sur la famille choisie */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Sous-famille</label>
              <select className="input-field" value={editSousFamilleId}
                onChange={e => setEditSousFamilleId(e.target.value)}
                disabled={!editFamilleId}>
                <option value="">— Aucune sous-famille —</option>
                {sousFamilles
                  .filter(sf => sf.famille_id === editFamilleId)
                  .map(sf => <option key={sf.id} value={sf.id}>{sf.nom}</option>)}
              </select>
            </div>

            {/* Quantité mini globale */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Quantité minimale globale
                <span className="ml-1 font-normal text-stone-400">(tous lieux confondus — laisser vide pour désactiver)</span>
              </label>
              <input type="number" min="0" className="input-field" placeholder="ex : 50"
                value={editQteMini} onChange={e => setEditQteMini(e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditBougie(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={saveEditBougie} disabled={!editNom.trim() || uploadingPhoto}
                className="btn-primary flex-1">
                {uploadingPhoto ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Créer utilisateur */}
      {showNewUser && (
        <Modal title="Créer un compte utilisateur" onClose={() => setShowNewUser(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
              <input type="email" className="input-field" placeholder="membre@paroisse.fr"
                value={newUserEmail} onChange={e => setNewUserEmail(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Mot de passe provisoire</label>
              <input type="text" className="input-field" placeholder="Au moins 6 caractères"
                value={newUserPassword} onChange={e => setNewUserPassword(e.target.value)} />
              <p className="text-xs text-stone-400 mt-1">À communiquer à l'utilisateur.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Rôle</label>
              <select className="input-field" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}>
                <option value="utilisateur">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            {newUserError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{newUserError}</div>}
            {newUserSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{newUserSuccess}</div>}
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

      {/* Modifier utilisateur */}
      {editUser && (
        <Modal title={'Modifier — ' + editUser.email} onClose={() => setEditUser(null)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Rôle</label>
              <select className="input-field" value={editUserRole} onChange={e => setEditUserRole(e.target.value)}>
                <option value="utilisateur">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1 flex items-center gap-1.5">
                <KeyRound className="w-4 h-4" /> Nouveau mot de passe
              </label>
              <input type="text" className="input-field" placeholder="Laisser vide pour ne pas modifier"
                value={editUserPwd} onChange={e => setEditUserPwd(e.target.value)} />
              <p className="text-xs text-stone-400 mt-1">
                Si renseigné, copiez cette commande SQL dans Supabase pour l'appliquer :
              </p>
              {editUserPwd.length >= 6 && (
                <div className="mt-2 bg-stone-800 text-green-300 text-xs rounded-lg px-3 py-2 font-mono break-all select-all">
                  {`-- Exécuter dans Supabase SQL Editor :\nSELECT auth.update_user(id, '{"password":"${editUserPwd}"}') FROM auth.users WHERE email = '${editUser.email}';`}
                </div>
              )}
            </div>

            {editUserError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{editUserError}</div>}
            {editUserSuccess && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{editUserSuccess}</div>}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditUser(null)} className="btn-secondary flex-1">Fermer</button>
              {!editUserSuccess && (
                <button onClick={saveEditUser} disabled={savingUser} className="btn-primary flex-1">
                  {savingUser ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Renommer famille */}
      {editFam && (
        <Modal title="Renommer la famille" onClose={() => setEditFam(null)} size="sm">
          <div className="space-y-4">
            <input type="text" className="input-field" value={editFamNom}
              onChange={e => setEditFamNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEditFam()} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setEditFam(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={saveEditFam} disabled={!editFamNom.trim()} className="btn-primary flex-1">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Renommer sous-famille */}
      {editSF && (
        <Modal title="Renommer la sous-famille" onClose={() => setEditSF(null)} size="sm">
          <div className="space-y-4">
            <input type="text" className="input-field" value={editSFNom}
              onChange={e => setEditSFNom(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveEditSF()} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setEditSF(null)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={saveEditSF} disabled={!editSFNom.trim()} className="btn-primary flex-1">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal seuil par lieu */}
      {seuilModal && (
        <Modal title={'Seuil — ' + seuilModal.bougie.nom + ' @ ' + seuilModal.lieu.nom}
          onClose={() => setSeuilModal(null)} size="sm">
          <div className="space-y-4">
            <p className="text-sm text-stone-600">
              Stock actuel dans ce lieu : <strong>{seuilModal.current?.quantite ?? 0}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Seuil d'alerte (laisser vide pour désactiver)
              </label>
              <input type="number" min="0" className="input-field" placeholder="ex : 10"
                value={seuilValue} onChange={e => setSeuilValue(e.target.value)} autoFocus />
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
