import { useCallback, useState } from 'react'
import { useToast } from '../context/ToastContext'

export interface ActionResult<T> {
  ok: boolean
  value?: T
}

/** Membungkus aksi async: menampilkan status proses, notifikasi berhasil, dan pesan galat. */
export function useAction() {
  const toast = useToast()
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async function <T>(action: () => Promise<T>, successMessage?: string): Promise<ActionResult<T>> {
      setBusy(true)
      try {
        const value = await action()
        if (successMessage) toast.success(successMessage)
        return { ok: true, value }
      } catch (failure) {
        toast.error((failure as Error).message)
        return { ok: false }
      } finally {
        setBusy(false)
      }
    },
    [toast],
  )

  return { busy, run }
}
