const crypto = require('crypto');
const db = require('../../db/knex');
const { mapVehicle } = require('../../utils/mappers');
const { isStoredImageUrl } = require('../../services/imageStorage');
const { now, dupMessage, isDup, vehicleOwnerSelect, findCitizen } = require('./helpers');

const VEHICLE_TYPES = ['CAR', 'MOTORBIKE', 'TRUCK', 'BUS', 'OTHER'];
const PLATE_COLORS = ['WHITE', 'BLUE', 'YELLOW', 'RED'];

exports.listVehicles = async (req, res) => {
  try {
    const vehicles = await vehicleOwnerSelect().orderBy('veh.registered_at', 'desc');
    return res.json({ vehicles: vehicles.map(mapVehicle) });
  } catch (error) {
    console.error('List vehicles error:', error);
    return res.status(500).json({ message: 'Không thể tải danh sách phương tiện.' });
  }
};

exports.createVehicle = async (req, res) => {
  try {
    const licensePlate = String(req.body?.licensePlate || '').trim().toUpperCase();
    const ownerId = String(req.body?.ownerId || '').trim();
    const vehicleType = String(req.body?.vehicleType || '').trim().toUpperCase();
    const brand = String(req.body?.brand || '').trim();
    const model = String(req.body?.model || '').trim();
    const color = String(req.body?.color || '').trim();
    const plateColor = String(req.body?.plateColor || 'WHITE').trim().toUpperCase();
    const registeredAt = String(req.body?.registeredAt || '').trim();
    const chassisNumber = String(req.body?.chassisNumber || '').trim() || null;
    const engineNumber = String(req.body?.engineNumber || '').trim() || null;
    const insuranceNumber = String(req.body?.insuranceNumber || '').trim() || null;
    const plateImageUrl = String(req.body?.plateImageUrl || '').trim();

    if (plateImageUrl && !isStoredImageUrl(plateImageUrl)) {
      return res.status(400).json({ message: 'Ảnh biển số không hợp lệ. Hãy tải ảnh lên lại.' });
    }
    if (!licensePlate || !ownerId || !vehicleType || !registeredAt) {
      return res.status(400).json({
        message: 'Vui lòng nhập biển số, loại xe, ngày đăng ký và chọn chủ sở hữu.',
      });
    }
    if (!VEHICLE_TYPES.includes(vehicleType)) {
      return res.status(400).json({ message: 'Loại xe không hợp lệ.' });
    }
    if (!PLATE_COLORS.includes(plateColor)) {
      return res.status(400).json({ message: 'Màu biển số không hợp lệ.' });
    }

    const owner = await findCitizen(ownerId);
    if (!owner) {
      return res.status(400).json({ message: 'Chủ sở hữu phải là công dân đã đăng ký.' });
    }

    const id = crypto.randomUUID();
    await db('vehicles').insert({
      id,
      license_plate: licensePlate,
      owner_id: ownerId,
      vehicle_type: vehicleType,
      plate_color: plateColor,
      brand: brand || null,
      model: model || null,
      color: color || null,
      chassis_number: chassisNumber,
      engine_number: engineNumber,
      insurance_number: insuranceNumber,
      plate_image_url: plateImageUrl || null,
      registered_at: registeredAt,
      created_at: now(),
      updated_at: now(),
    });

    const created = await vehicleOwnerSelect().where('veh.id', id).first();
    return res.status(201).json({ vehicle: mapVehicle(created) });
  } catch (error) {
    console.error('Create vehicle error:', error);
    if (isDup(error)) {
      return res.status(409).json({ message: dupMessage(error, 'Thông tin phương tiện bị trùng.') });
    }
    return res.status(500).json({ message: 'Không thể thêm phương tiện.' });
  }
};

