const db = require('../db/knex');
const crypto = require('crypto');
const { mapViolation, mapInvoice } = require('../utils/mappers');
const { uploadImage, isDataUrlImage, isStoredImageUrl } = require('../services/imageStorage');

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

// Lấy danh sách tất cả vi phạm với filter
exports.listViolations = async (req, res) => {
  try {
    const {
      status,
      violationType,
      cameraId,
      plate,
      startDate,
      endDate,
      source,
      page = 1,
      limit = 20,
    } = req.query;

    const filters = { status, violationType, cameraId, plate, startDate, endDate, source };
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const totalResult = await applyViolationFilters(violationsBaseQuery(), filters)
      .countDistinct({ total: 'v.id' })
      .first();
    const total = parseInt(totalResult?.total ?? 0, 10) || 0;

    const violations = await applyViolationFilters(violationsBaseQuery().select(VIOLATION_SELECT), filters)
      .orderBy('v.detected_at', 'desc')
      .limit(limitNum)
      .offset((pageNum - 1) * limitNum);

    return res.json({
      violations: (violations || []).map(mapViolation),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitNum) || 1),
      },
    });
  } catch (error) {
    console.error('List violations error:', error);
    return res.status(500).json({ message: 'Không thể tải danh sách vi phạm.' });
  }
};

// Lấy chi tiết một vi phạm
exports.getViolationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin vi phạm
    const violation = await db('violations as v')
      .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .leftJoin('cameras as c', 'c.id', 'v.camera_id')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .leftJoin('users as verifier', 'verifier.id', 'v.verified_by')
      .where('v.id', id)
      .select(
        'v.id',
        'v.camera_id',
        'v.vehicle_id',
        'v.detected_plate_text',
        'v.corrected_plate_text',
        'v.ocr_confidence',
        'v.violation_type',
        'v.evidence_image_url',
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
        'veh.chassis_number',
        'veh.engine_number',
        'c.location_name as camera_location',
        'c.road_segment',
        'c.camera_code',
        'u.full_name as owner_name',
        'u.national_id as owner_national_id',
        'u.phone as owner_phone',
        'u.email as owner_email',
        'u.address as owner_address',
        'f.title as fine_title',
        'f.description as fine_description',
        'f.min_amount',
        'f.max_amount',
        'f.default_amount',
        'verifier.full_name as verified_by_name',
        'verifier.badge_number as verified_by_badge'
      )
      .first();

    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    // Lấy invoice nếu có
    const invoice = await db('invoices')
      .where('violation_id', id)
      .first();

    // Tạo lịch sử xử lý
    const isOfficerSource = violation.source === 'OFFICER';
    const history = [
      {
        action: isOfficerSource ? 'Cán bộ ghi nhận vi phạm' : 'AI phát hiện vi phạm',
        timestamp: violation.detected_at,
        actor: isOfficerSource
          ? (violation.verified_by_name
            ? `${violation.verified_by_name}${violation.verified_by_badge ? ` (${violation.verified_by_badge})` : ''}`
            : 'Cán bộ CSGT')
          : `Camera ${violation.camera_code || violation.camera_location || 'AI'}`,
        note: isOfficerSource
          ? 'Vi phạm được cán bộ thêm thủ công khi phát hiện tại hiện trường'
          : `OCR confidence: ${Math.round(Number(violation.ocr_confidence || 0) * 100)}%`,
      },
    ];

    if (violation.verified_at) {
      history.push({
        action: violation.status === 'OFFICER_VERIFIED' ? 'Xác minh hợp lệ' : 
                violation.status === 'REJECTED' ? 'Từ chối vi phạm' : 'Cập nhật trạng thái',
        timestamp: violation.verified_at,
        actor: violation.verified_by_name 
          ? `${violation.verified_by_name}${violation.verified_by_badge ? ` (${violation.verified_by_badge})` : ''}`
          : 'Cán bộ CSGT',
        note: violation.rejection_reason || (violation.corrected_plate_text && violation.corrected_plate_text !== violation.detected_plate_text
          ? `Điều chỉnh biển số: ${violation.detected_plate_text} → ${violation.corrected_plate_text}`
          : null),
      });
    }

    if (invoice) {
      history.push({
        action: 'Phát hành biên lai',
        timestamp: invoice.created_at,
        actor: 'Hệ thống',
        note: `Mã biên lai: ${invoice.invoice_code} - Số tiền: ${parseFloat(invoice.amount).toLocaleString('vi-VN')} đ`,
      });

      if (invoice.paid_at) {
        history.push({
          action: 'Đã thanh toán',
          timestamp: invoice.paid_at,
          actor: 'Công dân',
          note: invoice.payment_method ? `Phương thức: ${invoice.payment_method}` : null,
        });
      }
    }

    return res.json({
      violation: mapViolation(violation),
      invoice: invoice ? {
        id: invoice.id,
        violationId: invoice.violation_id,
        invoiceCode: invoice.invoice_code,
        amount: parseFloat(invoice.amount),
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        status: invoice.status,
        paymentMethod: invoice.payment_method,
        transactionId: invoice.transaction_id,
        paidAt: invoice.paid_at,
        createdAt: invoice.created_at,
        updatedAt: invoice.updated_at,
      } : null,
      history: history.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    });
  } catch (error) {
    console.error('Get violation detail error:', error);
    return res.status(500).json({ message: 'Không thể tải chi tiết vi phạm.' });
  }
};

