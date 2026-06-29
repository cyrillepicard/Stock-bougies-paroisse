import { Flame } from 'lucide-react'
import Modal from './Modal'

export default function ArticleInfoModal({ article, onClose }) {
  if (!article) return null
  return (
    <Modal title={'Fiche article — ' + article.nom} onClose={onClose} size="sm">
      <div className="space-y-4">
        {article.photo_url
          ? <img src={article.photo_url} alt={article.nom}
              className="w-full max-h-48 object-contain rounded-xl border border-stone-100" />
          : <div className="w-full h-32 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
              <Flame className="w-10 h-10 text-amber-200" />
            </div>
        }
        {(article.familles?.nom || article.sous_familles?.nom) && (
          <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded inline-block">
            {article.familles?.nom}{article.sous_familles?.nom ? ' › ' + article.sous_familles.nom : ''}
          </p>
        )}
        {article.description
          ? <p className="text-sm text-stone-600">{article.description}</p>
          : <p className="text-sm text-stone-400 italic">Aucune description pour cet article.</p>
        }
      </div>
    </Modal>
  )
}
