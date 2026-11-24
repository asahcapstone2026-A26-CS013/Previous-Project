import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { businessService } from '../services'
import type { Business } from '../types'

const FALLBACK: Business = {
  name: 'KM. Karya Lestari',
  phone: '',
  address: '',
  about: '',
  logo: '',
  lat: 1.7427,
  lng: 98.7792,
  banks: [],
}

interface BusinessApi {
  business: Business
  refresh: () => Promise<void>
}

const BusinessContext = createContext<BusinessApi | null>(null)

export function BusinessProvider(props: { children: ReactNode }) {
  const [business, setBusiness] = useState<Business>(FALLBACK)

  const refresh = useCallback(async function () {
    try {
      setBusiness(await businessService.get())
    } catch (_error) {
      setBusiness(FALLBACK)
    }
  }, [])

  useEffect(
    function loadOnMount() {
      refresh()
    },
    [refresh],
  )

  const value = useMemo(
    function () {
      return { business, refresh }
    },
    [business, refresh],
  )

  return <BusinessContext.Provider value={value}>{props.children}</BusinessContext.Provider>
}

export function useBusiness(): BusinessApi {
  const context = useContext(BusinessContext)
  if (!context) throw new Error('useBusiness harus dipakai di dalam BusinessProvider')
  return context
}
