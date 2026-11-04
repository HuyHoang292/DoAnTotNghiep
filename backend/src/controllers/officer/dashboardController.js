const db = require('../../db/knex');
const { mapVehicle, mapCamera, mapViolation, mapInvoice } = require('../../utils/mappers');

exports.getDashboard = async (req, res) => {
  try {
    console.log('📊 Loading officer dashboard...');
    
    // Load vehicles
    const vehicles = await db('vehicles as veh')
      .leftJoin('users as u', 'u.id', 'veh.owner_id')
      .select(
        'veh.*',
        'u.full_name as owner_name',
        'u.phone as owner_phone',
        'u.national_id as owner_national_id',
        'u.email as owner_email',
      )
      .orderBy('veh.registered_at', 'desc');
    console.log(`✅ Loaded ${vehicles.length} vehicles`);

    // Load cameras
    const cameras = await db('cameras').select('*').orderBy('location_name', 'asc');
    console.log(`✅ Loaded ${cameras.length} cameras`);

    // Load violations
    const violations = await db('violations as v')
      .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .leftJoin('cameras as c', 'c.id', 'v.camera_id')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .select(
        'v.*',
        'veh.license_plate',
        'c.location_name as camera_location',
        'f.title as fine_title',
        'f.description as fine_description',
        'f.min_amount',
        'f.max_amount',
        'f.default_amount',
      )
      .orderBy('v.detected_at', 'desc');
    console.log(`✅ Loaded ${violations.length} violations`);

    // Load invoices
    const invoices = await db('invoices').select('*').orderBy('issue_date', 'desc');
    console.log(`✅ Loaded ${invoices.length} invoices`);

    console.log('📤 Sending dashboard response');
    return res.json({
      vehicles: vehicles.map(mapVehicle),
      cameras: cameras.map(mapCamera),
      violations: violations.map(mapViolation),
      invoices: invoices.map(mapInvoice),
    });
  } catch (error) {
    console.error('❌ Officer dashboard error:', error);
    return res.status(500).json({ message: 'Không thể tải dữ liệu tổng quan.' });
  }
};
