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
  lastLoginAt?: string | null
  loginCount?: number
  isOnline?: boolean
  driverLicenses?: Pick<DriverLicense, 'licenseClass' | 'status'>[]
}

export type DriverLicenseStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED'

export type DriverLicense = {
  id: string
  userId: string
  licenseNumber: string
  licenseClass: string
  issueDate: string
  expiryDate: string | null
  issuedBy: string | null
  status: DriverLicenseStatus
  createdAt?: string | null
  updatedAt?: string | null
}

export const DRIVER_LICENSE_STATUS_LABEL: Record<DriverLicenseStatus, string> = {
  ACTIVE: 'Còn hiệu lực',
  SUSPENDED: 'Tạm giữ / Tước có thời hạn',
  REVOKED: 'Đã thu hồi',
  EXPIRED: 'Hết hạn',
}

// Hạng mới theo Luật TTATGTĐB 2024 và hạng cũ cấp trước 01/01/2025
export const DRIVER_LICENSE_CLASSES = {
  current: ['A1', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D2', 'D', 'BE', 'C1E', 'CE', 'D1E', 'D2E', 'DE'],
  legacy: ['A2', 'A3', 'A4', 'B2', 'E', 'FB2', 'FC', 'FD', 'FE'],
}

export type LoginHistoryEntry = {
  id: number
  status: 'SUCCESS' | 'FAILED'
  failureReason: string | null
  ipAddress: string | null
  userAgent: string | null
  loggedInAt: string | null
  loggedOutAt: string | null
  isActive: boolean
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
  stopLine?: StopLine | null
  signalConfig?: SignalConfig | null
  monitoring?: boolean
  status: CameraStatus
}

// Toạ độ chuẩn hoá 0-1 theo khung hình; travelSide là phía xe đi tới sau khi qua vạch
export type StopLine = {
  x1: number
  y1: number
  x2: number
  y2: number
  travelSide: 1 | -1
}

export type NormalizedBox = { x1: number; y1: number; x2: number; y2: number }

// Chu kỳ đèn giả lập (giây), tính theo thời gian của video; dùng cho camera không nhìn thấy đèn
export type SimulatedSignalConfig = {
  mode?: 'SIMULATED'
  green: number
  yellow: number
  red: number
  offset: number
}

// Đọc màu đèn thật: roi là vùng chứa 3 bóng đèn xếp dọc (đỏ - vàng - xanh)
export type VisionSignalConfig = {
  mode: 'VISION'
  roi: NormalizedBox
}

export type SignalConfig = SimulatedSignalConfig | VisionSignalConfig

export type MonitoringStatus = {
  status: 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED' | 'AI_OFFLINE'
  error?: string | null
  loops?: number
  videoTime?: number
  signalState?: 'RED' | 'YELLOW' | 'GREEN' | 'UNKNOWN'
  crossedAllowed?: number
  violations?: number
  processingFps?: number
}

export type CameraEvent = {
  id: string
  cameraId: string
  videoTimestamp: number
  plate?: string | null
  signalState?: string | null
  vehicleClass?: string | null
  snapshotUrl?: string | null
  violationId?: string | null
  createdAt: string
}

// Giá trị backend lưu khi AI không đọc được biển số
export const UNREAD_PLATE = 'CHUA-DOC-DUOC'

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
  plateImageUrl?: string | null
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