exports.updateVehicle = async (req, res) => {
  try {
    const existing = await db('vehicles').where('id', req.params.id).first();
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phương tiện.' });
    }

    const patch = { updated_at: now() };
    const licensePlate = String(req.body?.licensePlate ?? '').trim().toUpperCase();
    const vehicleType = String(req.body?.vehicleType ?? '').trim().toUpperCase();
    const brand = String(req.body?.brand ?? '').trim();
    const model = String(req.body?.model ?? '').trim();
    const color = String(req.body?.color ?? '').trim();
    const plateColor = String(req.body?.plateColor ?? '').trim().toUpperCase();
    const registeredAt = String(req.body?.registeredAt ?? '').trim();
    const chassisNumber = String(req.body?.chassisNumber ?? '').trim();
    const engineNumber = String(req.body?.engineNumber ?? '').trim();
    const insuranceNumber = String(req.body?.insuranceNumber ?? '').trim();
    const ownerId = String(req.body?.ownerId ?? '').trim();
    const plateImageUrl = String(req.body?.plateImageUrl ?? '').trim();

    if (licensePlate) patch.license_plate = licensePlate;
    if (plateImageUrl) {
      if (!isStoredImageUrl(plateImageUrl)) {
        return res.status(400).json({ message: 'Ảnh biển số không hợp lệ. Hãy tải ảnh lên lại.' });
      }
      patch.plate_image_url = plateImageUrl;
    }
    if (vehicleType) {
      if (!VEHICLE_TYPES.includes(vehicleType)) {
        return res.status(400).json({ message: 'Loại xe không hợp lệ.' });
      }
      patch.vehicle_type = vehicleType;
    }
    if (brand) patch.brand = brand;
    if (model) patch.model = model;
    if (color) patch.color = color;
    if (plateColor) {
      if (!PLATE_COLORS.includes(plateColor)) {
        return res.status(400).json({ message: 'Màu biển số không hợp lệ.' });
      }
      patch.plate_color = plateColor;
    }
    if (registeredAt) patch.registered_at = registeredAt;
    if (chassisNumber) patch.chassis_number = chassisNumber;
    if (engineNumber) patch.engine_number = engineNumber;
    if (insuranceNumber) patch.insurance_number = insuranceNumber;
    if (ownerId) {
      const owner = await findCitizen(ownerId);
      if (!owner) {
        return res.status(400).json({ message: 'Chủ sở hữu phải là công dân đã đăng ký.' });
      }
      patch.owner_id = ownerId;
    }

    const changed = Object.keys(patch).filter((k) => k !== 'updated_at');
    if (changed.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật. Hãy điền ít nhất một ô.' });
    }

    // Reset trạng thái về PENDING nếu có yêu cầu sửa từ công dân
    if (existing.verification_status === 'REVISION_REQUESTED' || existing.verification_status === 'REJECTED') {
      patch.verification_status = 'PENDING';
      patch.citizen_feedback = null;
    }

    await db('vehicles').where('id', existing.id).update(patch);
    const updated = await vehicleOwnerSelect().where('veh.id', existing.id).first();
    return res.json({ vehicle: mapVehicle(updated) });
  } catch (error) {
    console.error('Update vehicle error:', error);
    if (isDup(error)) {
      return res.status(409).json({ message: dupMessage(error, 'Thông tin phương tiện bị trùng.') });
    }
    return res.status(500).json({ message: 'Không thể cập nhật phương tiện.' });
  }
};

exports.transferVehicle = async (req, res) => {
  try {
    const existing = await db('vehicles').where('id', req.params.id).first();
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy phương tiện.' });
    }

    const ownerId = String(req.body?.ownerId || '').trim();
    if (!ownerId) {
      return res.status(400).json({ message: 'Vui lòng chọn công dân nhận quyền sở hữu.' });
    }
    if (ownerId === existing.owner_id) {
      return res.status(400).json({ message: 'Chủ sở hữu mới phải khác chủ hiện tại.' });
    }

    const owner = await findCitizen(ownerId);
    if (!owner) {
      return res.status(400).json({ message: 'Người nhận phải là công dân đã đăng ký trong hệ thống.' });
    }

    await db('vehicles').where('id', existing.id).update({
      owner_id: ownerId,
      updated_at: now(),
    });

    const updated = await vehicleOwnerSelect().where('veh.id', existing.id).first();
    return res.json({
      vehicle: mapVehicle(updated),
      message: `Đã chuyển quyền sở hữu cho ${owner.full_name}.`,
    });
  } catch (error) {
    console.error('Transfer vehicle error:', error);
    return res.status(500).json({ message: 'Không thể chuyển nhượng phương tiện.' });
  }
};
