import { X } from 'lucide-react'

export default function Modal({ title, onClose, children, size = 'md' }) {
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full ${widths[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200">
          <h2 className="font-serif font-bold text-stone-800 text-lg">{title}</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
