import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Bell, Bot, Building2, ClipboardList, Fish, LayoutDashboard, ListOrdered, LogOut, Menu, ReceiptText, Ship, ShieldCheck, UserCog, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { Avatar, Badge } from '../components/ui/Display'
import { useAuth } from '../context/AuthContext'
import { useLoad } from '../hooks/useLoad'
import { orderService } from '../services'
import { POLL_INTERVAL_MS } from '../config/api'
import { ROLE_LABEL } from '../utils/labels'
import type { Permission } from '../types'

interface AdminNavItem {
  to: string
  label: string
  icon: LucideIcon
  permission?: Permission
  superadminOnly?: boolean
  end?: boolean
}

const GROUPS: { title: string; items: AdminNavItem[] }[] = [
  {
    title: 'Operasional',
    items: [
      { to: '/admin', label: 'Ringkasan', icon: LayoutDashboard, end: true },
      { to: '/admin/antrean', label: 'Antrean', icon: ListOrdered, permission: 'antrean' },
      { to: '/admin/pesanan', label: 'Pesanan', icon: ClipboardList, permission: 'pesanan' },
      { to: '/admin/transaksi', label: 'Transaksi', icon: ReceiptText, permission: 'transaksi' },
      { to: '/admin/laporan', label: 'Laporan', icon: BarChart3, permission: 'laporan' },
    ],
  },
  {
    title: 'Data',
    items: [
      { to: '/admin/ikan', label: 'Ikan dan harga', icon: Fish, permission: 'ikan' },
      { to: '/admin/pelayaran', label: 'Pelayaran', icon: Ship, permission: 'pelayaran' },
      { to: '/admin/pengumuman', label: 'Pengumuman', icon: Bell, permission: 'pengumuman' },
    ],
  },
  {
    title: 'Pengaturan',
    items: [
      { to: '/admin/pengguna', label: 'Pengguna', icon: Users, permission: 'pengguna' },
      { to: '/admin/admin', label: 'Admin dan akses', icon: ShieldCheck, superadminOnly: true },
      { to: '/admin/asisten', label: 'Asisten AI', icon: Bot, permission: 'asisten' },
      { to: '/admin/usaha', label: 'Profil usaha', icon: Building2, permission: 'usaha' },
      { to: '/admin/profil', label: 'Akun saya', icon: UserCog },
    ],
  },
]

function linkClass(state: { isActive: boolean }) {
  const base = 'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition '
  return base + (state.isActive ? 'bg-teal-400 text-sea-950' : 'text-sea-200 hover:bg-white/8 hover:text-white')
}

export function AdminLayout() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const canSeeOrders = auth.can('pesanan')
  const pending = useLoad(
    function () {
      return canSeeOrders ? orderService.all() : Promise.resolve([])
    },
    [canSeeOrders],
    POLL_INTERVAL_MS,
  )
  const waitingCount = (pending.data || []).filter(function (order) {
    return order.status === 'menunggu'
  }).length
  const user = auth.user

  async function leave() {
    await auth.logout()
    navigate('/masuk', { replace: true })
  }

  function toggle() {
    setOpen(!open)
  }

  function close() {
    setOpen(false)
  }

  if (!user) return null

  function visible(item: AdminNavItem) {
    if (item.superadminOnly) return user!.role === 'superadmin'
    if (item.permission) return auth.can(item.permission)
    return true
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sea-950 text-white">
      <div className="flex items-center justify-between px-5 py-5">
        <Logo tone="light" />
        <button type="button" onClick={close} aria-label="Tutup menu" className="rounded-lg p-1.5 text-sea-300 hover:bg-white/10 lg:hidden">
          <X className="size-5" />
        </button>
      </div>
      <nav className="scroll-thin flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {GROUPS.map(function (group) {
          const items = group.items.filter(visible)
          if (items.length === 0) return null
          return (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sea-400">{group.title}</p>
              <div className="space-y-1">
                {items.map(function (item) {
                  return (
                    <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={close}>
                      <item.icon className="size-[18px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.to === '/admin/pesanan' && waitingCount > 0 ? <span className="rounded-full bg-coral-500 px-2 py-0.5 text-[11px] font-bold text-white">{waitingCount}</span> : null}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.username} src={user.avatar} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{user.username}</p>
            <Badge tone="success">{ROLE_LABEL[user.role]}</Badge>
          </div>
          <button type="button" onClick={leave} aria-label="Keluar" className="rounded-lg p-2 text-sea-300 hover:bg-white/10 hover:text-white">
            <LogOut className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 lg:block">{sidebar}</aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Tutup menu" onClick={close} className="absolute inset-0 bg-sea-950/60 backdrop-blur-sm" />
          <aside className="absolute inset-y-0 left-0 w-[85%] max-w-72 shadow-2xl">{sidebar}</aside>
        </div>
      ) : null}

      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sea-100 bg-white/85 px-4 backdrop-blur-xl lg:hidden">
        <button type="button" onClick={toggle} aria-label="Buka menu" className="grid size-10 place-items-center rounded-xl text-sea-800 hover:bg-sea-100">
          <Menu className="size-5" />
        </button>
        <Logo />
      </header>

      <main key={location.pathname} className="rise mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
