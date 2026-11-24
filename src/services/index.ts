import { getData, http, sendData } from './http'
import type {
  Announcement,
  AppNotification,
  AssistantProfile,
  AssistantSettings,
  Business,
  ChatMessage,
  Conversation,
  Fish,
  Intent,
  Order,
  PriceEntry,
  QueueBoard,
  QueueState,
  Report,
  Sale,
  Ticket,
  User,
  Voyage,
} from '../types'

export interface Session {
  token: string
  user: User
}

export const authService = {
  async login(username: string, password: string): Promise<Session> {
    const response = await http.post('/auth/login', { username, password })
    return response.data as Session
  },
  async register(username: string, password: string, phone: string): Promise<Session> {
    const response = await http.post('/auth/register', { username, password, phone })
    return response.data as Session
  },
  async logout(): Promise<void> {
    await http.post('/auth/logout')
  },
  async me(): Promise<User> {
    const response = await http.get('/auth/me')
    return response.data.user as User
  },
  async updateProfile(input: { username?: string; phone?: string; avatar?: string }): Promise<User> {
    const response = await http.patch('/auth/me', input)
    return response.data.user as User
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await http.put('/auth/me/password', { currentPassword, newPassword })
  },
}

export const userService = {
  list(role: 'user' | 'admin'): Promise<User[]> {
    return getData<User[]>('/users', { role })
  },
  create(input: { username: string; password: string; role: 'user' | 'admin'; phone?: string; permissions?: string[] }): Promise<User> {
    return sendData<User>('post', '/users', input)
  },
  update(id: string, input: Record<string, unknown>): Promise<User> {
    return sendData<User>('patch', '/users/' + id, input)
  },
  remove(id: string): Promise<void> {
    return sendData<void>('delete', '/users/' + id)
  },
}

export const fishService = {
  list(): Promise<Fish[]> {
    return getData<Fish[]>('/fish')
  },
  create(input: Partial<Fish>): Promise<Fish> {
    return sendData<Fish>('post', '/fish', input)
  },
  update(id: string, input: Partial<Fish>): Promise<Fish> {
    return sendData<Fish>('patch', '/fish/' + id, input)
  },
  remove(id: string): Promise<void> {
    return sendData<void>('delete', '/fish/' + id)
  },
  prices(id: string): Promise<PriceEntry[]> {
    return getData<PriceEntry[]>('/fish/' + id + '/prices')
  },
}

export const voyageService = {
  list(): Promise<Voyage[]> {
    return getData<Voyage[]>('/voyages')
  },
  create(input: Partial<Voyage>): Promise<Voyage> {
    return sendData<Voyage>('post', '/voyages', input)
  },
  update(id: string, input: Partial<Voyage>): Promise<Voyage> {
    return sendData<Voyage>('patch', '/voyages/' + id, input)
  },
  remove(id: string): Promise<void> {
    return sendData<void>('delete', '/voyages/' + id)
  },
}

export const businessService = {
  get(): Promise<Business> {
    return getData<Business>('/business')
  },
  save(input: Partial<Business>): Promise<Business> {
    return sendData<Business>('put', '/business', input)
  },
}

export const queueService = {
  state(): Promise<QueueState> {
    return getData<QueueState>('/queue/state')
  },
  board(): Promise<QueueBoard> {
    return getData<QueueBoard>('/queue/tickets')
  },
  take(): Promise<Ticket> {
    return sendData<Ticket>('post', '/queue/tickets')
  },
  cancelMine(): Promise<Ticket> {
    return sendData<Ticket>('post', '/queue/tickets/mine/cancel')
  },
  openSession(): Promise<void> {
    return sendData<void>('post', '/queue/sessions/open')
  },
  closeSession(): Promise<void> {
    return sendData<void>('post', '/queue/sessions/close')
  },
  resetSession(): Promise<void> {
    return sendData<void>('delete', '/queue/sessions/active')
  },
  walkIn(name: string, phone: string): Promise<Ticket> {
    return sendData<Ticket>('post', '/queue/walkin', { name, phone })
  },
  act(id: string, action: 'call' | 'skip' | 'done' | 'cancel'): Promise<Ticket> {
    return sendData<Ticket>('post', '/queue/tickets/' + id + '/' + action)
  },
}

