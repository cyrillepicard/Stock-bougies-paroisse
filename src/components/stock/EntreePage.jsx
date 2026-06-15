import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { PlusCircle, AlertTriangle, QrCode, X, Info, Flame } from 'lucide-react'
import Modal from '../shared/Modal'

function loadJsQR() {
  return new Promise((resolve) => {
    if (window.jsQR) { resolve(window.jsQR); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js'
    s.onload = () => resolve(window.jsQR)
    document.head.appendChild(s)
  })
}

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

  // Popup info article
  const [showInfo, setShowInfo] = useState(false)

  // QR scan
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState('')
  const [scanMsg, setScanMsg] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    async function load() {
      const [{ data: l }, { data: b }] = await Promise.all([
        supabase.from('lieux').select('*').order('nom'),
        supabase.from('bougies')
          .select('*, familles(nom), sous_familles(nom)')
          .order('nom'),
      ])
      setLieux(l || [])
      setBougies(b || [])
    }
    load()
  }, [])

  const stopScan = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }, [])

  useEffect(() => () => stopScan(), [stopScan])

  async function startScan() {
    setScanError(''); setScanMsg('Ouverture de la caméra…'); setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play() }
      setScanMsg('Pointez vers un QR code…')
      const jsQR = await loadJsQR()
      scanFrame(jsQR)
    } catch (e) {
      setScanError('Impossible d\'accéder à la caméra : ' + e.message)
      setScanning(false)
    }
  }

  function scanFrame(jsQR) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !streamRef.current) return
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth; canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        const texte = code.data.trim()
        const found = bougies.find(b =>
          b.nom.toLowerCase() === texte.toLowerCase() ||
          texte.toLowerCase().includes(b.nom.toLowerCase())
        )
        if (found) {
          setSelectedBougie(found.id)
          setScanMsg('✓ Article détecté : ' + found.nom)
          stopScan(); setError(''); setSuccess('')
        } else {
          setScanMsg('QR lu : "' + texte + '" — article non trouvé')
          rafRef.current = requestAnimationFrame(() => scanFrame(jsQR))
        }
        return
      }
    }
    rafRef.current = requestAnimationFrame(() => scanFrame(jsQR))
  }

  const nomBougie = bougies.find(b => b.id === selectedBougie)?.nom
  const selectedArticle = bougies.find(b => b.id === selectedBougie)
  const nomLieu   = lieux.find(l => l.id === selectedLieu)?.nom
  const qteNum    = Number(qte)

  // Grouper les bougies par famille > sous-famille pour le select
  function buildOptions() {
    const groups = {}
    bougies.forEach(b => {
      const fam  = b.familles?.nom    || 'Sans famille'
      const sfam = b.sous_familles?.nom || ''
      const grp  = sfam ? fam + ' › ' + sfam : fam
      if (!groups[grp]) groups[grp] = []
      const desc = b.description ? ' — ' + b.description : ''
      groups[grp].push({ id: b.id, label: b.nom + desc })
    })
    return groups
  }

  const optionGroups = buildOptions()

  async function handleEntree() {
    setError(''); setSuccess('')
    if (!selectedLieu || !selectedBougie) { setError('Sélectionne un lieu et un article.'); return }
    if (!qte || qteNum <= 0) { setError('La quantité doit être supérieure à 0.'); return }
    setSaving(true)

    const { data: current } = await supabase
      .from('stock_par_lieu').select('*')
      .eq('bougie_id', selectedBougie).eq('lieu_id', selectedLieu).single()

    await supabase.from('stock_par_lieu').upsert({
      bougie_id: selectedBougie,
      lieu_id: selectedLieu,
      quantite: (current?.quantite || 0) + qteNum,
      seuil_alerte: current?.seuil_alerte ?? null,
    }, { onConflict: 'bougie_id,lieu_id' })

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
    setSaving(false)
  }

  function reset() {
    setSelectedLieu(''); setSelectedBougie(''); setQte(''); setMotif('')
    setError(''); setSuccess(''); setScanMsg(''); setScanError('')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-stone-200 bg-white">
        <h1 className="font-serif font-bold text-xl text-stone-800">Entrée de stock</h1>
        <p className="text-stone-500 text-sm mt-0.5">Enregistrer une réception ou un réapprovisionnement d'articles</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="card max-w-lg mx-auto space-y-5">

          {/* Lieu */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Lieu de réception</label>
            <select className="input-field" value={selectedLieu}
              onChange={e => { setSelectedLieu(e.target.value); setQte(''); setError(''); setSuccess('') }}>
              <option value="">Sélectionner un lieu…</option>
              {lieux.map(l => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>

          {/* Article — groupé par famille/sous-famille + bouton scan + info */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Référence article</label>
            <div className="flex gap-2">
              <select className="input-field" value={selectedBougie}
                onChange={e => { setSelectedBougie(e.target.value); setError(''); setSuccess('') }}>
                <option value="">Sélectionner ou scanner…</option>
                {Object.entries(optionGroups).sort(([a],[b]) => a.localeCompare(b)).map(([grp, items]) => (
                  <optgroup key={grp} label={grp}>
                    {items.map(item => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
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

            {/* Zone caméra */}
            {scanning && (
              <div className="mt-3 rounded-xl overflow-hidden border border-stone-200 bg-black relative">
                <video ref={videoRef} className="w-full max-h-56 object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-44 h-44 border-2 border-green-400 rounded-xl opacity-80" />
                </div>
                <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
                  {scanMsg}
                </p>
              </div>
            )}
            {scanError && <p className="text-xs text-red-600 mt-1">{scanError}</p>}
            {!scanning && scanMsg && selectedBougie && (
              <p className="text-xs text-green-600 mt-1">{scanMsg}</p>
            )}
          </div>

          {/* Quantité */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Quantité reçue</label>
            <input type="number" min="1" className="input-field" placeholder="ex : 48"
              value={qte} onChange={e => { setQte(e.target.value); setError(''); setSuccess('') }}
              disabled={!selectedBougie} />
          </div>

          {/* Motif */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Motif (optionnel)</label>
            <input type="text" className="input-field"
              placeholder="ex : Livraison fournisseur, Don…"
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

      {/* Popup fiche article */}
      {showInfo && selectedArticle && (
        <Modal title={'Fiche article — ' + selectedArticle.nom} onClose={() => setShowInfo(false)} size="sm">
          <div className="space-y-4">
            {selectedArticle.photo_url
              ? <img src={selectedArticle.photo_url} alt={selectedArticle.nom}
                  className="w-full max-h-48 object-contain rounded-xl border border-stone-100" />
              : <div className="w-full h-32 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                  <Flame className="w-10 h-10 text-amber-200" />
                </div>
            }
            {(selectedArticle.familles?.nom || selectedArticle.sous_familles?.nom) && (
              <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
                {selectedArticle.familles?.nom}{selectedArticle.sous_familles?.nom ? ' › ' + selectedArticle.sous_familles.nom : ''}
              </p>
            )}
            {selectedArticle.description
              ? <p className="text-sm text-stone-600">{selectedArticle.description}</p>
              : <p className="text-sm text-stone-400 italic">Aucune description pour cet article.</p>
            }
          </div>
        </Modal>
      )}
    </div>
  )
}
