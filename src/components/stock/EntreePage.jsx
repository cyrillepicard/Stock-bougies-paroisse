import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useQRScanner } from '../../hooks/useQRScanner'
import { PlusCircle, AlertTriangle, QrCode, X, Info } from 'lucide-react'
import ArticleAutocomplete from '../shared/ArticleAutocomplete'
import ArticleInfoModal from '../shared/ArticleInfoModal'

export default function EntreePage() {
  const { user } = useAuth()
  const [lieux, setLieux] = useState([])
  const [bougies, setBougies] = useState([])
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
    onFound: (found) => { setSelectedBougie(found.id); setError(''); setSuccess('') },
  })

  useEffect(() => {
    async function load() {
      const [{ data: l, error: le }, { data: b, error: be }] = await Promise.all([
        supabase.from('lieux').select('*').order('nom'),
        supabase.from('bougies').select('*, familles(nom), sous_familles(nom)').order('nom'),
      ])
      if (le || be) { setError('Erreur de chargement des données.'); return }
      setLieux(l || [])
      setBougies(b || [])
    }
    load()
  }, [])

  const selectedArticle = bougies.find(b => b.id === selectedBougie)
  const nomBougie = selectedArticle?.nom
  const nomLieu = lieux.find(l => l.id === selectedLieu)?.nom
  const qteNum = Number(qte)

  async function handleEntree() {
    setError(''); setSuccess('')
    if (!selectedLieu || !selectedBougie) { setError('Sélectionne un lieu et un article.'); return }
    if (!qte || qteNum <= 0) { setError('La quantité doit être supérieure à 0.'); return }
    setSaving(true)
    try {
      const { data: current } = await supabase
        .from('stock_par_lieu').select('*')
        .eq('bougie_id', selectedBougie).eq('lieu_id', selectedLieu).single()

      const { error: upsertErr } = await supabase.from('stock_par_lieu').upsert({
        bougie_id: selectedBougie,
        lieu_id: selectedLieu,
        quantite: (current?.quantite || 0) + qteNum,
        seuil_alerte: current?.seuil_alerte ?? null,
      }, { onConflict: 'bougie_id,lieu_id' })
      if (upsertErr) throw upsertErr

      await supabase.from('mouvements').insert({
        bougie_id: selectedBougie,
        lieu_id: selectedLieu,
        type: 'entree',
        quantite: qteNum,
        motif: motif || null,
        user_email: user?.email,
      })

      setSuccess('Entrée enregistrée : ' + qteNum + ' × ' + nomBougie + ' → ' + nomLieu + '.')
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
        <h1 className="font-serif font-bold text-xl text-stone-800">Entrée de stock</h1>
        <p className="text-stone-500 text-sm mt-0.5">Enregistrer une réception ou un réapprovisionnement d'articles</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Lieu de réception</label>
            <select className="input-field" value={selectedLieu}
              onChange={e => { setSelectedLieu(e.target.value); setQte(''); setError(''); setSuccess('') }}>
              <option value="">Sélectionner un lieu…</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Référence article</label>
            <div className="flex gap-2">
              <ArticleAutocomplete
                articles={bougies}
                value={selectedBougie}
                onChange={id => { setSelectedBougie(id || ''); setError(''); setSuccess('') }}
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
                  <div className="w-44 h-44 border-2 border-green-400 rounded-xl opacity-80" />
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">{scanMsg}</p>
              </div>
            )}
            {scanError && <p className="text-xs text-red-600 mt-1">{scanError}</p>}
            {!scanning && scanMsg && selectedBougie && (
              <p className="text-xs text-green-600 mt-1">{scanMsg}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité reçue</label>
            <input type="number" min="1" className="input-field" placeholder="ex : 48"
              value={qte} onChange={e => { setQte(e.target.value); setError(''); setSuccess('') }}
              disabled={!selectedBougie} />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input type="text" className="input-field" placeholder="ex : Livraison fournisseur, Don…"
              value={motif} onChange={e => setMotif(e.target.value)} />
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
              ? <button onClick={reset} className="btn-primary w-full">Nouvel enregistrement</button>
              : <>
                  <button onClick={reset} className="btn-secondary flex-1" disabled={saving}>Réinitialiser</button>
                  <button onClick={handleEntree}
                    disabled={saving || !selectedLieu || !selectedBougie || !qte || qteNum <= 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <PlusCircle className="w-4 h-4" />
                    {saving ? 'Enregistrement…' : 'Confirmer l\'entrée'}
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