export interface OrderInput {
  items: { fishId: string; kg: number }[]
  payment: 'cod' | 'transfer'
  bank: string
  delivery: 'dermaga' | 'antar'
  address: string
  note: string
}

export const orderService = {
  create(input: OrderInput): Promise<Order> {
    return sendData<Order>('post', '/orders', input)
  },
  mine(): Promise<Order[]> {
    return getData<Order[]>('/orders', { scope: 'mine' })
  },
  all(): Promise<Order[]> {
    return getData<Order[]>('/orders')
  },
  proof(id: string): Promise<string> {
    return getData<string>('/orders/' + id + '/proof')
  },
  uploadProof(id: string, image: string): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/proof', { image })
  },
  cancel(id: string): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/cancel')
  },
  confirm(id: string, shippingFee: number): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/confirm', { shippingFee })
  },
  reject(id: string, reason: string): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/reject', { reason })
  },
  complete(id: string): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/complete')
  },
  togglePaid(id: string): Promise<Order> {
    return sendData<Order>('post', '/orders/' + id + '/paid')
  },
}

export interface SaleInput {
  customerName: string
  phone: string
  address: string
  date: string
  payment: string
  ticketId?: string
  items: { fishId: string; kg: number; pricePerKg: number }[]
}

export const saleService = {
  list(month?: string): Promise<Sale[]> {
    return getData<Sale[]>('/sales', month ? { month } : undefined)
  },
  create(input: SaleInput): Promise<Sale> {
    return sendData<Sale>('post', '/sales', input)
  },
  update(id: string, input: Partial<SaleInput>): Promise<Sale> {
    return sendData<Sale>('patch', '/sales/' + id, input)
  },
  remove(id: string): Promise<void> {
    return sendData<void>('delete', '/sales/' + id)
  },
  report(month: string): Promise<Report> {
    return getData<Report>('/reports', { month })
  },
}

export const notificationService = {
  async list(): Promise<{ data: AppNotification[]; unread: number }> {
    const response = await http.get('/notifications')
    return response.data as { data: AppNotification[]; unread: number }
  },
  async markRead(): Promise<void> {
    await http.post('/notifications/read')
  },
  announcements(): Promise<Announcement[]> {
    return getData<Announcement[]>('/announcements')
  },
  publish(input: { title: string; message: string }): Promise<Announcement> {
    return sendData<Announcement>('post', '/announcements', input)
  },
  update(id: string, input: { title: string; message: string }): Promise<Announcement> {
    return sendData<Announcement>('patch', '/announcements/' + id, input)
  },
  remove(id: string): Promise<void> {
    return sendData<void>('delete', '/announcements/' + id)
  },
}

export interface AssistantSettingsInput {
  name: string
  avatar: string
  greeting: string
  instruction: string
  model: string
  thinking: boolean
  enabled: boolean
  apiKey?: string
}

export const assistantService = {
  profile(): Promise<AssistantProfile> {
    return getData<AssistantProfile>('/assistant/profile')
  },
  settings(): Promise<AssistantSettings> {
    return getData<AssistantSettings>('/assistant/settings')
  },
  saveSettings(input: AssistantSettingsInput): Promise<AssistantSettings> {
    return sendData<AssistantSettings>('put', '/assistant/settings', input)
  },
  removeKey(): Promise<void> {
    return sendData<void>('delete', '/assistant/settings/key')
  },
  async chat(message: string): Promise<{ reply: ChatMessage; intent: Intent }> {
    return sendData<{ reply: ChatMessage; intent: Intent }>('post', '/assistant/chat', { message })
  },
  history(): Promise<ChatMessage[]> {
    return getData<ChatMessage[]>('/assistant/history')
  },
  clearHistory(): Promise<void> {
    return sendData<void>('delete', '/assistant/history')
  },
  conversations(): Promise<Conversation[]> {
    return getData<Conversation[]>('/assistant/conversations')
  },
  conversation(userId: string): Promise<ChatMessage[]> {
    return getData<ChatMessage[]>('/assistant/conversations/' + userId)
  },
  removeConversation(userId: string): Promise<void> {
    return sendData<void>('delete', '/assistant/conversations/' + userId)
  },
}
