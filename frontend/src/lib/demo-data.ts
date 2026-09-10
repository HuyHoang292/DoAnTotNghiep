import type { Camera, Invoice, Vehicle, Violation } from './types'

const evidence =
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=400&q=80'

export const demoVehicles: Vehicle[] = [
  {
    id: 'veh-001',
    licensePlate: '30F-123.45',
    ownerId: 'usr-citizen-001',
    vehicleType: 'CAR',
    brand: 'Toyota',
    model: 'Camry',
    color: 'Đen',
  },
  {
    id: 'veh-002',
    licensePlate: '29A-678.90',
    ownerId: 'usr-citizen-001',
    vehicleType: 'CAR',
    brand: 'Honda',
    model: 'City',
    color: 'Trắng',
  },
]

export const demoCameras: Camera[] = [
  {
    id: 'cam-001',
    locationName: 'Ngã tư Nguyễn Thái Học - Lê Duẩn',
    roadSegment: 'Quận Ba Đình',
    status: 'ONLINE',
  },
  {
    id: 'cam-002',
    locationName: 'Cầu Chương Dương',
    roadSegment: 'Quận Hoàn Kiếm',
    status: 'ONLINE',
  },
  {
    id: 'cam-003',
    locationName: 'Vành đai 3 - Thanh Xuân',
    roadSegment: 'Quận Thanh Xuân',
    status: 'MAINTENANCE',
  },
  {
    id: 'cam-004',
    locationName: 'Ngã tư Sở',
    roadSegment: 'Quận Đống Đa',
    status: 'ONLINE',
  },
]

function daysAgo(days: number, hours = 9) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hours, 20, 0, 0)
  return d.toISOString()
}

export const demoViolations: Violation[] = [
  {
    id: 'vio-001',
    cameraId: 'cam-001',
    vehicleId: 'veh-001',
    detectedPlateText: '30F-123.45',
    violationType: 'RED_LIGHT',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(0, 8),
    status: 'AI_PENDING',
  },
  {
    id: 'vio-002',
    cameraId: 'cam-002',
    vehicleId: 'veh-001',
    detectedPlateText: '30F-123.45',
    violationType: 'SPEEDING',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(3, 17),
    status: 'CONFIRMED',
  },
  {
    id: 'vio-003',
    cameraId: 'cam-004',
    vehicleId: 'veh-002',
    detectedPlateText: '29A-678.90',
    violationType: 'ILLEGAL_PARKING',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(8, 11),
    status: 'CONFIRMED',
  },
  {
    id: 'vio-004',
    cameraId: 'cam-003',
    vehicleId: null,
    detectedPlateText: '51H-222.11',
    violationType: 'WRONG_LANE',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(1, 14),
    status: 'AI_PENDING',
  },
  {
    id: 'vio-005',
    cameraId: 'cam-001',
    vehicleId: 'veh-002',
    detectedPlateText: '29A-678.90',
    violationType: 'WRONG_LANE',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(12, 7),
    status: 'PAID',
  },
  {
    id: 'vio-006',
    cameraId: 'cam-002',
    vehicleId: null,
    detectedPlateText: '88B-019.33',
    violationType: 'SPEEDING',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(2, 16),
    status: 'AI_PENDING',
  },
  {
    id: 'vio-007',
    cameraId: 'cam-004',
    vehicleId: null,
    detectedPlateText: '30G-555.01',
    violationType: 'RED_LIGHT',
    evidenceImageUrl: evidence,
    detectedAt: daysAgo(5, 19),
    status: 'CONFIRMED',
  },
]

export const demoInvoices: Invoice[] = [
  { id: 'inv-001', violationId: 'vio-002', amount: 5000000, status: 'OVERDUE' },
  { id: 'inv-002', violationId: 'vio-003', amount: 900000, status: 'UNPAID' },
  { id: 'inv-003', violationId: 'vio-005', amount: 4000000, status: 'PAID' },
  { id: 'inv-004', violationId: 'vio-007', amount: 5000000, status: 'PAID' },
]
