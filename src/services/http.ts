import axios, { AxiosError } from 'axios'
import { API_BASE_URL, GATEWAY_KEY, SESSION_STORAGE_KEY } from '../config/api'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const UNAUTHORIZED_EVENT = 'kl:unauthorized'

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: { Authorization: 'Bearer ' + GATEWAY_KEY },
})

function attachSession(config: any) {
  const token = localStorage.getItem(SESSION_STORAGE_KEY)
  if (token) config.headers['X-Session'] = token
  return config
}

function describeError(error: AxiosError<{ message?: string }>): ApiError {
  if (error.response) {
    const status = error.response.status
    const message = error.response.data && error.response.data.message
    return new ApiError(message || 'Permintaan gagal diproses.', status)
  }
  if (error.code === 'ECONNABORTED') return new ApiError('Server terlalu lama merespons. Coba lagi.', 0)
  return new ApiError('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.', 0)
}

function handleFailure(error: AxiosError<{ message?: string }>) {
  const apiError = describeError(error)
  const hadSession = Boolean(localStorage.getItem(SESSION_STORAGE_KEY))
  if (apiError.status === 401 && hadSession) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT))
  }
  return Promise.reject(apiError)
}

http.interceptors.request.use(attachSession)
http.interceptors.response.use(undefined, handleFailure)

export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const response = await http.get(url, { params })
  return response.data.data as T
}

export async function sendData<T>(method: 'post' | 'put' | 'patch' | 'delete', url: string, body?: unknown): Promise<T> {
  const response = await http.request({ method, url, data: body })
  return response.data.data as T
}
