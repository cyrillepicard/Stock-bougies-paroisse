import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../shared/Modal'
import { Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import Papa from 'papaparse'

export default function ImportCSV({ lieux, bougies, userEmail, onClose, onDone }) {
  const [rows, setRows] = useState([])
  const [parsed, setParsed] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    Papa.parse(file, {
      delimiter: ';',
      skipEmptyLines: true,
      complete: ({ data }) => {
        const validated = data.map((row, i) => {
          const [nom_raw, lieu_raw, qte_raw] = row.map(c => c?.trim())
          const bougie = bougies.find(b => b.nom.toLowerCase() === nom_raw?.toLowerCase())
          const lieu = lieux.find(l => l.nom.toLowerCase() === lieu_raw?.toLowerCase())
          const quantite = parseInt(qte_raw)
          const errors = []
          if (!bougie) errors.push(`Bougie inconnue : "${nom_raw}"`)
          if (!lieu) errors.push(`Lieu inconnu : "${lieu_raw}"`)
          if (isNaN(quantite) || quantite <= 0) errors.push(`Quantité invalide : "${qte_raw}"`)
          return {
            line: i + 1,
            nom_raw, lieu_raw, qte_raw,
            bougie, lieu, quantite,
            errors,
            valid: errors.length === 0,
          }
        })
        setRows(validated)
        setParsed(true)
      }
    })
  }

  async function handleImport() {
    setImporting(true)
    const validRows = rows.filter(r => r.valid)

    for (const r of validRows) {
      // Récupérer stock actuel
      const { data: current } = await supabase
        .from('stock_par_lieu')
        .select('quantite, seuil_alerte')
        .eq('bougie_id', r.bougie.id)
        .eq('lieu_id', r.lieu.id)
        .single()

      const newQte = (current?.quantite || 0) + r.quantite

      await supabase.from('stock_par_lieu').upsert({
        bougie_id: r.bougie.id,
        lieu_id: r.lieu.id,
        quantite: newQte,
        seuil_alerte: current?.seuil_alerte ?? null,
      }, { onConflict: 'bougie_id,lieu_id' })

      await supabase.from('mouvements').insert({
        bougie_id: r.bougie.id,
        lieu_id: r.lieu.id,
        type: 'import_csv',
        quantite: r.quantite,
        motif: 'Import CSV',
        user_email: userEmail,
      })
    }

    setImporting(false)
    onDone()
  }

  const validCount = rows.filter(r => r.valid).length
  const errorCount = rows.filter(r => !r.valid).length

  return (
    <Modal title="Import CSV" onClose={onClose} size="lg">
      <div className="space-y-4">
        {/* Zone de dépôt / sélection */}
        <div
          className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center cursor-pointer hover:border-amber-400 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-8 h-8 text-stone-400 mx-auto mb-2" />
          <p className="text-stone-600 font-medium">Cliquer pour sélectionner un fichier CSV</p>
          <p className="text-stone-400 text-sm mt-1">Format attendu : <code className="bg-stone-100 px-1 rounded">nom_bougie ; lieu ; quantite</code></p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
        </div>

        {/* Résultats de validation */}
        {parsed && (
          <>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{validCount} ligne{validCount !== 1 ? 's' : ''} valide{validCount !== 1 ? 's' : ''}</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
                  <XCircle className="w-4 h-4" />
                  <span>{errorCount} erreur{errorCount !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border border-stone-200">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-stone-500 text-xs w-10">#</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500 text-xs">Bougie</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500 text-xs">Lieu</th>
                    <th className="text-right px-3 py-2 font-medium text-stone-500 text-xs">Qté</th>
                    <th className="text-left px-3 py-2 font-medium text-stone-500 text-xs">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.line} className={`border-t border-stone-100 ${r.valid ? '' : 'bg-red-50'}`}>
                      <td className="px-3 py-2 text-stone-400">{r.line}</td>
                      <td className="px-3 py-2">{r.nom_raw}</td>
                      <td className="px-3 py-2">{r.lieu_raw}</td>
                      <td className="px-3 py-2 text-right">{r.qte_raw}</td>
                      <td className="px-3 py-2">
                        {r.valid
                          ? <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> OK</span>
                          : <span className="text-red-600 text-xs">{r.errors.join(' · ')}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {errorCount > 0 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Les lignes en erreur ne seront pas importées. Seules les {validCount} lignes valides seront traitées.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
              <button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="btn-primary flex-1"
              >
                {importing ? 'Import en cours…' : `Importer ${validCount} ligne${validCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
