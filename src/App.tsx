import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigError } from './components/ConfigError'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { Layout } from './components/Layout'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { ProtectedRoute } from './components/ProtectedRoute'
import { DashboardPage } from './pages/Dashboard'
import { DebtsPage } from './pages/Debts'
import { ExpensesPage } from './pages/Expenses'
import { IncomePage } from './pages/Income'
import { LoginPage } from './pages/Login'
import { SavingsPage } from './pages/Savings'
import { SignUpPage } from './pages/SignUp'
import { ChangePasswordPage } from './pages/ChangePassword'
import { WalletsPage } from './pages/Wallets'
import { CreditCardsPage } from './pages/CreditCards'
import { ReportsPage } from './pages/Reports'
import { TransactionsPage } from './pages/Transactions'

export default function App() {
  return (
    <ThemeProvider>
      {!isSupabaseConfigured ? (
        <ConfigError />
      ) : (
        <AuthProvider>
          {/* HashRouter avoids 404s on GitHub Pages refresh for project sites */}
          <HashRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignUpPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/expenses" element={<ExpensesPage />} />
                  <Route path="/income" element={<IncomePage />} />
                  <Route path="/transactions" element={<TransactionsPage />} />
                  <Route path="/debts" element={<DebtsPage />} />
                  <Route path="/credit-cards" element={<CreditCardsPage />} />
                  <Route path="/savings" element={<SavingsPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/wallets" element={<WalletsPage />} />
                  <Route path="/change-password" element={<ChangePasswordPage />} />
                </Route>
              </Route>

              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HashRouter>
        </AuthProvider>
      )}
    </ThemeProvider>
  )
}
