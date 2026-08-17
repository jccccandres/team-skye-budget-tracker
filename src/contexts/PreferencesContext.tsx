import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { loadShowFab, saveShowFab } from '../lib/preferences'

interface PreferencesContextValue {
  showFab: boolean
  setShowFab: (show: boolean) => void
  toggleShowFab: () => void
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null)

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [showFab, setShowFabState] = useState(loadShowFab)

  useEffect(() => {
    saveShowFab(showFab)
  }, [showFab])

  const setShowFab = useCallback((next: boolean) => {
    setShowFabState(next)
  }, [])

  const toggleShowFab = useCallback(() => {
    setShowFabState((current) => !current)
  }, [])

  const value = useMemo(
    () => ({
      showFab,
      setShowFab,
      toggleShowFab,
    }),
    [showFab, setShowFab, toggleShowFab],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
