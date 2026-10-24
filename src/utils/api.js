const tokenStorageKey = 'wmsRentalsApiToken'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5094/api').replace(/\/$/, '')

export const getApiToken = () => localStorage.getItem(tokenStorageKey)

export const setApiToken = token => localStorage.setItem(tokenStorageKey, token)

export const clearApiToken = () => localStorage.removeItem(tokenStorageKey)

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = new Headers()
  const token = getApiToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (body !== undefined) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const result = contentType.includes('application/json') ? await response.json() : await response.text()
  if (!response.ok) {
    const error = new Error(result?.detail || result?.title || result?.message || result || `Request failed (${response.status}).`)
    error.status = response.status
    throw error
  }
  return result
}
