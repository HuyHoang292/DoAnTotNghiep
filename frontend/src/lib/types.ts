export type ViolationType =
  | 'RED_LIGHT'
  | 'WRONG_LANE'
  | 'SPEEDING'
  | 'ILLEGAL_PARKING'
  | 'HELMET_LESS'
  | 'WRONG_WAY'

export type ViolationStatus = 'AI_PENDING' | 'OFFICER_VERIFIED' | 'REJECTED' | 'INVOICED'

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type Vehicle = {
  id: string
  licensePlate: string
  ownerId: string
  vehicleType: string
  plateColor?: string | null
  brand: string
  model: string
  color: string
  chassisNumber?: string | null
  engineNumber?: string | null
  registeredAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  ownerName?: string | null
  ownerPhone?: string | null
  ownerNationalId?: string | null
  ownerEmail?: string | null
}

export type VehicleOwner = {
  id: string
  fullName: string
  nationalId: string
  email: string | null
  phone: string
  role?: string
  status?: string
  createdAt?: string | null
  updatedAt?: string | null
}

export type Camera = {
  id: string
  locationName: string
  roadSegment: string
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'
}

export type Violation = {
  id: string
  cameraId: string
  vehicleId: string | null
  detectedPlateText: string
  licensePlate?: string
  violationType: ViolationType
  evidenceImageUrl: string
  detectedAt: string
  dueDate?: string | null
  status: ViolationStatus
  cameraLocation?: string | null
}

export type Invoice = {
  id: string
  violationId: string
  invoiceCode?: string
  amount: number
  issueDate?: string | null
  dueDate?: string | null
  status: InvoiceStatus
}

export const VIOLATION_TYPE_LABEL: Record<ViolationType, string> = {
  RED_LIGHT: 'Vượt đèn đỏ',
  WRONG_LANE: 'Đi sai làn đường',
  SPEEDING: 'Chạy quá tốc độ',
  ILLEGAL_PARKING: 'Đỗ xe trái quy định',
  HELMET_LESS: 'Không đội mũ bảo hiểm',
  WRONG_WAY: 'Đi ngược chiều',
}

export const VIOLATION_STATUS_LABEL: Record<ViolationStatus, string> = {
  AI_PENDING: 'Chờ xác minh',
  OFFICER_VERIFIED: 'Đã xác nhận',
  REJECTED: 'Đã bác bỏ',
  INVOICED: 'Đã lập biên lai',
}
