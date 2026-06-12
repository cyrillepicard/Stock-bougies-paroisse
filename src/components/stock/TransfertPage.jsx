import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { ArrowRight } from 'lucide-react'

export default function TransfertPage() {
  const { user } = useAuth()
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [source, setSource] = useState('')
  const [dest, setDest] = useState('')
  const [bougieId, setBougieId] = useState('')
  const [qte, setQte] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: b }, { data: s }] = await Promise.all([
        supabase.from('lieux').select('*').order('nom'),
        supabase.from('bougies').select('*').order('nom'),
        supabase.from('stock_par_lieu').select('*'),
      ])
      setLieux(l || [])
      setBougies(b || [])
      setStock(s || [])
    }
    load()
  }, [])

  function getStockForSourceBougie() {
    if (!source || !bougieId) return null
    return stock.find(s => s.lieu_id === source && s.bougie_id === bougieId)
  }

  const stockSource = getStockForSourceBougie()

  async function handleTransfert() {
    setError(null)
    setMessage(null)
    const qty = Number(qte)
    if (!source || !dest || !bougieId || qty <= 0) {
      setError('Tous les champs sont requis.')
      return
    }
    if (source === dest) {
      setError('La source et la destination doivent être différentes.')
      return
    }
    if (!stockSource || stockSource.quantite < qty) {
      setError('Stock insuffisant au lieu source.')
      return
    }
    setSaving(true)

    // Diminuer source
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: bougieId,
      lieu_id: source,
      quantite: stockSource.quantite - qty,
      seuil_alerte: stockSource.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })

    // Récupérer stock destination
    const { data: destStock } = await supabase
      .from('stock_par_lieu')
      .select('*')
      .eq('bougie_id', bougieId)
      .eq('lieu_id', dest)
      .single()

    // Augmenter destination
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: bougieId,
      lieu_id: dest,
      quantite: (destStock?.quantite || 0) + qty,
      seuil_alerte: destStock?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })

    // Mouvement
    await supabase.from('mouvements').insert({
      bougie_id: bougieId,
      lieu_id: source,
      lieu_destination_id: dest,
      type: 'transfert',
      quantite: qty,
      motif: motif || null,
      user_email: user?.email,
    })

    setSaving(false)
    setMessage(`Transfert de ${qty} bougie(s) effectué avec succès.`)
    setQte('')
    setMotif('')

    // Rafraîchir stock
    const { data: s } = await supabase.from('stock_par_lieu').select('*')
    setStock(s || [])
  }

  const lieuNom = (id) => lieux.find(l => l.id === id)?.nom || id

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Transfert entre lieux</h1>
        <p className="text-stone-500 text-sm mt-0.5">Déplacer du stock d'un lieu vers un autre</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">
          {/* Bougie */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Référence de bougie</label>
            <select className="input-field" value={bougieId} onChange={e => setBougieId(e.target.value)}>
              <option value="">Sélectionner une bougie…</option>
              {bougies.map(b => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </div>

          {/* Lieux */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lieu source</label>
              <select className="input-field" value={source} onChange={e => setSource(e.target.value)}>
                <option value="">Sélectionner…</option>
                {lieux.filter(l => l.id !== dest).map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
            <div className="pb-2">
              <ArrowRight className="w-5 h-5 text-stone-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lieu destination</label>
              <select className="input-field" value={dest} onChange={e => setDest(e.target.value)}>
                <option value="">Sélectionner…</option>
                {lieux.filter(l => l.id !== source).map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
          </div>

          {/* Info stock source */}
          {stockSource !== null && source && bougieId && (
            <div className="bg-stone-50 rounded-lg px-4 py-3 text-sm text-stone-600">
              Stock disponible à <strong>{lieuNom(source)}</strong> :{' '}
              <strong className="text-stone-800">{stockSource?.quantite ?? 0}</strong> unité{(stockSource?.quantite ?? 0) !== 1 ? 's' : ''}
            </div>
          )}

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité à transférer</label>
            <input
              type="number"
              min="1"
              max={stockSource?.quantite || undefined}
              className="input-field"
              placeholder="ex : 12"
              value={qte}
              onChange={e => setQte(e.target.value)}
            />
          </div>

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input
              type="text"
              className="input-field"
              placeholder="ex : Messe des familles"
              value={motif}
              onChange={e => setMotif(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
          )}
          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">{message}</div>
          )}

          <button
            onClick={handleTransfert}
            disabled={saving || !source || !dest || !bougieId || !qte || Number(qte) <= 0}
            className="btn-primary w-full"
          >
            {saving ? 'Transfert en cours…' : 'Valider le transfert'}
          </button>
        </div>
      </div>
    </div>
  )
}
