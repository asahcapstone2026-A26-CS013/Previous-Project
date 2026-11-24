import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Bot, ClipboardList, Fish, Home, ListOrdered, LogOut, MapPin } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { Avatar } from '../components/ui/Display'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { notificationService } from '../services'
import { POLL_INTERVAL_MS } from '../config/api'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const PRIMARY: NavItem[] = [
  { to: '/beranda', label: 'Beranda', icon: Home },
  { to: '/antrean', label: 'Antrean', icon: ListOrdered },
  { to: '/katalog', label: 'Katalog', icon: Fish },
  { to: '/pesanan', label: 'Pesanan', icon: ClipboardList },
  { to: '/asisten', label: 'Asisten', icon: Bot },
]

function navClass(state: { isActive: boolean }) {
  const base = 'flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition '
  return base + (state.isActive ? 'bg-sea-900 text-white' : 'text-sea-700 hover:bg-sea-100')
}

function tabClass(state: { isActive: boolean }) {
  const base = 'flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-bold transition '
  return base + (state.isActive ? 'text-sea-900' : 'text-sea-400')
}

function iconWrap(active: boolean) {
  return 'grid h-7 w-12 place-items-center rounded-full transition ' + (active ? 'bg-teal-200' : '')
}

export function CustomerLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const notifications = useLoad(notificationService.list, [], POLL_INTERVAL_MS)
  const unread = notifications.data ? notifications.data.unread : 0
  const user = auth.user

  async function leave() {
    setLeaving(true)
    await auth.logout()
    navigate('/masuk', { replace: true })
  }

  if (!user) return null

  return (
    <div className="min-h-dvh pb-24 lg:pb-0">
      <header className="sticky top-0 z-30 border-b border-sea-100 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <NavLink to="/beranda" className="shrink-0">
            <Logo />
          </NavLink>
          <nav className="ml-6 hidden items-center gap-1 lg:flex">
            {PRIMARY.map(function (item) {
              return (
                <NavLink key={item.to} to={item.to} className={navClass}>
                  <item.icon className="size-4" />
                  {item.label}
                </NavLink>
              )
            })}
            <NavLink to="/lokasi" className={navClass}>
              <MapPin className="size-4" />
              Lokasi
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-1.5">
            <NavLink to="/lokasi" aria-label="Lokasi dermaga" className="grid size-10 place-items-center rounded-xl text-sea-700 hover:bg-sea-100 lg:hidden">
              <MapPin className="size-5" />
            </NavLink>
            <NavLink to="/notifikasi" aria-label="Notifikasi" className="relative grid size-10 place-items-center rounded-xl text-sea-700 hover:bg-sea-100">
              <Bell className="size-5" />
              {unread > 0 ? <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-coral-500 px-1 text-[10px] font-bold leading-4 text-white">{unread > 9 ? '9+' : unread}</span> : null}
            </NavLink>
            <NavLink to="/profil" aria-label="Profil" className="flex items-center gap-2 rounded-xl p-1 hover:bg-sea-100">
              <Avatar name={user.username} src={user.avatar} size={36} />
              <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{user.username}</span>
            </NavLink>
            <button type="button" onClick={leave} disabled={leaving} aria-label="Keluar" className="hidden size-10 place-items-center rounded-xl text-sea-500 hover:bg-coral-50 hover:text-coral-600 sm:grid">
              <LogOut className="size-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Outlet context={{ refreshNotifications: notifications.reload }} />
      </main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sea-100 bg-white/92 px-2 pt-1.5 backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg">
          {PRIMARY.map(function (item) {
            return (
              <NavLink key={item.to} to={item.to} className={tabClass}>
                {function (state) {
                  return (
                    <>
                      <span className={iconWrap(state.isActive)}>
                        <item.icon className="size-5" />
                      </span>
                      {item.label}
                    </>
                  )
                }}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

