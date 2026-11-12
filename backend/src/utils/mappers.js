function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  // mysql2 trả cột DATE là 00:00 giờ địa phương → lấy ngày theo giờ địa phương, không dùng toISOString (UTC) để tránh lùi 1 ngày
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function resolveInvoiceStatus(row) {
  if (row.status === 'UNPAID' && row.due_date) {
    const due = new Date(row.due_date);
    if (!Number.isNaN(due.getTime()) && due < new Date()) {
      return 'OVERDUE';
    }
  }
  return row.status;
}

function mapVehicle(row) {
  return {
    id: row.id,
    licensePlate: row.license_plate,
    ownerId: row.owner_id,
    vehicleType: row.vehicle_type,
    plateColor: row.plate_color,
    brand: row.brand,
    model: row.model,
    color: row.color,
    chassisNumber: row.chassis_number,
    engineNumber: row.engine_number,
    insuranceNumber: row.insurance_number,
    plateImageUrl: row.plate_image_url ?? null,
    verificationStatus: row.verification_status,
    citizenFeedback: row.citizen_feedback,
    verifiedAt: toIso(row.verified_at),
    registeredAt: toDateOnly(row.registered_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    ownerName: row.owner_name || row.full_name || null,
    ownerPhone: row.owner_phone || row.phone || null,
    ownerNationalId: row.owner_national_id || row.national_id || null,
    ownerEmail: row.owner_email || row.email || null,
  };
}

function mapOwner(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    nationalId: row.national_id,
    email: row.email,
    phone: row.phone,
    dateOfBirth: toDateOnly(row.date_of_birth),
    gender: row.gender ?? null,
    address: row.address ?? null,
    ward: row.ward ?? null,
    city: row.city ?? null,
    province: row.province ?? null,
    role: row.role,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapCamera(row) {
  return {
    id: row.id,
    cameraCode: row.camera_code ?? null,
    locationName: row.location_name,
    roadSegment: row.road_segment,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    hlsStreamUrl: row.hls_stream_url ?? null,
    videoUrl: row.video_url ?? null,
    stopLine: parseJsonColumn(row.stop_line),
    signalConfig: parseJsonColumn(row.signal_config),
    monitoring: Boolean(row.monitoring),
    status: row.status,
  };
}

function mapCameraEvent(row) {
  return {
    id: row.id,
    cameraId: row.camera_id,
    videoTimestamp: Number(row.video_timestamp),
    plate: row.detected_plate_text ?? null,
    signalState: row.signal_state ?? null,
    vehicleClass: row.vehicle_class ?? null,
    snapshotUrl: row.snapshot_url ?? null,
    violationId: row.promoted_violation_id ?? null,
    createdAt: toIso(row.created_at),
  };
}

function parseJsonColumn(value) {
  if (value === null || value === undefined) return null;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapViolation(row) {
  const defaultAmount = toNumber(row.default_amount);
  return {
    id: row.id,
    cameraId: row.camera_id,
    vehicleId: row.vehicle_id,
    detectedPlateText: row.detected_plate_text,
    correctedPlateText: row.corrected_plate_text ?? null,
    licensePlate: row.license_plate || row.corrected_plate_text || row.detected_plate_text,
    ocrConfidence: toNumber(row.ocr_confidence) ?? 0,
    violationType: row.violation_type,
    evidenceImageUrl: row.evidence_image_url,
    plateImageUrl: row.plate_image_url ?? null,
    plateBox: parseJsonColumn(row.plate_box),
    evidenceVideoUrl: row.evidence_video_url ?? null,
    detectedAt: toIso(row.detected_at),
    dueDate: toIso(row.due_date),
    status: row.status,
    source: row.source || 'AI',
    rejectionReason: row.rejection_reason ?? null,
    verifiedBy: row.verified_by ?? null,
    verifiedAt: toIso(row.verified_at),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    vehicleType: row.vehicle_type_name || row.vehicle_type || null,
    brand: row.brand || null,
    model: row.model || null,
    color: row.color || null,
    cameraLocation: row.camera_location || row.location_name || null,
    roadSegment: row.road_segment || null,
    cameraCode: row.camera_code || null,
    ownerName: row.owner_name || null,
    ownerNationalId: row.owner_national_id || null,
    ownerPhone: row.owner_phone || null,
    ownerEmail: row.owner_email || null,
    ownerAddress: row.owner_address || null,
    fineTitle: row.fine_title || null,
    fineDescription: row.fine_description || null,
    fineMinAmount: toNumber(row.min_amount),
    fineMaxAmount: toNumber(row.max_amount),
    fineDefaultAmount: defaultAmount,
    defaultAmount,
    minAmount: toNumber(row.min_amount),
    maxAmount: toNumber(row.max_amount),
    verifiedByName: row.verified_by_name || null,
    verifiedByBadge: row.verified_by_badge || null,
  };
}

function mapInvoice(row) {
  return {
    id: row.id,
    violationId: row.violation_id,
    invoiceCode: row.invoice_code,
    amount: Number(row.amount),
    issueDate: toDateOnly(row.issue_date),
    dueDate: toDateOnly(row.due_date),
    status: resolveInvoiceStatus(row),
    paymentMethod: row.payment_method ?? null,
    paidAt: toIso(row.paid_at),
    createdAt: toIso(row.created_at),
  };
}

// Bằng đang ACTIVE nhưng đã quá ngày hết hạn thì trả về EXPIRED
function resolveDriverLicenseStatus(row) {
  const expiry = toDateOnly(row.expiry_date);
  if (row.status === 'ACTIVE' && expiry && expiry < toDateOnly(new Date())) {
    return 'EXPIRED';
  }
  return row.status;
}

function mapDriverLicense(row) {
  return {
    id: row.id,
    userId: row.user_id,
    licenseNumber: row.license_number,
    licenseClass: row.license_class,
    issueDate: toDateOnly(row.issue_date),
    expiryDate: toDateOnly(row.expiry_date),
    issuedBy: row.issued_by ?? null,
    status: resolveDriverLicenseStatus(row),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

module.exports = {
  mapVehicle,
  mapOwner,
  mapCamera,
  mapCameraEvent,
  mapViolation,
  mapInvoice,
  mapDriverLicense,
  toDateOnly,
};
