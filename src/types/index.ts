export type Role = 'superadmin' | 'admin' | 'user'

export type Permission =
  | 'ikan'
  | 'harga'
  | 'pelayaran'
  | 'antrean'
  | 'pesanan'
  | 'transaksi'
  | 'laporan'
  | 'pengumuman'
  | 'pengguna'
  | 'asisten'
  | 'usaha'

export const PERMISSION_LABELS: Record<Permission, string> = {
  ikan: 'Kelola ikan dan stok',
  harga: 'Ubah harga acuan',
  pelayaran: 'Kelola pelayaran',
  antrean: 'Kelola antrean',
  pesanan: 'Kelola pesanan',
  transaksi: 'Catat transaksi',
  laporan: 'Lihat laporan',
  pengumuman: 'Kirim pengumuman',
  pengguna: 'Kelola pengguna',
  asisten: 'Atur asisten AI',
  usaha: 'Ubah profil usaha',
}

export const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS) as Permission[]

export interface User {
  id: string
  username: string
  role: Role
  permissions: Permission[]
  avatar: string
  phone: string
  disabled: boolean
  createdAt: string
}

export interface Fish {
  id: string
  name: string
  price: number
  stock: number
  estimatedKg: number
  image: string
  active: boolean
}

export interface PriceEntry {
  price: number
  by: string
  at: string
}

export type VoyageStatus = 'berlayar' | 'tiba' | 'selesai'

export interface Voyage {
  id: string
  name: string
  status: VoyageStatus
  arrivalAt: string
  estimatedTons: number
  note: string
}

export interface BankAccount {
  bank: string
  accountNumber: string
  holder: string
}

export interface Business {
  name: string
  phone: string
  address: string
  about: string
  logo: string
  lat: number
  lng: number
  banks: BankAccount[]
}

export type TicketStatus = 'menunggu' | 'dipanggil' | 'dilewati' | 'selesai' | 'dibatalkan'

export interface Ticket {
  id: string
  number: number
  userId: string | null
  name: string
  phone: string
  walkIn: boolean
  status: TicketStatus
  createdAt: string
  position: number
  estimateMinutes: number
}

export interface QueueSession {
  id: string
  status: 'buka' | 'tutup'
  openedAt: string
}

export interface QueueState {
  session: QueueSession | null
  mine: Ticket | null
  waiting: number
  nowServing: number
  averageMinutes: number
}

export interface QueueBoard {
  session: QueueSession | null
  tickets: Ticket[]
  averageMinutes: number
}

export type OrderStatus = 'menunggu' | 'dikonfirmasi' | 'ditolak' | 'dibatalkan' | 'selesai'

export interface OrderItem {
  fishId: string
  name: string
  kg: number
  price: number
  subtotal: number
}

export interface Order {
  id: string
  code: string
  userId: string
  customerName: string
  phone: string
  items: OrderItem[]
  subtotal: number
  shippingFee: number
  total: number
  payment: 'cod' | 'transfer'
  bank: string
  delivery: 'dermaga' | 'antar'
  address: string
  note: string
  status: OrderStatus
  paid: boolean
  hasProof: boolean
  reason: string
  createdAt: string
}

export interface SaleItem {
  fishId: string
  name: string
  kg: number
  pricePerKg: number
  subtotal: number
}

export interface Sale {
  id: string
  date: string
  customerName: string
  phone: string
  address: string
  source: 'dermaga' | 'aplikasi'
  payment: string
  items: SaleItem[]
  total: number
  stockManaged: boolean
}

export interface AppNotification {
  id: string
  userId: string | null
  kind: 'pengumuman' | 'pesanan' | 'antrean'
  title: string
  message: string
  createdAt: string
  read: boolean
}

export interface Announcement {
  id: string
  title: string
  message: string
  createdAt: string
}

export type Intent = 'produk_harga' | 'jadwal_lokasi' | 'antrean_pemesanan' | 'keluhan' | 'luar_konteks'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  intent: Intent | ''
  at: string
}

export interface AssistantProfile {
  name: string
  avatar: string
  greeting: string
  enabled: boolean
}

export interface AssistantSettings {
  name: string
  avatar: string
  greeting: string
  instruction: string
  model: string
  thinking: boolean
  enabled: boolean
  hasKey: boolean
  keyHint: string
}

export interface Conversation {
  userId: string
  username: string
  count: number
  lastAt: string
  intents: Record<string, number>
}

export interface Report {
  month: string
  totalSales: number
  totalOrders: number
  averageOrder: number
  bySource: { dermaga: number; aplikasi: number }
  byFish: { name: string; kg: number; total: number }[]
  byDay: { day: string; total: number }[]
  byHour: { hour: string; count: number }[]
}
