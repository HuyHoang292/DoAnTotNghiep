export type ViolationType =
  | 'RED_LIGHT'
  | 'WRONG_LANE'
  | 'SPEEDING'
  | 'ILLEGAL_PARKING'
  | 'HELMET_LESS'
  | 'WRONG_WAY'

export type ViolationStatus = 'AI_PENDING' | 'OFFICER_VERIFIED' | 'REJECTED' | 'INVOICED'

export type ViolationSource = 'AI' | 'OFFICER'

export type InvoiceStatus = 'UNPAID' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export type VehicleVerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVISION_REQUESTED'

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
  insuranceNumber?: string | null
  plateImageUrl?: string | null
  registeredAt?: string | null
  verificationStatus?: VehicleVerificationStatus
  citizenFeedback?: string | null
  verifiedAt?: string | null
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
  dateOfBirth?: string | null
  gender?: string | null
  address?: string | null
  ward?: string | null
  city?: string | null
  province?: string | null
  role?: string
  status?: string
  createdAt?: string | null
  updatedAt?: string | null
  passwordChanged?: boolean
  mustChangePassword?: boolean
}

export type CameraStatus = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'

export type Camera = {
  id: string
  cameraCode?: string | null
  locationName: string
  roadSegment: string
  latitude?: number | null
  longitude?: number | null
  hlsStreamUrl?: string | null
  videoUrl?: string | null
  status: CameraStatus
}

export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  ONLINE: 'Hoạt động',
  OFFLINE: 'Mất kết nối',
  MAINTENANCE: 'Bảo trì',
}

export type Violation = {
  id: string
  cameraId: string
  vehicleId: string | null
  detectedPlateText: string
  correctedPlateText?: string | null
  licensePlate?: string
  ocrConfidence: number
  violationType: ViolationType
  evidenceImageUrl: string
  evidenceVideoUrl?: string | null
  detectedAt: string
  dueDate?: string | null
  status: ViolationStatus
  source?: ViolationSource
  rejectionReason?: string | null
  verifiedBy?: string | null
  verifiedAt?: string | null
  cameraLocation?: string | null
  fineTitle?: string | null
  fineDescription?: string | null
  fineMinAmount?: number | null
  fineMaxAmount?: number | null
  fineDefaultAmount?: number | null
}

export type Invoice = {
  id: string
  violationId: string
  invoiceCode?: string
  amount: number
  issueDate?: string | null
  dueDate?: string | null
  status: InvoiceStatus
  paymentMethod?: string | null
  paidAt?: string | null
  createdAt?: string | null
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: 'Chưa nộp',
  OVERDUE: 'Quá hạn',
  PAID: 'Đã nộp',
  CANCELLED: 'Đã huỷ',
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

export const VIOLATION_SOURCE_LABEL: Record<ViolationSource, string> = {
  AI: 'AI phát hiện',
  OFFICER: 'Cán bộ ghi nhận',
}

export const VEHICLE_VERIFICATION_STATUS_LABEL: Record<VehicleVerificationStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Đã từ chối',
  REVISION_REQUESTED: 'Yêu cầu sửa',
}
