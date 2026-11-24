import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'

type ToastKind = 'success' | 'error'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const TOAST_DURATION_MS = 4500

export function ToastProvider(props: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback(function (id: number) {
    setItems(function (current) {
      return current.filter(function (item) {
        return item.id !== id
      })
    })
  }, [])

  const push = useCallback(
    function (kind: ToastKind, message: string) {
      const id = Date.now() + Math.random()
      setItems(function (current) {
        return [...current, { id, kind, message }]
      })
      window.setTimeout(function () {
        dismiss(id)
      }, TOAST_DURATION_MS)
    },
    [dismiss],
  )

  const api = useMemo(
    function () {
      return {
        success: function (message: string) {
          push('success', message)
        },
        error: function (message: string) {
          push('error', message)
        },
      }
    },
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {props.children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3">
        {items.map(function (item) {
          return <ToastCard key={item.id} item={item} onClose={dismiss} />
        })}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard(props: { item: ToastItem; onClose: (id: number) => void }) {
  const isError = props.item.kind === 'error'
  const Icon = isError ? CircleAlert : CheckCircle2
  const tone = isError ? 'border-coral-300 bg-white text-coral-700' : 'border-teal-300 bg-white text-teal-800'

  function close() {
    props.onClose(props.item.id)
  }

  return (
    <div role="status" className={'toast-in pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl shadow-sea-950/10 ' + tone}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{props.item.message}</p>
      <button type="button" onClick={close} aria-label="Tutup" className="rounded-md p-0.5 opacity-60 hover:opacity-100">
        <X className="size-4" />
      </button>
    </div>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus dipakai di dalam ToastProvider')
  return context
}