// Xác minh vi phạm
exports.verifyViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { correctedPlate, vehicleId } = req.body;

    const violation = await db('violations').where('id', id).first();
    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    if (violation.status !== 'AI_PENDING') {
      return res.status(400).json({ message: 'Vi phạm này đã được xử lý.' });
    }

    // Tìm vehicle nếu có correctedPlate
    let foundVehicleId = vehicleId;
    if (correctedPlate && !foundVehicleId) {
      const vehicle = await db('vehicles')
        .whereRaw('UPPER(REPLACE(REPLACE(REPLACE(license_plate, " ", ""), ".", ""), "-", "")) = ?', 
          [correctedPlate.toUpperCase().replace(/[\s.-]/g, '')])
        .first();
      if (vehicle) {
        foundVehicleId = vehicle.id;
      }
    }

    await db('violations')
      .where('id', id)
      .update({
        status: 'OFFICER_VERIFIED',
        corrected_plate_text: correctedPlate || violation.detected_plate_text,
        vehicle_id: foundVehicleId || violation.vehicle_id,
        verified_by: req.user.id,
        verified_at: now(),
        updated_at: now(),
      });

    const updated = await db('violations').where('id', id).first();
    return res.json({ 
      violation: updated,
      message: 'Đã xác minh vi phạm thành công.' 
    });
  } catch (error) {
    console.error('Verify violation error:', error);
    return res.status(500).json({ message: 'Không thể xác minh vi phạm.' });
  }
};

// Từ chối vi phạm
exports.rejectViolation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối.' });
    }

    const violation = await db('violations').where('id', id).first();
    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    if (violation.status === 'INVOICED') {
      return res.status(400).json({ message: 'Không thể từ chối vi phạm đã phát hành hóa đơn.' });
    }

    await db('violations')
      .where('id', id)
      .update({
        status: 'REJECTED',
        rejection_reason: reason.trim(),
        verified_by: req.user.id,
        verified_at: now(),
        updated_at: now(),
      });

    const updated = await db('violations').where('id', id).first();
    return res.json({ 
      violation: updated,
      message: 'Đã từ chối vi phạm.' 
    });
  } catch (error) {
    console.error('Reject violation error:', error);
    return res.status(500).json({ message: 'Không thể từ chối vi phạm.' });
  }
};

