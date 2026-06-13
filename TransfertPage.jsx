import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Download, Filter } from 'lucide-react'
import Papa from 'papaparse'

const TYPE_LABELS = {
  entree: { label: 'Entrée', color: 'bg-green-100 text-green-700' },
  sortie: { label: 'Sortie', color: 'bg-orange-100 text-orange-700' },
  transfert: { label: 'Transfert', color: 'bg-blue-100 text-blue-700' },
  import_csv: { label: 'Import CSV', color: 'bg-purple-100 text-purple-700' },
}

export default function HistoriquePage() {
  const [mouvements, setMouvements] = useState([])
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterLieu, setFilterLieu] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterBougie, setFilterBougie] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [{ data: m }, { data: l }, { data: b }] = await Promise.all([
        supabase
          .from('mouvements')
          .select('*, bougies(nom), lieux!mouvements_lieu_id_fkey(nom), dest:lieux!mouvements_lieu_destination_id_fkey(nom)')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('lieux').select('*').order('nom'),
        supabase.from('bougies').select('*').order('nom'),
      ])
      setMouvements(m || [])
      setLieux(l || [])
      setBougies(b || [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = mouvements.filter(m => {
    if (filterLieu && m.lieu_id !== filterLieu && m.lieu_destination_id !== filterLieu) return false
    if (filterType && m.type !== filterType) return false
    if (filterBougie && m.bougie_id !== filterBougie) return false
    if (dateDebut && new Date(m.created_at) < new Date(dateDebut)) return false
    if (dateFin && new Date(m.created_at) > new Date(dateFin + 'T23:59:59')) return false
    return true
  })

  function exportCSV() {
    const rows = filtered.map(m => ({
      Date: new Date(m.created_at).toLocaleString('fr-FR'),
      Type: TYPE_LABELS[m.type]?.label || m.type,
      Bougie: m.bougies?.nom || '',
      Lieu: m.lieux?.nom || '',
      'Lieu destination': m.dest?.nom || '',
      Quantité: m.quantite,
      Motif: m.motif || '',
      Utilisateur: m.user_email || '',
    }))
    const csv = Papa.unparse(rows, { delimiter: ';' })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historique_${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  if (loading) return <div className="p-8 text-stone-400 text-center">Chargement…</div>

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white flex items-center gap-3">
        <h1 className="font-serif font-bold text-xl text-stone-800 mr-auto">Historique des mouvements</h1>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Filtres */}
      <div className="px-6 pt-4 pb-3 border-b border-stone-100 bg-stone-50 flex flex-wrap gap-3 items-end">
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Filter className="w-4 h-4" /> Filtres :
        </div>
        <div>
          <select className="input-field text-sm py-1.5" value={filterLieu} onChange={e => setFilterLieu(e.target.value)}>
            <option value="">Tous les lieux</option>
            {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>
        </div>
        <div>
          <select className="input-field text-sm py-1.5" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div>
          <select className="input-field text-sm py-1.5" value={filterBougie} onChange={e => setFilterBougie(e.target.value)}>
            <option value="">Toutes les bougies</option>
            {bougies.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" className="input-field text-sm py-1.5 w-36" value={dateDebut} onChange={e => setDateDebut(e.target.value)} />
          <span className="text-stone-400 text-sm">→</span>
          <input type="date" className="input-field text-sm py-1.5 w-36" value={dateFin} onChange={e => setDateFin(e.target.value)} />
        </div>
        {(filterLieu || filterType || filterBougie || dateDebut || dateFin) && (
          <button
            onClick={() => { setFilterLieu(''); setFilterType(''); setFilterBougie(''); setDateDebut(''); setDateFin('') }}
            className="text-sm text-amber-600 hover:underline"
          >
            Effacer les filtres
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="card mt-4 overflow-x-auto">
          <p className="text-sm text-stone-500 mb-3">{filtered.length} mouvement{filtered.length !== 1 ? 's' : ''}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 text-xs uppercase tracking-wide">
                <th className="text-left py-3 pr-4 font-medium">Date</th>
                <th className="text-left py-3 pr-4 font-medium">Type</th>
                <th className="text-left py-3 pr-4 font-medium">Bougie</th>
                <th className="text-left py-3 pr-4 font-medium">Lieu</th>
                <th className="text-right py-3 pr-4 font-medium">Quantité</th>
                <th className="text-left py-3 pr-4 font-medium">Motif</th>
                <th className="text-left py-3 font-medium">Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="py-8 text-center text-stone-400">Aucun mouvement trouvé</td></tr>
              )}
              {filtered.map(m => {
                const t = TYPE_LABELS[m.type] || { label: m.type, color: 'bg-stone-100 text-stone-600' }
                return (
                  <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 pr-4 text-stone-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.color}`}>{t.label}</span>
                    </td>
                    <td className="py-3 pr-4 font-medium text-stone-800">{m.bougies?.nom || '—'}</td>
                    <td className="py-3 pr-4 text-stone-600">
                      {m.lieux?.nom || '—'}
                      {m.dest?.nom && <span className="text-stone-400"> → {m.dest.nom}</span>}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-stone-800">{m.quantite}</td>
                    <td className="py-3 pr-4 text-stone-500 italic">{m.motif || '—'}</td>
                    <td className="py-3 text-stone-400 text-xs">{m.user_email || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
