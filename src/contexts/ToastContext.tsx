import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

const DISMISS_AFTER_MS = 3500

const variantClasses: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 dark:bg-emerald-500',
  error: 'bg-red-600 dark:bg-red-500',
  info: 'bg-slate-900 dark:bg-slate-100 dark:text-slate-900',
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Mount hidden, then flip to visible on the next frame so the
    // transition classes actually animate in instead of snapping.
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div
      role="status"
      onClick={() => onDismiss(toast.id)}
      className={[
        'pointer-events-auto w-full max-w-sm cursor-pointer rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out',
        variantClasses[toast.variant],
        visible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0',
      ].join(' ')}
    >
      {toast.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, variant }])
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Fixed at the top so it never collides with the mobile bottom nav
          or the quick-add FAB, both of which live at the bottom of the
          screen on mobile. */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
