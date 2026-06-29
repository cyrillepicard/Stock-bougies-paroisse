import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useQRScanner } from '../../hooks/useQRScanner'
import { MinusCircle, AlertTriangle, QrCode, X, Info } from 'lucide-react'
import ArticleAutocomplete from '../shared/ArticleAutocomplete'
import ArticleInfoModal from '../shared/ArticleInfoModal'

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
  const [showInfo, setShowInfo] = useState(false)

  const { scanning, scanError, scanMsg, videoRef, canvasRef, startScan, stopScan } = useQRScanner({
    bougies,
    onFound: (found) => { setSelectedBougie(found.id); setQte(''); setError(''); setSuccess('') },
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

  const stockCourant = stock.find(s => s.lieu_id === selectedLieu && s.bougie_id === selectedBougie)
  const disponible = stockCourant?.quantite ?? 0
  const qteNum = Number(qte)
  const depassement = qte !== '' && qteNum > disponible
  const nomLieu = lieux.find(l => l.id === selectedLieu)?.nom
  const selectedArticle = bougies.find(b => b.id === selectedBougie)
  const nomBougie = selectedArticle?.nom
  const stockBas = selectedBougie && selectedLieu && stockCourant?.seuil_alerte !== null
    && disponible <= (stockCourant?.seuil_alerte ?? 0) && disponible > 0

  const bougiesDisponibles = bougies.filter(b => {
    if (!selectedLieu) return true
    const s = stock.find(s => s.bougie_id === b.id && s.lieu_id === selectedLieu)
    return s && s.quantite > 0
  })

  async function handleSortie() {
    setError(''); setSuccess('')
    if (!selectedLieu || !selectedBougie) { setError('Sélectionne un lieu et un article.'); return }
    if (!qte || qteNum <= 0) { setError('La quantité doit être supérieure à 0.'); return }
    if (qteNum > disponible) { setError('Stock insuffisant. Il reste ' + disponible + ' unité(s) à ' + nomLieu + '.'); return }
    setSaving(true)
    try {
      const { error: upsertErr } = await supabase.from('stock_par_lieu').upsert({
        bougie_id: selectedBougie, lieu_id: selectedLieu,
        quantite: disponible - qteNum,
        seuil_alerte: stockCourant?.seuil_alerte ?? null,
      }, { onConflict: 'bougie_id,lieu_id' })
      if (upsertErr) throw upsertErr

      await supabase.from('mouvements').insert({
        bougie_id: selectedBougie, lieu_id: selectedLieu,
        type: 'sortie', quantite: qteNum,
        motif: motif || null, user_email: user?.email,
      })

      const { data: s } = await supabase.from('stock_par_lieu').select('*')
      setStock(s || [])
      setSuccess('Sortie enregistrée : ' + qteNum + ' × ' + nomBougie + ' depuis ' + nomLieu + '.')
      setQte(''); setMotif('')
    } catch {
      setError('Erreur lors de l\'enregistrement. Veuillez réessayer.')
    }
    setSaving(false)
  }

  function reset() {
    setSelectedLieu(''); setSelectedBougie(''); setQte(''); setMotif('')
    setError(''); setSuccess('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Sortie de stock</h1>
        <p className="text-stone-500 text-sm mt-0.5">Enregistrer une consommation ou une utilisation d'articles</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Lieu</label>
            <select className="input-field" value={selectedLieu}
              onChange={e => { setSelectedLieu(e.target.value); setSelectedBougie(''); setQte(''); setError(''); setSuccess('') }}>
              <option value="">Sélectionner un lieu…</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Référence article</label>
            <div className="flex gap-2">
              <ArticleAutocomplete
                articles={bougiesDisponibles}
                value={selectedBougie}
                onChange={id => { setSelectedBougie(id || ''); setQte(''); setError(''); setSuccess('') }}
                placeholder="Rechercher un article…"
                disabled={!selectedLieu}
              />
              <button onClick={scanning ? stopScan : startScan} disabled={!selectedLieu}
                title="Scanner un QR code"
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  scanning
                    ? 'bg-red-50 border-red-300 text-red-600 hover:bg-red-100'
                    : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 disabled:opacity-40'
                }`}>
                {scanning ? <X className="w-4 h-4" /> : <QrCode className="w-4 h-4" />}
                <span className="hidden sm:block">{scanning ? 'Stop' : 'Scanner'}</span>
              </button>
              {selectedBougie && (
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
            {!scanning && scanMsg && selectedBougie && (
              <p className="text-xs text-green-600 mt-1">{scanMsg}</p>
            )}
            {selectedLieu && bougiesDisponibles.length === 0 && (
              <p className="text-xs text-orange-600 mt-1">Aucun article disponible dans ce lieu.</p>
            )}
          </div>

          {selectedBougie && selectedLieu && (
            <div className={
              'flex items-center gap-2 rounded-lg px-4 py-3 text-sm ' +
              (disponible === 0 ? 'bg-red-50 text-red-700 border border-red-200'
                : stockBas ? 'bg-orange-50 text-orange-700 border border-orange-200'
                : 'bg-stone-50 text-stone-600')
            }>
              {disponible === 0
                ? <><AlertTriangle className="w-4 h-4 shrink-0" /><span>Stock épuisé.</span></>
                : stockBas
                  ? <><AlertTriangle className="w-4 h-4 shrink-0" /><span>Stock bas : <strong>{disponible}</strong> unité(s)</span></>
                  : <span>Stock disponible : <strong>{disponible}</strong> unité(s)</span>
              }
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité à sortir</label>
            <input type="number" min="1" max={disponible || undefined}
              className={'input-field ' + (depassement ? 'border-red-400 focus:ring-red-400' : '')}
              placeholder="ex : 12" value={qte}
              onChange={e => { setQte(e.target.value); setError(''); setSuccess('') }}
              disabled={!selectedBougie || disponible === 0} />
            {depassement && (
              <p className="text-xs text-red-600 mt-1">Maximum {disponible} unité(s) disponible(s).</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input type="text" className="input-field" placeholder="ex : Messe du dimanche, Baptême…"
              value={motif} onChange={e => setMotif(e.target.value)} />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✓ {success}</div>
          )}

          <div className="flex gap-3 pt-1">
            {success
              ? <button onClick={reset} className="btn-primary w-full">Nouvel enregistrement</button>
              : <>
                  <button onClick={reset} className="btn-secondary flex-1" disabled={saving}>Réinitialiser</button>
                  <button onClick={handleSortie}
                    disabled={saving || !selectedLieu || !selectedBougie || !qte || qteNum <= 0 || depassement || disponible === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <MinusCircle className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Confirmer la sortie'}
                  </button>
                </>
            }
          </div>
        </div>
      </div>

      {showInfo && <ArticleInfoModal article={selectedArticle} onClose={() => setShowInfo(false)} />}
    </div>
  )
}
