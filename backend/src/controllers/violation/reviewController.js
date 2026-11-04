const db = require('../../db/knex');
const { mapViolation } = require('../../utils/mappers');
const { UNREAD_PLATE } = require('../../services/cameraMonitoring');
const { now, VIOLATION_SELECT, violationsBaseQuery } = require('./helpers');

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

    if ((correctedPlate || violation.detected_plate_text) === UNREAD_PLATE) {
      return res.status(400).json({ message: 'AI chưa đọc được biển số. Vui lòng nhập biển số từ ảnh bằng chứng.' });
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
