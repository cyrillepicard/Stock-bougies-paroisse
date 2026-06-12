import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { AlertTriangle, Download, Upload, Plus, Minus, MapPin, Globe } from 'lucide-react'
import Modal from '../shared/Modal'
import ImportCSV from './ImportCSV'
import Papa from 'papaparse'

export default function StockPage() {
  const { isAdmin, user } = useAuth()
  const [view, setView] = useState('global') // 'global' | 'lieu'
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [selectedLieu, setSelectedLieu] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalType, setModalType] = useState(null) // 'entree' | 'sortie' | 'import'
  const [selectedRow, setSelectedRow] = useState(null)
  const [qte, setQte] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: b }, { data: s }] = await Promise.all([
      supabase.from('lieux').select('*').order('nom'),
      supabase.from('bougies').select('*').order('nom'),
      supabase.from('stock_par_lieu').select('*, bougies(nom), lieux(nom)'),
    ])
    setLieux(l || [])
    setBougies(b || [])
    setStock(s || [])
    if (!selectedLieu && l?.length) setSelectedLieu(l[0].id)
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // ---- Vue globale : total par bougie ----
  function getGlobalStock() {
    const totals = {}
    bougies.forEach(b => { totals[b.id] = { bougie: b, total: 0, parLieu: {}, alertes: [] } })
    stock.forEach(s => {
      if (!totals[s.bougie_id]) return
      totals[s.bougie_id].total += s.quantite
      totals[s.bougie_id].parLieu[s.lieu_id] = { qte: s.quantite, seuil: s.seuil_alerte }
      if (s.seuil_alerte !== null && s.quantite <= s.seuil_alerte) {
        totals[s.bougie_id].alertes.push(s.lieux?.nom)
      }
    })
    return Object.values(totals)
  }

  // ---- Vue par lieu ----
  function getLieuStock() {
    return stock
      .filter(s => s.lieu_id === selectedLieu)
      .map(s => ({
        ...s,
        nom: s.bougies?.nom,
        alerte: s.seuil_alerte !== null && s.quantite <= s.seuil_alerte,
      }))
      .sort((a, b) => a.nom?.localeCompare(b.nom))
  }

  async function handleMouvement() {
    if (!qte || isNaN(Number(qte)) || Number(qte) <= 0) return
    setSaving(true)
    const qty = Number(qte)
    const typeMvt = modalType

    // Récupérer le stock actuel
    const { data: current } = await supabase
      .from('stock_par_lieu')
      .select('*')
      .eq('bougie_id', selectedRow.bougie_id)
      .eq('lieu_id', selectedRow.lieu_id)
      .single()

    const newQte = typeMvt === 'entree'
      ? (current?.quantite || 0) + qty
      : Math.max(0, (current?.quantite || 0) - qty)

    // Upsert stock
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: selectedRow.bougie_id,
      lieu_id: selectedRow.lieu_id,
      quantite: newQte,
      seuil_alerte: current?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })

    // Enregistrer mouvement
    await supabase.from('mouvements').insert({
      bougie_id: selectedRow.bougie_id,
      lieu_id: selectedRow.lieu_id,
      type: typeMvt,
      quantite: qty,
      motif: motif || null,
      user_email: user?.email,
    })

    setModalType(null)
    setSelectedRow(null)
    setQte('')
    setMotif('')
    setSaving(false)
    loadData()
  }

  function openModal(type, row) {
    setModalType(type)
    setSelectedRow(row)
    setQte('')
    setMotif('')
  }

  // ---- Export CSV ----
  function exportCSV() {
    let rows = []
    if (view === 'global') {
      rows = getGlobalStock().map(g => ({
        Bougie: g.bougie.nom,
        'Stock total': g.total,
        Alertes: g.alertes.join(', '),
      }))
    } else {
      rows = getLieuStock().map(s => ({
        Bougie: s.nom,
        Lieu: lieux.find(l => l.id === selectedLieu)?.nom,
        Quantité: s.quantite,
        'Seuil alerte': s.seuil_alerte ?? '—',
      }))
    }
    const csv = Papa.unparse(rows, { delimiter: ';' })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `stock_${view}_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  if (loading) return <div className="p-8 text-stone-400 text-center">Chargement…</div>

  const globalData = getGlobalStock()
  const lieuData = getLieuStock()
  const currentLieu = lieux.find(l => l.id === selectedLieu)

  return (
    <div className="flex flex-col h-full">
      {/* En-tête */}
      <div className="px-6 py-4 border-b border-stone-200 bg-white flex flex-wrap items-center gap-3">
        <h1 className="font-serif font-bold text-xl text-stone-800 mr-auto">Stock de bougies</h1>

        <button onClick={() => setShowImport(true)} className="btn-secondary flex items-center gap-2 text-sm">
          <Upload className="w-4 h-4" /> Import CSV
        </button>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Bascule vue */}
      <div className="px-6 pt-4 pb-2 flex items-center gap-3 flex-wrap">
        <div className="flex bg-stone-100 rounded-lg p-1 gap-1">
          <button
            onClick={() => setView('global')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${view === 'global' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <Globe className="w-4 h-4" /> Vue globale
          </button>
          <button
            onClick={() => setView('lieu')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors
              ${view === 'lieu' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <MapPin className="w-4 h-4" /> Par lieu
          </button>
        </div>

        {view === 'lieu' && (
          <select
            className="input-field w-auto"
            value={selectedLieu || ''}
            onChange={e => setSelectedLieu(e.target.value)}
          >
            {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
        )}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        {view === 'global' ? (
          <div className="card mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                  <th className="text-left py-3 pr-4 font-medium">Bougie</th>
                  <th className="text-right py-3 pr-4 font-medium">Stock total</th>
                  {lieux.map(l => (
                    <th key={l.id} className="text-right py-3 pr-4 font-medium">{l.nom}</th>
                  ))}
                  <th className="text-right py-3 font-medium">Alertes</th>
                </tr>
              </thead>
              <tbody>
                {globalData.length === 0 && (
                  <tr><td colSpan="10" className="py-8 text-center text-stone-400">Aucune bougie enregistrée</td></tr>
                )}
                {globalData.map(({ bougie, total, parLieu, alertes }) => (
                  <tr key={bougie.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4 font-medium text-stone-800">{bougie.nom}</td>
                    <td className="py-3 pr-4 text-right font-bold text-stone-700">{total}</td>
                    {lieux.map(l => {
                      const s = parLieu[l.id]
                      const isAlert = s && s.seuil !== null && s.qte <= s.seuil
                      return (
                        <td key={l.id} className="py-3 pr-4 text-right">
                          <span className={`${isAlert ? 'text-red-600 font-bold' : 'text-stone-600'}`}>
                            {s ? s.qte : '—'}
                          </span>
                          {isAlert && <AlertTriangle className="inline w-3 h-3 text-red-500 ml-1" />}
                        </td>
                      )
                    })}
                    <td className="py-3 text-right">
                      {alertes.length > 0
                        ? <span className="badge-alert">⚠ {alertes.join(', ')}</span>
                        : <span className="badge-ok">OK</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card mt-2 overflow-x-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-medium text-stone-700">
                {currentLieu?.nom} — {lieuData.length} référence{lieuData.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                  <th className="text-left py-3 pr-4 font-medium">Bougie</th>
                  <th className="text-right py-3 pr-4 font-medium">Quantité</th>
                  <th className="text-right py-3 pr-4 font-medium">Seuil alerte</th>
                  <th className="text-right py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {lieuData.length === 0 && (
                  <tr><td colSpan="4" className="py-8 text-center text-stone-400">Aucun stock pour ce lieu</td></tr>
                )}
                {lieuData.map(s => (
                  <tr key={s.id} className={`border-b border-stone-100 hover:bg-stone-50 ${s.alerte ? 'bg-red-50' : ''}`}>
                    <td className="py-3 pr-4 font-medium text-stone-800 flex items-center gap-2">
                      {s.alerte && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                      {s.nom}
                    </td>
                    <td className={`py-3 pr-4 text-right font-bold text-lg ${s.alerte ? 'text-red-600' : 'text-stone-800'}`}>
                      {s.quantite}
                    </td>
                    <td className="py-3 pr-4 text-right text-stone-500">
                      {s.seuil_alerte ?? '—'}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openModal('entree', s)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Entrée
                        </button>
                        <button
                          onClick={() => openModal('sortie', s)}
                          className="flex items-center gap-1 px-2 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Minus className="w-3 h-3" /> Sortie
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Entrée/Sortie */}
      {modalType && selectedRow && (
        <Modal
          title={modalType === 'entree' ? `Entrée — ${selectedRow.nom}` : `Sortie — ${selectedRow.nom}`}
          onClose={() => setModalType(null)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Quantité</label>
              <input
                type="number"
                min="1"
                className="input-field"
                placeholder="ex : 24"
                value={qte}
                onChange={e => setQte(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
              <input
                type="text"
                className="input-field"
                placeholder="ex : Livraison du fournisseur"
                value={motif}
                onChange={e => setMotif(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalType(null)} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleMouvement}
                disabled={saving || !qte || Number(qte) <= 0}
                className={`flex-1 font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  modalType === 'entree'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {saving ? 'Enregistrement…' : modalType === 'entree' ? 'Confirmer l\'entrée' : 'Confirmer la sortie'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Import CSV */}
      {showImport && (
        <ImportCSV
          lieux={lieux}
          bougies={bougies}
          userEmail={user?.email}
          onClose={() => setShowImport(false)}
          onDone={() => { setShowImport(false); loadData() }}
        />
      )}
    </div>
  )
}
