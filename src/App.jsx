import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import StockPage from './components/stock/StockPage'
import TransfertPage from './components/stock/TransfertPage'
import HistoriquePage from './components/history/HistoriquePage'
import AdminPage from './components/admin/AdminPage'

function AppInner() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('stock')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400 text-sm">Chargement…</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const pages = {
    stock: <StockPage />,
    historique: <HistoriquePage />,
    transfert: <TransfertPage />,
    admin: <AdminPage />,
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar page={page} setPage={setPage} />
        <main className="flex-1 overflow-hidden">
          {pages[page] || <StockPage />}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}
