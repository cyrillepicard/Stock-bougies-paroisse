import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import LoginPage from './components/auth/LoginPage'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import StockPage from './components/stock/StockPage'
import EntreePage from './components/stock/EntreePage'
import SortiePage from './components/stock/SortiePage'
import TransfertPage from './components/stock/TransfertPage'
import HistoriquePage from './components/history/HistoriquePage'
import AdminPage from './components/admin/AdminPage'

function AppInner() {
  const { user, isAdmin, loading } = useAuth()
  const [page, setPage] = useState('stock')

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-stone-400 text-sm">Chargement…</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  const safePage = (page === 'historique' || page === 'admin') && !isAdmin ? 'stock' : page

  const pages = {
    stock:      <StockPage />,
    entree:     <EntreePage />,
    sortie:     <SortiePage />,
    transfert:  <TransfertPage />,
    historique: isAdmin ? <HistoriquePage /> : <StockPage />,
    admin:      isAdmin ? <AdminPage />      : <StockPage />,
  }

  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar page={safePage} setPage={setPage} />
        <main className="flex-1 overflow-hidden">
          {pages[safePage] || <StockPage />}
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
