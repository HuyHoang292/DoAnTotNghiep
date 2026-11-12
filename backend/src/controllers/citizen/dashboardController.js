const db = require('../../db/knex');
const { mapVehicle, mapViolation, mapInvoice } = require('../../utils/mappers');

exports.getDashboard = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const vehicles = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .where('veh.owner_id', ownerId)
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .orderBy('veh.registered_at', 'desc');

    const violations = await db('violations as v')
      .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .leftJoin('cameras as c', 'c.id', 'v.camera_id')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .where('veh.owner_id', ownerId)
      // Vi phạm do AI phát hiện chỉ hiện với công dân sau khi cán bộ duyệt; vi phạm bị từ chối không hiển thị
      .whereNotIn('v.status', ['AI_PENDING', 'REJECTED'])
      .select(
        'v.*',
        'veh.license_plate',
        'c.location_name',
        'f.title as fine_title',
        'f.description as fine_description',
        'f.min_amount',
        'f.max_amount',
        'f.default_amount',
      )
      .orderBy('v.detected_at', 'desc');

    const invoices = await db('invoices as i')
      .join('violations as v', 'v.id', 'i.violation_id')
      .join('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .where('veh.owner_id', ownerId)
      .select('i.*')
      .orderBy('i.due_date', 'asc');

    return res.json({
      vehicles: vehicles.map(mapVehicle),
      violations: violations.map(mapViolation),
      invoices: invoices.map(mapInvoice),
    });
  } catch (error) {
    console.error('Citizen dashboard error:', error);
    return res.status(500).json({ message: 'Không thể tải dữ liệu trang chủ.' });
  }
};
