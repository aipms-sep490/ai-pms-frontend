const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const apiBaseUrl = rawBaseUrl || '/api/v1'

const rawDataMode = import.meta.env.VITE_DATA_MODE?.trim().toLowerCase()
const dataMode: 'api' | 'mock' = rawDataMode === 'mock' ? 'mock' : 'api'

export const env = {
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  dataMode,
  isMockMode: dataMode === 'mock',
} as const
