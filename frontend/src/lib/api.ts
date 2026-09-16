import type { Camera, Invoice, Vehicle, VehicleOwner, Violation } from './types'

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

export async function getCitizenDashboard() {
  return apiFetch<{
    vehicles: Vehicle[]
    violations: Violation[]
    invoices: Invoice[]
  }>('/api/citizen/dashboard')
}

export async function getOfficerDashboard() {
  return apiFetch<{
    vehicles: Vehicle[]
    cameras: Camera[]
    violations: Violation[]
    invoices: Invoice[]
  }>('/api/officer/dashboard')
}

export type PlateScanResult = {
  plate: string
  plateText?: string
  rawText?: string
  confidence?: number
  detections?: Array<{
    class?: string
    confidence: number
    x: number
    y: number
    width: number
    height: number
  }>
  characters?: Array<{
    class?: string
    confidence: number
  }>
  vehicle: Vehicle | null
  owner: VehicleOwner | null
  violations: Violation[]
  invoices: Invoice[]
  message?: string
}

export async function lookupPlateRequest(plate: string) {
  return apiFetch<PlateScanResult>(`/api/officer/plates?plate=${encodeURIComponent(plate)}`)
}

export async function scanPlateRequest(image: string) {
  const headers = new Headers()
  headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const res = await fetch(`${API_BASE_URL}/api/officer/scan-plate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ image }),
  })

  let data: PlateScanResult | null = null
  try {
    data = (await res.json()) as PlateScanResult
  } catch {
    data = null
  }

  if (res.status === 422 && data) {
    return data
  }

  if (!res.ok) {
    throw new Error(data?.message || 'Không nhận diện được biển số.')
  }

  return data as PlateScanResult
}

export async function listCitizensRequest() {
  return apiFetch<{ users: VehicleOwner[] }>('/api/officer/citizens')
}

export async function createCitizenRequest(payload: {
  fullName: string
  nationalId: string
  email: string
  phone: string
}) {
  return apiFetch<{ user: VehicleOwner; temporaryPassword?: string; message?: string }>(
    '/api/officer/citizens',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export async function updateCitizenRequest(
  id: string,
  payload: { fullName?: string; nationalId?: string; email?: string; phone?: string },
) {
  return apiFetch<{ user: VehicleOwner }>(`/api/officer/citizens/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function listVehiclesRequest() {
  return apiFetch<{ vehicles: Vehicle[] }>('/api/officer/vehicles')
}

export async function createVehicleRequest(payload: {
  licensePlate: string
  ownerId: string
  vehicleType: string
  brand?: string
  model?: string
  color?: string
  registeredAt: string
  plateColor?: string
}) {
  return apiFetch<{ vehicle: Vehicle }>('/api/officer/vehicles', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateVehicleRequest(
  id: string,
  payload: {
    licensePlate?: string
    ownerId?: string
    vehicleType?: string
    brand?: string
    model?: string
    color?: string
    registeredAt?: string
    plateColor?: string
  },
) {
  return apiFetch<{ vehicle: Vehicle }>(`/api/officer/vehicles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function transferVehicleRequest(id: string, ownerId: string) {
  return apiFetch<{ vehicle: Vehicle; message?: string }>(`/api/officer/vehicles/${id}/transfer`, {
    method: 'POST',
    body: JSON.stringify({ ownerId }),
  })
}
