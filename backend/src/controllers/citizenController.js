const db = require('../db/knex');
const { mapVehicle, mapViolation, mapInvoice } = require('../utils/mappers');

exports.getDashboard = async (req, res) => {
  try {
    const ownerId = req.user.id;

    const vehicles = await db('vehicles')
      .where('owner_id', ownerId)
      .orderBy('registered_at', 'desc');

    const violations = await db('violations as v')
      .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .leftJoin('cameras as c', 'c.id', 'v.camera_id')
      .where('veh.owner_id', ownerId)
      .select(
        'v.*',
        'veh.license_plate',
        'c.location_name',
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
