import { useCallback, useEffect, useRef, useState } from 'react'

export interface LoadState<T> {
  data: T | undefined
  loading: boolean
  error: string
  reload: () => Promise<void>
  setData: (value: T) => void
}

/**
 * Memuat data dari sebuah fungsi. Bila `intervalMs` diberikan, data diperbarui
 * berkala di latar belakang tanpa menampilkan indikator memuat ulang.
 */
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = [], intervalMs = 0): LoadState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const run = useCallback(async function (silent: boolean) {
    if (!silent) setLoading(true)
    try {
      const result = await loaderRef.current()
      setData(result)
      setError('')
    } catch (failure) {
      if (!silent) setError((failure as Error).message)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  const reload = useCallback(
    function () {
      return run(true)
    },
    [run],
  )

  useEffect(
    function loadNow() {
      run(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  )

  useEffect(
    function poll() {
      if (!intervalMs) return
      const timer = window.setInterval(function () {
        if (!document.hidden) run(true)
      }, intervalMs)
      return function () {
        window.clearInterval(timer)
      }
    },
    [intervalMs, run],
  )

  return { data, loading, error, reload, setData }
}
