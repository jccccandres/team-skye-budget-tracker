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
import { SignUpPage } from './pages/SignUp'

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
                  <Route path="/debts" element={<DebtsPage />} />
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
