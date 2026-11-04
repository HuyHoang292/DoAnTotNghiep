const db = require('../../db/knex');

function now() {
  return db.fn.now();
}

function dupMessage(error, fallback) {
  const msg = String(error?.sqlMessage || error?.message || '');
  if (msg.includes('national_id')) return 'Số CCCD đã tồn tại trong hệ thống.';
  if (msg.includes('email')) return 'Email đã được sử dụng.';
  if (msg.includes('phone')) return 'Số điện thoại đã được sử dụng.';
  if (msg.includes('license_plate')) return 'Biển số xe đã được đăng ký.';
  if (msg.includes('chassis_number')) return 'Số khung đã tồn tại.';
  if (msg.includes('engine_number')) return 'Số máy đã tồn tại.';
  if (msg.includes('insurance_number')) return 'Số bảo hiểm đã tồn tại.';
  return fallback;
}

function isDup(error) {
  return error?.code === 'ER_DUP_ENTRY' || error?.errno === 1062;
}

function vehicleOwnerSelect() {
  return db('vehicles as veh')
    .leftJoin('users as u', 'u.id', 'veh.owner_id')
    .select(
      'veh.*',
      'u.full_name as owner_name',
      'u.phone as owner_phone',
      'u.national_id as owner_national_id',
      'u.email as owner_email',
    );
}

async function findCitizen(id) {
  return db('users').where({ id, role: 'CITIZEN' }).first();
}

module.exports = { now, dupMessage, isDup, vehicleOwnerSelect, findCitizen };
