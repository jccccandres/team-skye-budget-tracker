export const SHOW_FAB_STORAGE_KEY = 'budget-tracker-show-fab'
export const DEFAULT_SHOW_FAB = true

export function loadShowFab(): boolean {
  try {
    const stored = localStorage.getItem(SHOW_FAB_STORAGE_KEY)
    if (stored === 'true') return true
    if (stored === 'false') return false
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_SHOW_FAB
}

export function saveShowFab(showFab: boolean) {
  try {
    localStorage.setItem(SHOW_FAB_STORAGE_KEY, String(showFab))
  } catch {
    // ignore
  }
}
