const crypto = require('crypto');
const db = require('../../db/knex');
const { mapVehicle } = require('../../utils/mappers');
const { now } = require('./helpers');

// Duyệt thông tin phương tiện
exports.approveVehicle = async (req, res) => {
  try {
    const vehicle = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where({ 'veh.id': req.params.id, 'veh.owner_id': req.user.id })
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();

    if (!vehicle) {
      return res.status(404).json({ message: 'Không tìm thấy phương tiện.' });
    }

    if (vehicle.verification_status === 'APPROVED') {
      return res.status(400).json({ message: 'Phương tiện đã được duyệt trước đó.' });
    }

    await db('vehicles')
      .where('id', vehicle.id)
      .update({
        verification_status: 'APPROVED',
        citizen_feedback: null,
        verified_at: now(),
        updated_at: now(),
      });

    // Lưu lịch sử
    await db('vehicle_verification_history').insert({
      id: crypto.randomUUID(),
      vehicle_id: vehicle.id,
      action: 'APPROVED',
      feedback: null,
      actor_id: req.user.id,
      created_at: now(),
      updated_at: now(),
    });

    const updated = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where('veh.id', vehicle.id)
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();
    return res.json({ 
      vehicle: mapVehicle(updated),
      message: 'Đã xác nhận thông tin phương tiện chính xác.' 
    });
  } catch (error) {
    console.error('Approve vehicle error:', error);
    return res.status(500).json({ message: 'Không thể duyệt phương tiện.' });
  }
};

// Yêu cầu chỉnh sửa thông tin phương tiện
exports.requestRevision = async (req, res) => {
  try {
    const feedback = String(req.body?.feedback || '').trim();
    
    if (!feedback) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung cần chỉnh sửa.' });
    }

    const vehicle = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where({ 'veh.id': req.params.id, 'veh.owner_id': req.user.id })
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();

    if (!vehicle) {
      return res.status(404).json({ message: 'Không tìm thấy phương tiện.' });
    }

    if (vehicle.verification_status === 'APPROVED') {
      return res.status(400).json({ message: 'Không thể yêu cầu sửa phương tiện đã được duyệt.' });
    }

    await db('vehicles')
      .where('id', vehicle.id)
      .update({
        verification_status: 'REVISION_REQUESTED',
        citizen_feedback: feedback,
        updated_at: now(),
      });

    // Lưu lịch sử
    await db('vehicle_verification_history').insert({
      id: crypto.randomUUID(),
      vehicle_id: vehicle.id,
      action: 'REVISION_REQUESTED',
      feedback,
      actor_id: req.user.id,
      created_at: now(),
      updated_at: now(),
    });

    const updated = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where('veh.id', vehicle.id)
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();
    return res.json({ 
      vehicle: mapVehicle(updated),
      message: 'Đã gửi yêu cầu chỉnh sửa thông tin cho công an.' 
    });
  } catch (error) {
    console.error('Request revision error:', error);
    return res.status(500).json({ message: 'Không thể gửi yêu cầu chỉnh sửa.' });
  }
};

// Từ chối thông tin phương tiện
exports.rejectVehicle = async (req, res) => {
  try {
    const feedback = String(req.body?.feedback || '').trim();
    
    if (!feedback) {
      return res.status(400).json({ message: 'Vui lòng nhập lý do từ chối.' });
    }

    const vehicle = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where({ 'veh.id': req.params.id, 'veh.owner_id': req.user.id })
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();

    if (!vehicle) {
      return res.status(404).json({ message: 'Không tìm thấy phương tiện.' });
    }

    if (vehicle.verification_status === 'APPROVED') {
      return res.status(400).json({ message: 'Không thể từ chối phương tiện đã được duyệt.' });
    }

    await db('vehicles')
      .where('id', vehicle.id)
      .update({
        verification_status: 'REJECTED',
        citizen_feedback: feedback,
        updated_at: now(),
      });

    // Lưu lịch sử
    await db('vehicle_verification_history').insert({
      id: crypto.randomUUID(),
      vehicle_id: vehicle.id,
      action: 'REJECTED',
      feedback,
      actor_id: req.user.id,
      created_at: now(),
      updated_at: now(),
    });

    const updated = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where('veh.id', vehicle.id)
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .first();
    return res.json({ 
      vehicle: mapVehicle(updated),
      message: 'Đã từ chối thông tin phương tiện này.' 
    });
  } catch (error) {
    console.error('Reject vehicle error:', error);
    return res.status(500).json({ message: 'Không thể từ chối phương tiện.' });
  }
};
