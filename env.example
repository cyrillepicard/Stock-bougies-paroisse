import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { MinusCircle, AlertTriangle } from 'lucide-react'

export default function SortiePage() {
  const { user } = useAuth()
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
  const [stock, setStock] = useState([])
  const [selectedLieu, setSelectedLieu] = useState('')
  const [selectedBougie, setSelectedBougie] = useState('')
  const [qte, setQte] = useState('')
  const [motif, setMotif] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  const stockCourant = stock.find(
    s => s.lieu_id === selectedLieu && s.bougie_id === selectedBougie
  )
  const disponible = stockCourant?.quantite ?? 0
  const qteNum = Number(qte)
  const depassement = qte !== '' && qteNum > disponible
  const nomLieu = lieux.find(l => l.id === selectedLieu)?.nom
  const nomBougie = bougies.find(b => b.id === selectedBougie)?.nom

  async function handleSortie() {
    setError('')
    setSuccess('')
    if (!selectedLieu || !selectedBougie) { setError('Sélectionne un lieu et un type de bougie.'); return }
    if (!qte || qteNum <= 0) { setError('La quantité doit être supérieure à 0.'); return }
    if (qteNum > disponible) { setError('Stock insuffisant. Il ne reste que ' + disponible + ' unité' + (disponible > 1 ? 's' : '') + ' à ' + nomLieu + '.'); return }

    setSaving(true)
    await supabase.from('stock_par_lieu').upsert({
      bougie_id: selectedBougie,
      lieu_id: selectedLieu,
      quantite: disponible - qteNum,
      seuil_alerte: stockCourant?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })

    await supabase.from('mouvements').insert({
      bougie_id: selectedBougie,
      lieu_id: selectedLieu,
      type: 'sortie',
      quantite: qteNum,
      motif: motif || null,
      user_email: user?.email,
    })

    const { data: s } = await supabase.from('stock_par_lieu').select('*')
    setStock(s || [])
    setSuccess('Sortie enregistrée : ' + qteNum + ' x ' + nomBougie + ' depuis ' + nomLieu + '.')
    setQte('')
    setMotif('')
    setSaving(false)
  }

  function reset() {
    setSelectedLieu('')
    setSelectedBougie('')
    setQte('')
    setMotif('')
    setError('')
    setSuccess('')
  }

  const bougiesDisponibles = bougies.filter(b => {
    if (!selectedLieu) return true
    const s = stock.find(s => s.bougie_id === b.id && s.lieu_id === selectedLieu)
    return s && s.quantite > 0
  })

  const stockBas = selectedBougie && selectedLieu && stockCourant?.seuil_alerte !== null
    && disponible <= (stockCourant?.seuil_alerte ?? 0) && disponible > 0

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Sortie de stock</h1>
        <p className="text-stone-500 text-sm mt-0.5">Enregistrer une consommation ou une utilisation de bougies</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">

          {/* Lieu */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Lieu</label>
            <select
              className="input-field"
              value={selectedLieu}
              onChange={e => { setSelectedLieu(e.target.value); setSelectedBougie(''); setQte(''); setError(''); setSuccess('') }}
            >
              <option value="">Sélectionner un lieu…</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>

          {/* Bougie */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Type de bougie</label>
            <select
              className="input-field"
              value={selectedBougie}
              onChange={e => { setSelectedBougie(e.target.value); setQte(''); setError(''); setSuccess('') }}
              disabled={!selectedLieu}
            >
              <option value="">Sélectionner une bougie…</option>
              {bougiesDisponibles.map(b => {
                const s = stock.find(s => s.bougie_id === b.id && s.lieu_id === selectedLieu)
                return (
                  <option key={b.id} value={b.id}>
                    {b.nom}{s ? ' — ' + s.quantite + ' en stock' : ''}
                  </option>
                )
              })}
            </select>
            {selectedLieu && bougiesDisponibles.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">Aucune bougie disponible dans ce lieu.</p>
            )}
          </div>

          {/* Indicateur stock */}
          {selectedBougie && selectedLieu && (
            <div className={
              'flex items-center gap-2 rounded-lg px-4 py-3 text-sm ' +
              (disponible === 0
                ? 'bg-red-50 text-red-700 border border-red-200'
                : stockBas
                  ? 'bg-orange-50 text-orange-700 border border-orange-200'
                  : 'bg-stone-50 text-stone-600')
            }>
              {disponible === 0
                ? <><AlertTriangle className="w-4 h-4 shrink-0" /><span>Stock épuisé — impossible de faire une sortie.</span></>
                : stockBas
                  ? <><AlertTriangle className="w-4 h-4 shrink-0" /><span>Stock bas : <strong>{disponible}</strong> unité{disponible > 1 ? 's' : ''} disponible{disponible > 1 ? 's' : ''}</span></>
                  : <span>Stock disponible : <strong>{disponible}</strong> unité{disponible > 1 ? 's' : ''}</span>
              }
            </div>
          )}

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité à sortir</label>
            <input
              type="number"
              min="1"
              max={disponible || undefined}
              className={'input-field ' + (depassement ? 'border-red-400 focus:ring-red-400' : '')}
              placeholder="ex : 12"
              value={qte}
              onChange={e => { setQte(e.target.value); setError(''); setSuccess('') }}
              disabled={!selectedBougie || disponible === 0}
            />
            {depassement && (
              <p className="text-xs text-red-600 mt-1">
                Maximum {disponible} unité{disponible > 1 ? 's' : ''} disponible{disponible > 1 ? 's' : ''}.
              </p>
            )}
          </div>

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input
              type="text"
              className="input-field"
              placeholder="ex : Messe du dimanche, Baptême…"
              value={motif}
              onChange={e => setMotif(e.target.value)}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
              ✓ {success}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {success
              ? <button onClick={reset} className="btn-primary w-full">Nouvelle sortie</button>
              : <>
                  <button onClick={reset} className="btn-secondary flex-1" disabled={saving}>Réinitialiser</button>
                  <button
                    onClick={handleSortie}
                    disabled={saving || !selectedLieu || !selectedBougie || !qte || qteNum <= 0 || depassement || disponible === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <MinusCircle className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Confirmer la sortie'}
                  </button>
                </>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
