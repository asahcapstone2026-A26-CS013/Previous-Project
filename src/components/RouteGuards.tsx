import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './ui/Display'
import type { Permission } from '../types'

export function homeFor(isStaff: boolean): string {
  return isStaff ? '/admin' : '/beranda'
}

export function GuestOnly() {
  const auth = useAuth()
  if (!auth.ready) return <Spinner />
  if (auth.user) return <Navigate to={homeFor(auth.isStaff)} replace />
  return <Outlet />
}

export function CustomerOnly() {
  const auth = useAuth()
  if (!auth.ready) return <Spinner />
  if (!auth.user) return <Navigate to="/masuk" replace />
  if (auth.isStaff) return <Navigate to="/admin" replace />
  return <Outlet />
}

export function StaffOnly() {
  const auth = useAuth()
  if (!auth.ready) return <Spinner />
  if (!auth.user) return <Navigate to="/masuk" replace />
  if (!auth.isStaff) return <Navigate to="/beranda" replace />
  return <Outlet />
}

export function RequirePermission(props: { permission?: Permission; superadmin?: boolean }) {
  const auth = useAuth()
  const allowed = props.superadmin ? auth.user?.role === 'superadmin' : props.permission ? auth.can(props.permission) : true
  if (!allowed) return <Navigate to="/admin" replace />
  return <Outlet />
}
