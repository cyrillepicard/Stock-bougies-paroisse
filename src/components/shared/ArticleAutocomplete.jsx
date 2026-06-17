import { useState, useRef, useEffect } from 'react'
import { X, Flame } from 'lucide-react'

/**
 * Saisie assistée pour sélectionner un article.
 * Props :
 *   articles       — tableau de bougies avec familles(nom), sous_familles(nom), photo_url
 *   value          — id de l'article sélectionné
 *   onChange(id)   — appelé quand la sélection change (null pour effacer)
 *   placeholder    — texte du champ vide
 *   disabled       — désactiver le champ
 */
export default function ArticleAutocomplete({ articles = [], value, onChange, placeholder = 'Rechercher un article…', disabled = false }) {
  const selected = articles.find(a => a.id === value) || null
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Quand la sélection externe change, vider la query
  useEffect(() => { if (!value) setQuery('') }, [value])

  function normalize(str) {
    return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  }

  const filtered = query.trim().length === 0
    ? articles
    : articles.filter(a => {
        const q = normalize(query)
        return (
          normalize(a.nom).includes(q) ||
          normalize(a.description).includes(q) ||
          normalize(a.familles?.nom).includes(q) ||
          normalize(a.sous_familles?.nom).includes(q)
        )
      })

  function select(article) {
    onChange(article.id)
    setQuery('')
    setOpen(false)
  }

  function clear() {
    onChange(null)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
  }

  // Fermer si clic extérieur
  useEffect(() => {
    function onClickOutside(e) {
      if (listRef.current && !listRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative flex-1 min-w-0">
      {/* Champ de saisie */}
      <div className={`flex items-center gap-2 input-field pr-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        {/* Miniature si sélectionné */}
        {selected && (
          selected.photo_url
            ? <img src={selected.photo_url} alt="" className="w-6 h-6 rounded object-cover shrink-0 border border-stone-200" />
            : <div className="w-6 h-6 rounded bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                <Flame className="w-3.5 h-3.5 text-amber-300" />
              </div>
        )}

        {selected && !open
          ? /* Affichage de la sélection */
            <span className="flex-1 text-stone-800 text-sm truncate">{selected.nom}</span>
          : /* Champ de recherche */
            <input
              ref={inputRef}
              type="text"
              className="flex-1 bg-transparent outline-none text-sm text-stone-800 placeholder-stone-400"
              placeholder={selected ? 'Modifier la sélection…' : placeholder}
              value={query}
              disabled={disabled}
              onChange={e => { setQuery(e.target.value); setOpen(true) }}
              onFocus={() => setOpen(true)}
            />
        }

        {/* Bouton effacer / ouvrir */}
        {selected
          ? <button type="button" onClick={clear} className="shrink-0 text-stone-300 hover:text-red-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          : <button type="button" onClick={() => { setOpen(o => !o); inputRef.current?.focus() }}
              className="shrink-0 text-stone-300 hover:text-stone-500 transition-colors text-xs px-1">
              ▾
            </button>
        }
      </div>

      {/* Liste de suggestions */}
      {open && !disabled && (
        <ul ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white border border-stone-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 && (
            <li className="px-4 py-3 text-sm text-stone-400 italic">Aucun article trouvé</li>
          )}
          {filtered.map(a => {
            const famLabel = a.familles?.nom
              ? a.familles.nom + (a.sous_familles?.nom ? ' › ' + a.sous_familles.nom : '')
              : null
            return (
              <li key={a.id}
                onMouseDown={() => select(a)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-amber-50 transition-colors
                  ${a.id === value ? 'bg-amber-50' : ''}`}>
                {a.photo_url
                  ? <img src={a.photo_url} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-100" />
                  : <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Flame className="w-4 h-4 text-amber-200" />
                    </div>
                }
                <div className="min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{a.nom}</p>
                  <div className="flex gap-2 flex-wrap">
                    {famLabel && <span className="text-xs text-amber-600">{famLabel}</span>}
                    {a.description && <span className="text-xs text-stone-400 truncate">{a.description}</span>}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
