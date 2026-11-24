import { projectId, publicAnonKey } from '../../utils/supabase/info'

export const API_BASE_URL = 'https://' + projectId + '.supabase.co/functions/v1/make-server-c71cd2a9/api/v1'
export const GATEWAY_KEY = publicAnonKey
export const SESSION_STORAGE_KEY = 'kl_session'
export const POLL_INTERVAL_MS = 5000
