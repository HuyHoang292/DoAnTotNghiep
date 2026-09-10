const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export type AuthUser = {
  id: string
  fullName: string
  nationalId: string
  email: string
  phone: string
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN'
  badgeNumber?: string | null
  unit?: string
}

export function getToken(): string | null {
  return localStorage.getItem('access_token')
}

export function setToken(token: string) {
  localStorage.setItem('access_token', token)
}

export function clearToken() {
  localStorage.removeItem('access_token')
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers || {})
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  const token = getToken()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'message' in data
        ? String((data as { message: unknown }).message)
        : 'Yêu cầu thất bại.'
    throw new Error(message)
  }

  return data as T
}

export async function loginRequest(username: string, password: string) {
  return apiFetch<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export async function getMeRequest() {
  return apiFetch<{ user: AuthUser }>('/api/auth/me')
}
