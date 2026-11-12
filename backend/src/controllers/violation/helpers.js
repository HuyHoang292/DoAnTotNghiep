const db = require('../../db/knex');

function now() {
  return db.fn.now();
}

const VIOLATION_SELECT = [
  'v.id',
  'v.camera_id',
  'v.vehicle_id',
  'v.detected_plate_text',
  'v.corrected_plate_text',
  'v.ocr_confidence',
  'v.violation_type',
  'v.evidence_image_url',
  'v.plate_image_url',
  'v.plate_box',
  'v.evidence_video_url',
  'v.detected_at',
  'v.due_date',
  'v.status',
  'v.source',
  'v.rejection_reason',
  'v.verified_by',
  'v.verified_at',
  'v.created_at',
  'v.updated_at',
  'veh.license_plate',
  'veh.vehicle_type as vehicle_type_name',
  'veh.brand',
  'veh.model',
  'veh.color',
  'c.location_name as camera_location',
  'c.road_segment',
  'c.camera_code',
  'u.full_name as owner_name',
  'u.national_id as owner_national_id',
  'u.phone as owner_phone',
  'f.title as fine_title',
  'f.description as fine_description',
  'f.min_amount',
  'f.max_amount',
  'f.default_amount',
];

function violationsBaseQuery() {
  return db('violations as v')
    .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
    .leftJoin('cameras as c', 'c.id', 'v.camera_id')
    .leftJoin('users as u', 'u.id', 'veh.owner_id')
    .leftJoin('fines as f', 'f.violation_type', 'v.violation_type');
}

function applyViolationFilters(query, { status, violationType, cameraId, plate, startDate, endDate, source }) {
  if (status) query.where('v.status', status);
  if (violationType) query.where('v.violation_type', violationType);
  if (cameraId) query.where('v.camera_id', cameraId);
  if (source) query.where('v.source', source);
  if (plate) {
    query.where(function () {
      this.where('v.detected_plate_text', 'like', `%${plate}%`)
        .orWhere('v.corrected_plate_text', 'like', `%${plate}%`)
        .orWhere('veh.license_plate', 'like', `%${plate}%`);
    });
  }
  if (startDate) query.where('v.detected_at', '>=', startDate);
  if (endDate) query.where('v.detected_at', '<=', endDate);
  return query;
}

function normalizePlate(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[\s.-]/g, '');
}

module.exports = { now, VIOLATION_SELECT, violationsBaseQuery, applyViolationFilters, normalizePlate };
