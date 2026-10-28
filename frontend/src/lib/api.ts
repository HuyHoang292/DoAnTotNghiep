import type { Camera, Invoice, Vehicle, VehicleOwner, Violation } from './types'

// Khi có VITE_API_URL (production/docker) thì dùng URL tuyệt đối.
// Khi dev (localhost), để trống → dùng path tương đối → đi qua Vite proxy → tránh CORS.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export type AuthUser = {
  id: string
  fullName: string
  nationalId: string
  email: string
  phone: string
  role: 'CITIZEN' | 'OFFICER' | 'ADMIN'
  badgeNumber?: string | null
  unit?: string
  dateOfBirth?: string | null
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
  address?: string | null
  ward?: string | null
  city?: string | null
  province?: string | null
  passwordChanged?: boolean
  mustChangePassword?: boolean
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

export async function changePasswordRequest(data: { oldPassword: string; newPassword: string }) {
  return apiFetch<{ message: string }>('/api/auth/change-password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
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

export type PlateImageUploadResult = {
  imageUrl: string
  plateText: string
  rawText: string
  confidence: number
  message?: string
}

// Tải ảnh lên Cloudinary (qua backend) và để AI service đọc biển số
export async function uploadPlateImageRequest(image: string, purpose: 'vehicles' | 'violations') {
  return apiFetch<PlateImageUploadResult>('/api/officer/plate-images', {
    method: 'POST',
    body: JSON.stringify({ image, purpose }),
  })
}

export async function listCitizensRequest() {
  return apiFetch<{ users: VehicleOwner[] }>('/api/officer/citizens')
}

export async function createCitizenRequest(payload: {
  fullName: string
  nationalId: string
  email: string
  phone: string
  dateOfBirth?: string
  gender?: string
  address?: string
  ward?: string
  city?: string
  province?: string
}) {
  return apiFetch<{ user: VehicleOwner; temporaryPassword?: string; message?: string }>(
    '/api/officer/citizens',
    { method: 'POST', body: JSON.stringify(payload) },
  )
}

export async function updateCitizenRequest(
  id: string,
  payload: {
    fullName?: string
    nationalId?: string
    email?: string
    phone?: string
    dateOfBirth?: string
    gender?: string
    address?: string
    ward?: string
    city?: string
    province?: string
  },
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
  insuranceNumber?: string
  registeredAt: string
  plateColor?: string
  plateImageUrl?: string
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
    insuranceNumber?: string
    registeredAt?: string
    plateColor?: string
    plateImageUrl?: string
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

export async function approveVehicleRequest(id: string) {
  return apiFetch<{ vehicle: Vehicle; message?: string }>(`/api/citizen/vehicles/${id}/approve`, {
    method: 'POST',
  })
}

export async function requestVehicleRevisionRequest(id: string, feedback: string) {
  return apiFetch<{ vehicle: Vehicle; message?: string }>(`/api/citizen/vehicles/${id}/request-revision`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}

export async function rejectVehicleRequest(id: string, feedback: string) {
  return apiFetch<{ vehicle: Vehicle; message?: string }>(`/api/citizen/vehicles/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ feedback }),
  })
}

// ============ VIOLATIONS API ============

export type ViolationDetail = Violation & {
  licensePlate?: string
  vehicleType?: string
  brand?: string
  model?: string
  color?: string
  cameraLocation?: string
  roadSegment?: string
  cameraCode?: string
  ownerName?: string
  ownerNationalId?: string
  ownerPhone?: string
  ownerEmail?: string
  ownerAddress?: string
  fineTitle?: string
  fineDescription?: string
  minAmount?: number
  maxAmount?: number
  defaultAmount?: number
  verifiedByName?: string
  verifiedByBadge?: string
}

export type ViolationHistory = {
  action: string
  timestamp: string
  actor: string
  note?: string | null
}

export type ViolationsQueryParams = {
  status?: string
  violationType?: string
  cameraId?: string
  plate?: string
  startDate?: string
  endDate?: string
  source?: string
  page?: number
  limit?: number
}

export async function getOfficerViolations(params: ViolationsQueryParams = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value))
    }
  })
  
  return apiFetch<{
    violations: ViolationDetail[]
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }>(`/api/officer/violations?${query.toString()}`)
}

export async function getViolationDetail(id: string) {
  return apiFetch<{
    violation: ViolationDetail
    invoice: Invoice | null
    history: ViolationHistory[]
  }>(`/api/officer/violations/${id}`)
}

export async function verifyViolation(id: string, data: { correctedPlate?: string; vehicleId?: string }) {
  return apiFetch<{ violation: Violation; message: string }>(`/api/officer/violations/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function rejectViolation(id: string, reason: string) {
  return apiFetch<{ violation: Violation; message: string }>(`/api/officer/violations/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function updateViolationPlate(id: string, correctedPlateText: string) {
  return apiFetch<{ violation: Violation; vehicle?: Vehicle; message: string }>(
    `/api/officer/violations/${id}/plate`,
    {
      method: 'PATCH',
      body: JSON.stringify({ correctedPlateText }),
    }
  )
}

export async function createInvoiceFromViolation(id: string, data?: { amount?: number; dueDate?: string }) {
  return apiFetch<{ invoice: Invoice; violation: Violation; message: string }>(
    `/api/officer/violations/${id}/invoice`,
    {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }
  )
}

export async function updateCameraVideoRequest(id: string, videoUrl: string) {
  return apiFetch<{ camera: Camera }>(`/api/officer/cameras/${id}/video`, {
    method: 'PATCH',
    body: JSON.stringify({ videoUrl }),
  })
}

export async function cancelInvoiceRequest(id: string, reason: string) {
  return apiFetch<{ invoice: Invoice; message: string }>(`/api/officer/invoices/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
}

export async function getAIQueue(sortBy: 'time' | 'confidence' = 'time') {
  return apiFetch<{ violations: ViolationDetail[]; total: number }>(
    `/api/officer/violations/queue?sortBy=${sortBy}`
  )
}

export async function createOfficerViolationRequest(data: {
  plate: string
  violationType: string
  cameraId?: string
  detectedAt?: string
  evidenceImageUrl?: string
}) {
  return apiFetch<{ violation: ViolationDetail; message: string }>('/api/officer/violations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}
