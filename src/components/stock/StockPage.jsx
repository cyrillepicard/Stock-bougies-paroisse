import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { AlertTriangle, Download, Upload, Plus, MapPin, Globe, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Tag, ChevronDown, ChevronRight } from 'lucide-react'
import Modal from '../shared/Modal'
import ImportCSV from './ImportCSV'
import Papa from 'papaparse'
import { groupByFamille } from '../../utils/groupByFamille'

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-30 inline" />
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 ml-1 text-amber-600 inline" />
    : <ArrowDown className="w-3 h-3 ml-1 text-amber-600 inline" />
}

function ThSort({ col, label, sortCol, sortDir, onSort, className = '' }) {
  return (
    <th className={'py-3 pr-4 font-medium cursor-pointer select-none hover:text-amber-700 transition-colors ' + className}
      onClick={() => onSort(col)}>
      {label}<SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  )
}

export default function StockPage() {
  const { isAdmin, user } = useAuth()
  const [view, setView] = useState('global')
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [familles, setFamilles] = useState([])
  const [sousFamilles, setSousFamilles] = useState([])
  const [selectedLieu, setSelectedLieu] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtres famille/sous-famille
  const [filterFamilleId, setFilterFamilleId] = useState('')
  const [filterSousFamilleId, setFilterSousFamilleId] = useState('')

  // Repliage — familles ouvertes par défaut, sous-familles fermées par défaut
  const [collapsedFamilles, setCollapsedFamilles] = useState(new Set())
  const [expandedSousFamilles, setExpandedSousFamilles] = useState(new Set())

  function toggleFamille(key) {
    setCollapsedFamilles(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  function toggleSousFamille(key) {
    setExpandedSousFamilles(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Tri
  const [sortColGlobal, setSortColGlobal] = useState('nom')
  const [sortDirGlobal, setSortDirGlobal] = useState('asc')
  const [sortColLieu, setSortColLieu] = useState('nom')
  const [sortDirLieu, setSortDirLieu] = useState('asc')

  // Modals
  const [modalType, setModalType] = useState(null) // 'entree' | 'edit'
  const [selectedRow, setSelectedRow] = useState(null)
  const [qte, setQte] = useState('')
  const [motif, setMotif] = useState('')
  const [editQte, setEditQte] = useState('')  // pour le stylo admin
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: b }, { data: s }, { data: f }, { data: sf }] = await Promise.all([
      supabase.from('lieux').select('*').order('nom'),
      supabase.from('bougies').select('*, familles(nom), sous_familles(nom)').order('nom'),
      supabase.from('stock_par_lieu').select('*, bougies(nom, description, famille_id, sous_famille_id, familles(nom), sous_familles(nom)), lieux(nom)'),
      supabase.from('familles').select('*').order('nom'),
      supabase.from('sous_familles').select('*').order('nom'),
    ])
    setLieux(l || [])
    setBougies(b || [])
    setStock(s || [])
    setFamilles(f || [])
    setSousFamilles(sf || [])
    if (!selectedLieu && l?.length) setSelectedLieu(l[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ---- Helpers tri ----
  function applySort(arr, col, dir) {
    return [...arr].sort((a, b) => {
      let va = a[col], vb = b[col]
      if (va == null) va = ''
      if (vb == null) vb = ''
      if (typeof va === 'string') return dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      return dir === 'asc' ? va - vb : vb - va
    })
  }

  function toggleSort(col, current, setCol, setDir) {
    if (current === col) setDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCol(col); setDir('asc') }
  }

  // ---- Filtre famille/sous-famille ----
  function matchesFamFilter(bougie) {
    if (!filterFamilleId) return true
    if (bougie.famille_id !== filterFamilleId) return false
    if (filterSousFamilleId && bougie.sous_famille_id !== filterSousFamilleId) return false
    return true
  }

  // ---- Vue globale ----
  function getGlobalStock() {
    const totals = {}
    bougies.filter(matchesFamFilter).forEach(b => {
      totals[b.id] = { bougie: b, nom: b.nom, description: b.description || '', total: 0, parLieu: {}, alertes: [] }
    })
    stock.forEach(s => {
      if (!totals[s.bougie_id]) return
      totals[s.bougie_id].total += s.quantite
      totals[s.bougie_id].parLieu[s.lieu_id] = { qte: s.quantite, seuil: s.seuil_alerte }
      if (s.seuil_alerte !== null && s.quantite <= s.seuil_alerte)
        totals[s.bougie_id].alertes.push(s.lieux?.nom)
    })
    const arr = Object.values(totals).map(r => ({ ...r, total: r.total }))
    return applySort(arr, sortColGlobal, sortDirGlobal)
  }

  // ---- Vue par lieu ----
  function getLieuStock() {
    const rows = stock
      .filter(s => s.lieu_id === selectedLieu && matchesFamFilter(s.bougies || {}))
      .map(s => ({
        ...s,
        nom: s.bougies?.nom || '',
        description: s.bougies?.description || '',
        famille_id: s.bougies?.famille_id,
        sous_famille_id: s.bougies?.sous_famille_id,
        familles: s.bougies?.familles,
        sous_familles: s.bougies?.sous_familles,
        alerte: s.seuil_alerte !== null && s.quantite <= s.seuil_alerte,
      }))
    return applySort(rows, sortColLieu, sortDirLieu)
  }

  // ---- Mouvement entrée (depuis tableau) ----
  async function handleEntree() {
    if (!qte || isNaN(Number(qte)) || Number(qte) <= 0) return
    setSaving(true)
    const qty = Number(qte)
    const { data: current } = await supabase
      .from('stock_par_lieu').select('*')
      .eq('bougie_id', selectedRow.bougie_id).eq('lieu_id', selectedRow.lieu_id).single()
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: selectedRow.bougie_id, lieu_id: selectedRow.lieu_id,
      quantite: (current?.quantite || 0) + qty,
      seuil_alerte: current?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })
    await supabase.from('mouvements').insert({
      bougie_id: selectedRow.bougie_id, lieu_id: selectedRow.lieu_id,
      type: 'entree', quantite: qty, motif: motif || null, user_email: user?.email,
    })
    closeModal(); loadData()
  }

  // ---- Stylo admin : correction directe du stock ----
  async function handleEditStock() {
    if (editQte === '' || isNaN(Number(editQte)) || Number(editQte) < 0) return
    setSaving(true)
    const newQte = Number(editQte)
    const { data: current } = await supabase
      .from('stock_par_lieu').select('*')
      .eq('bougie_id', selectedRow.bougie_id).eq('lieu_id', selectedRow.lieu_id).single()
    const diff = newQte - (current?.quantite || 0)
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: selectedRow.bougie_id, lieu_id: selectedRow.lieu_id,
      quantite: newQte, seuil_alerte: current?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })
    // Enregistrer comme correction dans l'historique
    if (diff !== 0) {
      await supabase.from('mouvements').insert({
        bougie_id: selectedRow.bougie_id, lieu_id: selectedRow.lieu_id,
        type: diff > 0 ? 'entree' : 'sortie',
        quantite: Math.abs(diff),
        motif: 'Correction manuelle (admin)',
        user_email: user?.email,
      })
    }
    closeModal(); loadData()
  }

  function openModal(type, row) {
    setModalType(type); setSelectedRow(row)
    setQte(''); setMotif('')
    setEditQte(type === 'edit' ? (row.quantite?.toString() ?? '0') : '')
  }

  function closeModal() {
    setModalType(null); setSelectedRow(null)
    setQte(''); setMotif(''); setEditQte(''); setSaving(false)
  }

  // ---- Export CSV ----
  function exportCSV() {
    let rows = []
    if (view === 'global') {
      rows = getGlobalStock().map(g => ({
        Bougie: g.bougie.nom, Désignation: g.bougie.description || '',
        'Stock total': g.total, Alertes: g.alertes.join(', '),
      }))
    } else {
      rows = getLieuStock().map(s => ({
        Bougie: s.nom, Désignation: s.description,
        Lieu: lieux.find(l => l.id === selectedLieu)?.nom,
        Quantité: s.quantite, 'Seuil alerte': s.seuil_alerte ?? '—',
      }))
    }
    const csv = Papa.unparse(rows, { delimiter: ';' })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'stock_' + view + '_' + new Date().toISOString().slice(0,10) + '.csv'
    a.click()
  }

  if (loading) return <div className="p-8 text-stone-400 text-center">Chargement…</div>

  const globalData = getGlobalStock()
  const lieuData = getLieuStock()
  const currentLieu = lieux.find(l => l.id === selectedLieu)

  const onSortGlobal = (col) => toggleSort(col, sortColGlobal, setSortColGlobal, setSortDirGlobal)
  const onSortLieu   = (col) => toggleSort(col, sortColLieu,   setSortColLieu,   setSortDirLieu)

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-stone-200 bg-white flex flex-wrap items-center gap-3">
        <h1 className="font-serif font-bold text-xl text-stone-800 mr-auto">Stock Global</h1>
        {isAdmin && (
          <>
            <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <Upload className="w-4 h-4" /> Import CSV
            </button>
            <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </>
        )}
        {!isAdmin && (
          <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        )}
      </div>

      {/* Bascule vue + filtres */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-3 flex-wrap border-b border-stone-100">
        <div className="flex bg-stone-100 rounded-lg p-1 gap-1">
          <button onClick={() => setView('global')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${view === 'global' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>
            <Globe className="w-4 h-4" /> Vue globale
          </button>
          <button onClick={() => setView('lieu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${view === 'lieu' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>
            <MapPin className="w-4 h-4" /> Par lieu
          </button>
        </div>
        {view === 'lieu' && (
          <select className="input-field w-auto" value={selectedLieu || ''}
            onChange={e => setSelectedLieu(e.target.value)}>
            {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
        )}

        {/* Filtres famille / sous-famille */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <Tag className="w-4 h-4 text-amber-500 shrink-0" />
          <select className="input-field w-auto text-sm py-1.5" value={filterFamilleId}
            onChange={e => { setFilterFamilleId(e.target.value); setFilterSousFamilleId('') }}>
            <option value="">Toutes les familles</option>
            {familles.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select className="input-field w-auto text-sm py-1.5" value={filterSousFamilleId}
            onChange={e => setFilterSousFamilleId(e.target.value)}
            disabled={!filterFamilleId}>
            <option value="">Toutes les sous-familles</option>
            {sousFamilles.filter(sf => sf.famille_id === filterFamilleId).map(sf =>
              <option key={sf.id} value={sf.id}>{sf.nom}</option>
            )}
          </select>
          {(filterFamilleId || filterSousFamilleId) && (
            <button onClick={() => { setFilterFamilleId(''); setFilterSousFamilleId('') }}
              className="text-xs text-stone-400 hover:text-stone-600 underline whitespace-nowrap">
              Effacer
            </button>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto px-6 pb-6">

        {/* ---- VUE GLOBALE ---- */}
        {view === 'global' && (
          <div className="card mt-2 overflow-x-auto">
            <p className="text-xs text-stone-400 mb-3">Cliquer sur un en-tête pour trier</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                  <ThSort col="nom"         label="Article"       sortCol={sortColGlobal} sortDir={sortDirGlobal} onSort={onSortGlobal} className="text-left" />
                  <ThSort col="description" label="Désignation"  sortCol={sortColGlobal} sortDir={sortDirGlobal} onSort={onSortGlobal} className="text-left" />
                  <ThSort col="total"       label="Stock total"  sortCol={sortColGlobal} sortDir={sortDirGlobal} onSort={onSortGlobal} className="text-right" />
                  {lieux.map(l => (
                    <th key={l.id} className="text-right py-3 pr-4 font-medium">{l.nom}</th>
                  ))}
                  <th className="text-right py-3 font-medium">Alertes</th>
                </tr>
              </thead>
              <tbody>
                {globalData.length === 0 && (
                  <tr><td colSpan="10" className="py-8 text-center text-stone-400">Aucun article enregistré</td></tr>
                )}
                {groupByFamille(globalData).map(groupe => {
                  const famKey = groupe.nom
                  const famOpen = !collapsedFamilles.has(famKey)
                  return groupe.sousFamilles.map((sfGroup, sfIdx) => {
                    const sfKey = famKey + '|||' + (sfGroup.nom || '')
                    const sfOpen = !sfGroup.nom || expandedSousFamilles.has(sfKey)
                    return (
                      <>
                        {sfIdx === 0 && (
                          <tr key={'fam-' + famKey}
                            className="bg-amber-50 border-b border-amber-100 cursor-pointer select-none hover:bg-amber-100 transition-colors"
                            onClick={() => toggleFamille(famKey)}>
                            <td colSpan={4 + lieux.length} className="py-2 px-3">
                              <span className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wide">
                                {famOpen
                                  ? <ChevronDown className="w-3.5 h-3.5" />
                                  : <ChevronRight className="w-3.5 h-3.5" />}
                                <Tag className="w-3.5 h-3.5" /> {groupe.nom}
                                <span className="ml-auto font-normal text-amber-600 normal-case">
                                  {groupe.sousFamilles.reduce((n, sf) => n + sf.rows.length, 0)} article{groupe.sousFamilles.reduce((n, sf) => n + sf.rows.length, 0) !== 1 ? 's' : ''}
                                </span>
                              </span>
                            </td>
                          </tr>
                        )}
                        {famOpen && sfGroup.nom && (
                          <tr key={'sf-' + sfKey}
                            className="bg-stone-50 border-b border-stone-100 cursor-pointer select-none hover:bg-stone-100 transition-colors"
                            onClick={() => toggleSousFamille(sfKey)}>
                            <td colSpan={4 + lieux.length} className="py-1.5 pl-5 text-xs text-stone-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                {sfOpen
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronRight className="w-3 h-3" />}
                                {sfGroup.nom}
                                <span className="ml-1 text-stone-400">({sfGroup.rows.length})</span>
                              </span>
                            </td>
                          </tr>
                        )}
                        {famOpen && sfOpen && sfGroup.rows.map(({ bougie, total, parLieu, alertes, description }) => (
                          <tr key={bougie.id} className="border-b border-stone-100 hover:bg-stone-50">
                            <td className="py-3 pr-4 font-medium text-stone-800 pl-9">{bougie.nom}</td>
                            <td className="py-3 pr-4 text-stone-500 text-xs">{description || '—'}</td>
                            <td className="py-3 pr-4 text-right font-bold text-stone-700">{total}</td>
                            {lieux.map(l => {
                              const s = parLieu[l.id]
                              const isAlert = s && s.seuil !== null && s.qte <= s.seuil
                              const rowForLieu = {
                                bougie_id: bougie.id,
                                lieu_id: l.id,
                                quantite: s?.qte ?? 0,
                                seuil_alerte: s?.seuil ?? null,
                              }
                              return (
                                <td key={l.id} className="py-2 pr-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <span className={isAlert ? 'text-red-600 font-bold' : 'text-stone-600'}>
                                      {s ? s.qte : '—'}
                                    </span>
                                    {isAlert && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
                                    {isAdmin && (
                                      <button onClick={() => openModal('entree', rowForLieu)}
                                        title={`Entrée — ${l.nom}`}
                                        className="ml-1 flex items-center px-1.5 py-0.5 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs font-medium transition-colors">
                                        <Plus className="w-3 h-3" />
                                      </button>
                                    )}
                                    {isAdmin && (
                                      <button onClick={() => openModal('edit', rowForLieu)}
                                        title={`Correction — ${l.nom}`}
                                        className="flex items-center px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors">
                                        <Pencil className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              )
                            })}
                            <td className="py-3 text-right">
                              {alertes.length > 0
                                ? <span className="badge-alert">⚠ {alertes.join(', ')}</span>
                                : <span className="badge-ok">OK</span>}
                            </td>
                          </tr>
                        ))}
                      </>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- VUE PAR LIEU ---- */}
        {view === 'lieu' && (
          <div className="card mt-2 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium text-stone-700">
                {currentLieu?.nom} — {lieuData.length} référence{lieuData.length !== 1 ? 's' : ''}
              </h2>
              <p className="text-xs text-stone-400">Cliquer sur un en-tête pour trier</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                  <ThSort col="nom"          label="Article"       sortCol={sortColLieu} sortDir={sortDirLieu} onSort={onSortLieu} className="text-left" />
                  <ThSort col="description"  label="Désignation"  sortCol={sortColLieu} sortDir={sortDirLieu} onSort={onSortLieu} className="text-left" />
                  <ThSort col="quantite"     label="Quantité"     sortCol={sortColLieu} sortDir={sortDirLieu} onSort={onSortLieu} className="text-right" />
                  <ThSort col="seuil_alerte" label="Seuil alerte" sortCol={sortColLieu} sortDir={sortDirLieu} onSort={onSortLieu} className="text-right" />
                  <th className="text-right py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lieuData.length === 0 && (
                  <tr><td colSpan="5" className="py-8 text-center text-stone-400">Aucun article en stock pour ce lieu</td></tr>
                )}
                {groupByFamille(lieuData).map(groupe => {
                  const famKey = groupe.nom
                  const famOpen = !collapsedFamilles.has(famKey)
                  return groupe.sousFamilles.map((sfGroup, sfIdx) => {
                    const sfKey = famKey + '|||' + (sfGroup.nom || '')
                    const sfOpen = !sfGroup.nom || expandedSousFamilles.has(sfKey)
                    return (
                      <>
                        {sfIdx === 0 && (
                          <tr key={'fam-' + famKey}
                            className="bg-amber-50 border-b border-amber-100 cursor-pointer select-none hover:bg-amber-100 transition-colors"
                            onClick={() => toggleFamille(famKey)}>
                            <td colSpan="5" className="py-2 px-3">
                              <span className="flex items-center gap-2 text-amber-800 font-semibold text-xs uppercase tracking-wide">
                                {famOpen
                                  ? <ChevronDown className="w-3.5 h-3.5" />
                                  : <ChevronRight className="w-3.5 h-3.5" />}
                                <Tag className="w-3.5 h-3.5" /> {groupe.nom}
                                <span className="ml-auto font-normal text-amber-600 normal-case">
                                  {groupe.sousFamilles.reduce((n, sf) => n + sf.rows.length, 0)} article{groupe.sousFamilles.reduce((n, sf) => n + sf.rows.length, 0) !== 1 ? 's' : ''}
                                </span>
                              </span>
                            </td>
                          </tr>
                        )}
                        {famOpen && sfGroup.nom && (
                          <tr key={'sf-' + sfKey}
                            className="bg-stone-50 border-b border-stone-100 cursor-pointer select-none hover:bg-stone-100 transition-colors"
                            onClick={() => toggleSousFamille(sfKey)}>
                            <td colSpan="5" className="py-1.5 pl-5 text-xs text-stone-500 font-medium">
                              <span className="flex items-center gap-1.5">
                                {sfOpen
                                  ? <ChevronDown className="w-3 h-3" />
                                  : <ChevronRight className="w-3 h-3" />}
                                {sfGroup.nom}
                                <span className="ml-1 text-stone-400">({sfGroup.rows.length})</span>
                              </span>
                            </td>
                          </tr>
                        )}
                        {famOpen && sfOpen && sfGroup.rows.map(s => (
                          <tr key={s.id} className={`border-b border-stone-100 hover:bg-stone-50 ${s.alerte ? 'bg-red-50' : ''}`}>
                            <td className="py-3 pr-4 font-medium text-stone-800 pl-9">
                              <div className="flex items-center gap-2">
                                {s.alerte && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                {s.nom}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-stone-500 text-xs">{s.description || '—'}</td>
                            <td className={`py-3 pr-4 text-right font-bold text-lg ${s.alerte ? 'text-red-600' : 'text-stone-800'}`}>
                              {s.quantite}
                            </td>
                            <td className="py-3 pr-4 text-right text-stone-500">{s.seuil_alerte ?? '—'}</td>
                            <td className="py-3 text-right">
                              <div className="flex gap-1.5 justify-end">
                                {isAdmin && (
                                  <button onClick={() => openModal('entree', s)}
                                    className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors">
                                    <Plus className="w-3 h-3" /> Entrée
                                  </button>
                                )}
                                {isAdmin && (
                                  <button onClick={() => openModal('edit', s)}
                                    title="Correction manuelle du stock"
                                    className="flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs font-medium transition-colors">
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </>
                    )
                  })
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Entrée */}
      {modalType === 'entree' && selectedRow && (
        <Modal title={'Entrée — ' + selectedRow.nom} onClose={closeModal}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Quantité</label>
              <input type="number" min="1" className="input-field" placeholder="ex : 24"
                value={qte} onChange={e => setQte(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
              <input type="text" className="input-field" placeholder="ex : Livraison du fournisseur"
                value={motif} onChange={e => setMotif(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleEntree} disabled={saving || !qte || Number(qte) <= 0}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Confirmer l\'entrée'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Correction stock (admin) */}
      {modalType === 'edit' && selectedRow && (
        <Modal title={'Correction stock — ' + selectedRow.nom} onClose={closeModal} size="sm">
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-700">
              Stock actuel : <strong>{selectedRow.quantite}</strong> unité(s) à {currentLieu?.nom}
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Nouvelle quantité</label>
              <input type="number" min="0" className="input-field" placeholder="ex : 42"
                value={editQte} onChange={e => setEditQte(e.target.value)} autoFocus />
              <p className="text-xs text-stone-400 mt-1">
                La différence sera enregistrée dans l'historique comme correction manuelle.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="btn-secondary flex-1">Annuler</button>
              <button onClick={handleEditStock}
                disabled={saving || editQte === '' || Number(editQte) < 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                {saving ? 'Enregistrement…' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Import CSV — admin only */}
      {showImport && isAdmin && (
        <ImportCSV
          lieux={lieux} bougies={bougies} userEmail={user?.email}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData() }}
        />
      )}
    </div>
  )
}
