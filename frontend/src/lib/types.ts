export type ViolationType =
  | 'RED_LIGHT'
  | 'WRONG_LANE'
  | 'SPEEDING'
  | 'ILLEGAL_PARKING'

export type ViolationStatus =
  | 'AI_PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'PAID'

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERDUE'

export type Vehicle = {
  id: string
  licensePlate: string
  ownerId: string
  vehicleType: string
  brand: string
  model: string
  color: string
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
  violationType: ViolationType
  evidenceImageUrl: string
  detectedAt: string
  status: ViolationStatus
}

export type Invoice = {
  id: string
  violationId: string
  amount: number
  status: InvoiceStatus
}

export const VIOLATION_TYPE_LABEL: Record<ViolationType, string> = {
  RED_LIGHT: 'Vượt đèn đỏ',
  WRONG_LANE: 'Đi sai làn đường',
  SPEEDING: 'Chạy quá tốc độ',
  ILLEGAL_PARKING: 'Đỗ xe trái quy định',
}

export const VIOLATION_STATUS_LABEL: Record<ViolationStatus, string> = {
  AI_PENDING: 'Chờ xác minh',
  CONFIRMED: 'Đã xác nhận',
  REJECTED: 'Đã bác bỏ',
  PAID: 'Đã nộp phạt',
}
