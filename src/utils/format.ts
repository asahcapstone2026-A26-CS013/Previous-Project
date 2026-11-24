const rupiahFormat = new Intl.NumberFormat('id-ID')

export function rupiah(value: number): string {
  return 'Rp ' + rupiahFormat.format(Math.round(value))
}

export function kilogram(value: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(value) + ' kg'
}

export function dateTime(value: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function dateOnly(value: string): string {
  if (!value) return '-'
  const date = new Date(value.length === 10 ? value + 'T00:00:00' : value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function timeOnly(value: string): string {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

export function todayInput(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return now.getFullYear() + '-' + month + '-' + day
}

export function monthInput(): string {
  return todayInput().slice(0, 7)
}

export function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase()
}

export function toLocalInput(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 16)
  const offset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

export function whatsappLink(text: string, phone = ''): string {
  const digits = phone.replace(/\D/g, '')
  const target = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  return 'https://wa.me/' + target + '?text=' + encodeURIComponent(text)
}
