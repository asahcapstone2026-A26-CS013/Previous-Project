import type { OrderStatus, TicketStatus, VoyageStatus } from '../types'

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone }> = {
  menunggu: { label: 'Menunggu', tone: 'warning' },
  dikonfirmasi: { label: 'Dikonfirmasi', tone: 'info' },
  ditolak: { label: 'Ditolak', tone: 'danger' },
  dibatalkan: { label: 'Dibatalkan', tone: 'neutral' },
  selesai: { label: 'Selesai', tone: 'success' },
}

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone }> = {
  menunggu: { label: 'Menunggu', tone: 'warning' },
  dipanggil: { label: 'Dipanggil', tone: 'info' },
  dilewati: { label: 'Dilewati', tone: 'danger' },
  selesai: { label: 'Selesai', tone: 'success' },
  dibatalkan: { label: 'Dibatalkan', tone: 'neutral' },
}

export const VOYAGE_STATUS: Record<VoyageStatus, { label: string; tone: Tone }> = {
  berlayar: { label: 'Berlayar', tone: 'info' },
  tiba: { label: 'Tiba', tone: 'success' },
  selesai: { label: 'Selesai', tone: 'neutral' },
}

export const ROLE_LABEL = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'Pelanggan',
}
