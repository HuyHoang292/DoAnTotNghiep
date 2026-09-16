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
  return date.toISOString().slice(0, 10);
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
    role: row.role,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapCamera(row) {
  return {
    id: row.id,
    locationName: row.location_name,
    roadSegment: row.road_segment,
    status: row.status,
  };
}

function mapViolation(row) {
  return {
    id: row.id,
    cameraId: row.camera_id,
    vehicleId: row.vehicle_id,
    detectedPlateText: row.detected_plate_text,
    licensePlate: row.license_plate || row.detected_plate_text,
    violationType: row.violation_type,
    evidenceImageUrl: row.evidence_image_url,
    detectedAt: toIso(row.detected_at),
    dueDate: toIso(row.due_date),
    status: row.status,
    cameraLocation: row.location_name || null,
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
  };
}

module.exports = {
  mapVehicle,
  mapOwner,
  mapCamera,
  mapViolation,
  mapInvoice,
};