// Cập nhật biển số OCR
exports.updatePlate = async (req, res) => {
  try {
    const { id } = req.params;
    const { correctedPlateText } = req.body;

    if (!correctedPlateText || !correctedPlateText.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập biển số.' });
    }

    const violation = await db('violations').where('id', id).first();
    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    // Tìm vehicle với biển số mới
    const vehicle = await db('vehicles')
      .whereRaw('UPPER(REPLACE(REPLACE(REPLACE(license_plate, " ", ""), ".", ""), "-", "")) = ?', 
        [correctedPlateText.toUpperCase().replace(/[\s.-]/g, '')])
      .first();

    await db('violations')
      .where('id', id)
      .update({
        corrected_plate_text: correctedPlateText.trim(),
        vehicle_id: vehicle ? vehicle.id : violation.vehicle_id,
        updated_at: now(),
      });

    const updated = await db('violations').where('id', id).first();
    return res.json({ 
      violation: updated,
      vehicle,
      message: 'Đã cập nhật biển số.' 
    });
  } catch (error) {
    console.error('Update plate error:', error);
    return res.status(500).json({ message: 'Không thể cập nhật biển số.' });
  }
};

// Tạo hóa đơn từ vi phạm
// Huỷ hóa đơn chưa thanh toán, lý do được lưu vào audit_logs
exports.cancelInvoice = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ message: 'Lý do huỷ tối thiểu 5 ký tự.' });
    }

    const invoice = await db('invoices').where('id', req.params.id).first();
    if (!invoice) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
    }
    if (invoice.status !== 'UNPAID' && invoice.status !== 'OVERDUE') {
      return res.status(400).json({ message: 'Chỉ huỷ được hóa đơn chưa thanh toán.' });
    }

    await db.transaction(async (trx) => {
      await trx('invoices').where('id', invoice.id).update({ status: 'CANCELLED', updated_at: now() });
      await trx('audit_logs').insert({
        user_id: req.user.id,
        action: 'CANCEL_INVOICE',
        target_table: 'invoices',
        target_id: invoice.id,
        old_data: JSON.stringify({ status: invoice.status }),
        new_data: JSON.stringify({ status: 'CANCELLED', reason }),
        ip_address: req.ip || null,
      });
    });

    const updated = await db('invoices').where('id', invoice.id).first();
    return res.json({ invoice: mapInvoice(updated), message: 'Đã huỷ hóa đơn.' });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    return res.status(500).json({ message: 'Không thể huỷ hóa đơn.' });
  }
};

exports.createInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, dueDate } = req.body;

    const violation = await db('violations as v')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .where('v.id', id)
      .select('v.*', 'f.default_amount', 'f.min_amount', 'f.max_amount')
      .first();

    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    if (violation.status !== 'OFFICER_VERIFIED') {
      return res.status(400).json({ message: 'Vi phạm phải được xác minh trước khi phát hành hóa đơn.' });
    }

    // Check if invoice already exists
    const existingInvoice = await db('invoices').where('violation_id', id).first();
    if (existingInvoice) {
      return res.status(400).json({ message: 'Vi phạm này đã có hóa đơn.' });
    }

    if (!violation.vehicle_id) {
      return res.status(400).json({ message: 'Vi phạm chưa xác định được phương tiện.' });
    }

    // Determine amount
    const invoiceAmount = amount || violation.default_amount;
    if (invoiceAmount < violation.min_amount || invoiceAmount > violation.max_amount) {
      return res.status(400).json({ 
        message: `Số tiền phải trong khoảng ${violation.min_amount.toLocaleString('vi-VN')} - ${violation.max_amount.toLocaleString('vi-VN')} đ` 
      });
    }

    // Determine due date (15 days from now if not specified)
    const issueDateObj = new Date();
    const dueDateObj = dueDate ? new Date(dueDate) : new Date(issueDateObj.getTime() + 15 * 24 * 60 * 60 * 1000);

    const invoiceId = crypto.randomUUID();
    const invoiceCode = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.transaction(async (trx) => {
      // Create invoice
      await trx('invoices').insert({
        id: invoiceId,
        violation_id: id,
        invoice_code: invoiceCode,
        amount: invoiceAmount,
        issue_date: issueDateObj.toISOString().split('T')[0],
        due_date: dueDateObj.toISOString().split('T')[0],
        status: 'UNPAID',
        created_at: now(),
        updated_at: now(),
      });

      // Update violation status
      await trx('violations')
        .where('id', id)
        .update({
          status: 'INVOICED',
          updated_at: now(),
        });
    });

    const invoice = await db('invoices').where('id', invoiceId).first();
    const updatedViolation = await db('violations').where('id', id).first();

    return res.status(201).json({ 
      invoice,
      violation: updatedViolation,
      message: `Đã phát hành biên lai ${invoiceCode}` 
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ message: 'Không thể tạo hóa đơn.' });
  }
};

