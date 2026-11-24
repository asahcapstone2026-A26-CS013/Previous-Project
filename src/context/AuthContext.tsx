import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SESSION_STORAGE_KEY } from '../config/api'
import { authService } from '../services'
import { UNAUTHORIZED_EVENT } from '../services/http'
import type { Permission, User } from '../types'

interface AuthApi {
  user: User | null
  ready: boolean
  isStaff: boolean
  can: (permission: Permission) => boolean
  login: (username: string, password: string) => Promise<User>
  register: (username: string, password: string, phone: string) => Promise<User>
  logout: () => Promise<void>
  replaceUser: (user: User) => void
}

const AuthContext = createContext<AuthApi | null>(null)

export function AuthProvider(props: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const clearSession = useCallback(function () {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    setUser(null)
  }, [])

  useEffect(
    function restoreSession() {
      const token = localStorage.getItem(SESSION_STORAGE_KEY)
      if (!token) {
        setReady(true)
        return
      }
      authService
        .me()
        .then(setUser)
        .catch(clearSession)
        .finally(function () {
          setReady(true)
        })
    },
    [clearSession],
  )

  useEffect(
    function listenUnauthorized() {
      window.addEventListener(UNAUTHORIZED_EVENT, clearSession)
      return function () {
        window.removeEventListener(UNAUTHORIZED_EVENT, clearSession)
      }
    },
    [clearSession],
  )

  const login = useCallback(async function (username: string, password: string) {
    const session = await authService.login(username, password)
    localStorage.setItem(SESSION_STORAGE_KEY, session.token)
    setUser(session.user)
    return session.user
  }, [])

  const register = useCallback(async function (username: string, password: string, phone: string) {
    const session = await authService.register(username, password, phone)
    localStorage.setItem(SESSION_STORAGE_KEY, session.token)
    setUser(session.user)
    return session.user
  }, [])

  const logout = useCallback(
    async function () {
      try {
        await authService.logout()
      } catch (_error) {
        // Sesi lokal tetap dihapus walau server tidak terjangkau.
      }
      clearSession()
    },
    [clearSession],
  )

  const value = useMemo(
    function (): AuthApi {
      const isStaff = Boolean(user && (user.role === 'admin' || user.role === 'superadmin'))
      return {
        user,
        ready,
        isStaff,
        can: function (permission: Permission) {
          if (!user) return false
          if (user.role === 'superadmin') return true
          return user.role === 'admin' && user.permissions.indexOf(permission) >= 0
        },
        login,
        register,
        logout,
        replaceUser: setUser,
      }
    },
    [user, ready, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
}

export function useAuth(): AuthApi {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return context
}
