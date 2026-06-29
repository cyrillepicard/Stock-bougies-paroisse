import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useQRScanner } from '../../hooks/useQRScanner'
import { ArrowRight, QrCode, X, Info, AlertTriangle } from 'lucide-react'
import ArticleAutocomplete from '../shared/ArticleAutocomplete'
import ArticleInfoModal from '../shared/ArticleInfoModal'

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
  const [showInfo, setShowInfo] = useState(false)

  const { scanning, scanError, scanMsg, videoRef, canvasRef, startScan, stopScan } = useQRScanner({
    bougies,
    onFound: (found) => { setBougieId(found.id); setError(null); setMessage(null) },
  })

  useEffect(() => {
    async function load() {
      const [{ data: l, error: le }, { data: b, error: be }, { data: s, error: se }] = await Promise.all([
        supabase.from('lieux').select('*').order('nom'),
        supabase.from('bougies').select('*, familles(nom), sous_familles(nom)').order('nom'),
        supabase.from('stock_par_lieu').select('*'),
      ])
      if (le || be || se) { setError('Erreur de chargement des données.'); return }
      setLieux(l || [])
      setBougies(b || [])
      setStock(s || [])
    }
    load()
  }, [])

  const stockSource = source && bougieId
    ? stock.find(s => s.lieu_id === source && s.bougie_id === bougieId)
    : null
  const selectedArticle = bougies.find(b => b.id === bougieId)
  const lieuNom = (id) => lieux.find(l => l.id === id)?.nom || id

  async function handleTransfert() {
    setError(null); setMessage(null)
    const qty = Number(qte)
    if (!source || !dest || !bougieId || qty <= 0) { setError('Tous les champs sont requis.'); return }
    if (source === dest) { setError('La source et la destination doivent être différentes.'); return }
    if (!stockSource || stockSource.quantite < qty) { setError('Stock insuffisant au lieu source.'); return }
    setSaving(true)
    try {
      const { error: srcErr } = await supabase.from('stock_par_lieu').upsert({
        bougie_id: bougieId, lieu_id: source,
        quantite: stockSource.quantite - qty,
        seuil_alerte: stockSource.seuil_alerte ?? null,
      }, { onConflict: 'bougie_id,lieu_id' })
      if (srcErr) throw srcErr

      const { data: destStock } = await supabase
        .from('stock_par_lieu').select('*')
        .eq('bougie_id', bougieId).eq('lieu_id', dest).single()

      const { error: dstErr } = await supabase.from('stock_par_lieu').upsert({
        bougie_id: bougieId, lieu_id: dest,
        quantite: (destStock?.quantite || 0) + qty,
        seuil_alerte: destStock?.seuil_alerte ?? null,
      }, { onConflict: 'bougie_id,lieu_id' })
      if (dstErr) throw dstErr

      await supabase.from('mouvements').insert({
        bougie_id: bougieId, lieu_id: source, lieu_destination_id: dest,
        type: 'transfert', quantite: qty, motif: motif || null, user_email: user?.email,
      })

      const { data: s } = await supabase.from('stock_par_lieu').select('*')
      setStock(s || [])
      setMessage(`Transfert de ${qty} article(s) effectué avec succès.`)
      setQte(''); setMotif('')
    } catch {
      setError('Erreur lors du transfert. Veuillez réessayer.')
    }
    setSaving(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Transfert entre lieux</h1>
        <p className="text-stone-500 text-sm mt-0.5">Déplacer du stock d'un lieu vers un autre</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Référence article</label>
            <div className="flex gap-2">
              <ArticleAutocomplete
                articles={bougies}
                value={bougieId}
                onChange={id => { setBougieId(id || ''); setError(null); setMessage(null) }}
                placeholder="Rechercher un article…"
              />
              <button onClick={scanning ? stopScan : startScan} title="Scanner un QR code"
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  scanning
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700'
                }`}>
                {scanning ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                <span className="hidden sm:block">{scanning ? 'Stop' : 'Scanner'}</span>
              </button>
              {bougieId && (
                <button onClick={() => setShowInfo(true)} title="Voir la fiche article"
                  className="shrink-0 flex items-center px-3 py-2 rounded-lg border bg-stone-100 border-stone-300 text-stone-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">
                  <Info className="w-4 h-4" />
                </button>
              )}
            </div>

            {scanning && (
              <div className="mt-3 rounded-xl overflow-hidden border border-stone-200 bg-black relative">
                <video ref={videoRef} className="w-full max-h-56 object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-amber-400 rounded-xl opacity-80" />
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">{scanMsg}</p>
              </div>
            )}
            {scanError && <p className="text-xs text-red-600 mt-1">{scanError}</p>}
            {!scanning && scanMsg && bougieId && <p className="text-xs text-green-600 mt-1">{scanMsg}</p>}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lieu source</label>
              <select className="input-field" value={source} onChange={e => setSource(e.target.value)}>
                <option value="">Sélectionner…</option>
                {lieux.filter(l => l.id !== dest).map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
            <div className="pb-2"><ArrowRight className="w-5 h-5 text-stone-400" /></div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Lieu destination</label>
              <select className="input-field" value={dest} onChange={e => setDest(e.target.value)}>
                <option value="">Sélectionner…</option>
                {lieux.filter(l => l.id !== source).map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
            </div>
          </div>

          {source && bougieId && (
            <div className="bg-stone-50 rounded-lg px-4 py-3 text-sm text-stone-600">
              Stock disponible à <strong>{lieuNom(source)}</strong> :{' '}
              <strong className="text-stone-800">{stockSource?.quantite ?? 0}</strong> unité{(stockSource?.quantite ?? 0) !== 1 ? 's' : ''}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité à transférer</label>
            <input type="number" min="1" max={stockSource?.quantite || undefined}
              className="input-field" placeholder="ex : 12" value={qte}
              onChange={e => setQte(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input type="text" className="input-field" placeholder="ex : Messe des familles"
              value={motif} onChange={e => setMotif(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {message && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✓ {message}</div>}

          <button onClick={handleTransfert}
            disabled={saving || !source || !dest || !bougieId || !qte || Number(qte) <= 0}
            className="btn-primary w-full">
            {saving ? 'Transfert en cours…' : 'Valider le transfert'}
          </button>
        </div>
      </div>

      {showInfo && <ArticleInfoModal article={selectedArticle} onClose={() => setShowInfo(false)} />}
    </div>
  )
}