// Lấy danh sách vi phạm chờ duyệt (AI Queue)
exports.getAIQueue = async (req, res) => {
  try {
    const { sortBy = 'time' } = req.query; // time | confidence

    let query = violationsBaseQuery()
      .select(VIOLATION_SELECT)
      .where('v.status', 'AI_PENDING')
      .andWhere('v.source', 'AI');

    if (sortBy === 'confidence') {
      query = query.orderBy('v.ocr_confidence', 'asc');
    } else {
      query = query.orderBy('v.detected_at', 'desc');
    }

    const violations = await query;

    return res.json({
      violations: (violations || []).map(mapViolation),
      total: violations.length,
    });
  } catch (error) {
    console.error('Get AI queue error:', error);
    return res.status(500).json({ message: 'Không thể tải hàng đợi AI.' });
  }
};

exports.createOfficerViolation = async (req, res) => {
  try {
    const plate = String(req.body?.plate || req.body?.detectedPlateText || '').trim().toUpperCase();
    const violationType = String(req.body?.violationType || '').trim();
    const cameraId = String(req.body?.cameraId || 'cam-officer-manual').trim();
    const evidenceImageUrl = String(req.body?.evidenceImageUrl || '').trim();
    const evidenceImage = req.body?.evidenceImage;
    const detectedAt = req.body?.detectedAt ? new Date(req.body.detectedAt) : new Date();

    if (!plate) {
      return res.status(400).json({ message: 'Vui lòng nhập biển số.' });
    }
    if (!violationType) {
      return res.status(400).json({ message: 'Vui lòng chọn loại vi phạm.' });
    }

    const fine = await db('fines').where('violation_type', violationType).first();
    if (!fine) {
      return res.status(400).json({ message: 'Loại vi phạm không hợp lệ.' });
    }

    const camera = await db('cameras').where('id', cameraId).first();
    if (!camera) {
      return res.status(400).json({ message: 'Không tìm thấy camera/địa điểm ghi nhận.' });
    }

    const plateKey = normalizePlate(plate);
    const vehicle = await db('vehicles')
      .whereRaw(
        "UPPER(REPLACE(REPLACE(REPLACE(license_plate, ' ', ''), '.', ''), '-', '')) = ?",
        [plateKey],
      )
      .first();

    const id = crypto.randomUUID();

    // Ảnh đã tải lên trước qua /plate-images (evidenceImageUrl),
    // hoặc gửi kèm base64 (evidenceImage) — dùng cho luồng camera sau này
    let imageUrl = '';
    if (isDataUrlImage(evidenceImage)) {
      const uploaded = await uploadImage(evidenceImage, { subfolder: 'violations', publicId: id });
      imageUrl = uploaded.url;
    } else if (isStoredImageUrl(evidenceImageUrl)) {
      imageUrl = evidenceImageUrl;
    } else {
      return res.status(400).json({ message: 'Vui lòng tải lên ảnh biển số làm bằng chứng vi phạm.' });
    }

    await db('violations').insert({
      id,
      camera_id: camera.id,
      vehicle_id: vehicle?.id || null,
      detected_plate_text: plate,
      corrected_plate_text: plate,
      ocr_confidence: 1,
      violation_type: violationType,
      evidence_image_url: imageUrl,
      detected_at: Number.isNaN(detectedAt.getTime()) ? new Date() : detectedAt,
      status: 'OFFICER_VERIFIED',
      source: 'OFFICER',
      verified_by: req.user.id,
      verified_at: now(),
      created_at: now(),
      updated_at: now(),
    });

    const created = await applyViolationFilters(
      violationsBaseQuery().select(VIOLATION_SELECT),
      {},
    )
      .where('v.id', id)
      .first();

    return res.status(201).json({
      violation: mapViolation(created),
      message: 'Đã ghi nhận vi phạm thủ công.',
    });
  } catch (error) {
    console.error('Create officer violation error:', error);
    return res.status(500).json({ message: 'Không thể thêm vi phạm.' });
  }
};

module.exports = exports;
