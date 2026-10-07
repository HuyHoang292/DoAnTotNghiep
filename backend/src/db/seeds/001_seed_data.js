exports.seed = async function (knex) {
  // 1. Tắt kiểm tra khóa ngoại để dọn dẹp dữ liệu cũ an toàn
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');

  await knex('audit_logs').truncate();
  await knex('notifications').truncate();
  await knex('invoices').truncate();
  await knex('camera_events').truncate();
  await knex('violations').truncate();
  await knex('cameras').truncate();
  await knex('fines').truncate();
  await knex('vehicles').truncate();
  await knex('users').truncate();

  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Chèn Mức phạt (fines)
  await knex('fines').insert([
    { violation_type: 'RED_LIGHT', title: 'Vượt đèn đỏ / đèn vàng', default_amount: 5000000.00, min_amount: 4000000, max_amount: 6000000 },
    { violation_type: 'WRONG_LANE', title: 'Đi sai làn đường', default_amount: 4000000.00, min_amount: 3000000, max_amount: 5000000 }
  ]);

  // 3. Chèn Người dùng (users) - 1 Admin, 1 Officer, 3 Citizens
  const bcrypt = require('bcryptjs');
  const defaultPasswordHash = await bcrypt.hash('123456', 10);

  await knex('users').insert([
    {
      id: 'usr-admin-001',
      full_name: 'Trần Quản Trị',
      national_id: '001090000001',
      email: 'admin@traffic.gov.vn',
      phone: '0901000001',
      password_hash: defaultPasswordHash,
      gender: 'MALE',
      address: 'Số 1 Lê Duẩn',
      ward: 'Bến Nghé',
      city: 'Quận 1',
      province: 'TP. Hồ Chí Minh',
      role: 'ADMIN',
      status: 'ACTIVE',
      badge_number: 'ADM-01'
    },
    {
      id: 'usr-officer-001',
      full_name: 'Nguyễn Văn Cảnh Sát',
      national_id: '001090123456',
      email: 'officer@traffic.gov.vn',
      phone: '0901111222',
      password_hash: defaultPasswordHash,
      gender: 'MALE',
      address: 'Số 25 Trần Hưng Đạo',
      ward: 'Cửa Nam',
      city: 'Quận Hoàn Kiếm',
      province: 'Hà Nội',
      role: 'OFFICER',
      status: 'ACTIVE',
      badge_number: 'CA-12345'
    },
    {
      id: 'usr-dan-001',
      full_name: 'Trần Văn Dần',
      national_id: '001095999888',
      email: 'citizen@gmail.com',
      phone: '0988888999',
      password_hash: defaultPasswordHash,
      gender: 'MALE',
      address: '123 Nguyễn Văn Linh',
      ward: 'Nam Dương',
      city: 'Quận Hải Châu',
      province: 'Đà Nẵng',
      role: 'CITIZEN',
      status: 'ACTIVE'
    },
    {
      id: 'usr-mai-002',
      full_name: 'Lê Thị Mai',
      national_id: '001095777666',
      email: 'lemai@gmail.com',
      phone: '0977666555',
      password_hash: defaultPasswordHash,
      gender: 'FEMALE',
      address: '456 Điện Biên Phủ',
      ward: 'Phường 25',
      city: 'Quận Bình Thạnh',
      province: 'TP. Hồ Chí Minh',
      role: 'CITIZEN',
      status: 'ACTIVE'
    },
    {
      id: 'usr-hung-003',
      full_name: 'Phạm Hùng',
      national_id: '001095333222',
      email: 'hungpham@gmail.com',
      phone: '0933222111',
      password_hash: defaultPasswordHash,
      gender: 'MALE',
      address: '789 Láng Hạ',
      ward: 'Láng Hạ',
      city: 'Quận Đống Đa',
      province: 'Hà Nội',
      role: 'CITIZEN',
      status: 'ACTIVE'
    }
  ]);

  // 4. Chèn đúng 2 Camera (cameras)
  await knex('cameras').insert([
    {
      id: 'cam-001',
      camera_code: 'CAM_HANGXANH_01',
      location_name: 'Ngã tư Hàng Xanh - Điện Biên Phủ',
      latitude: 10.801823,
      longitude: 106.711412,
      road_segment: 'Quận Bình Thạnh, TP.HCM',
      status: 'ONLINE'
    },
    {
      id: 'cam-002',
      camera_code: 'CAM_NGUYENTHAIHOC_01',
      location_name: 'Ngã tư Nguyễn Thái Học - Lê Duẩn',
      latitude: 21.028511,
      longitude: 105.842341,
      road_segment: 'Quận Ba Đình, Hà Nội',
      status: 'ONLINE'
    }
  ]);

  // 5. Chèn Phương tiện (vehicles)
  const vehiclesData = [
    { id: 'veh-dan-01', license_plate: '30F-123.45', owner_id: 'usr-dan-001', vehicle_type: 'CAR', brand: 'Toyota', model: 'Camry', color: 'Đen', registered_at: '2023-01-15' },
    { id: 'veh-dan-02', license_plate: '29A-888.99', owner_id: 'usr-dan-001', vehicle_type: 'MOTORBIKE', brand: 'Honda', model: 'SH 150i', color: 'Trắng', registered_at: '2023-05-20' },
    { id: 'veh-dan-03', license_plate: '30H-999.99', owner_id: 'usr-dan-001', vehicle_type: 'CAR', brand: 'Mercedes-Benz', model: 'E300', color: 'Đỏ', registered_at: '2024-02-10' },
    { id: 'veh-dan-04', license_plate: '30K-555.66', owner_id: 'usr-dan-001', vehicle_type: 'CAR', brand: 'Hyundai', model: 'SantaFe', color: 'Xanh', registered_at: '2024-08-12' },
    { id: 'veh-dan-05', license_plate: '29C-111.22', owner_id: 'usr-dan-001', vehicle_type: 'TRUCK', brand: 'Ford', model: 'Ranger', color: 'Ghi', registered_at: '2025-01-05' },
    { id: 'veh-mai-01', license_plate: '51G-777.88', owner_id: 'usr-mai-002', vehicle_type: 'CAR', brand: 'Mazda', model: 'CX-5', color: 'Trắng', registered_at: '2023-11-11' },
    { id: 'veh-mai-02', license_plate: '59P1-123.45', owner_id: 'usr-mai-002', vehicle_type: 'MOTORBIKE', brand: 'Yamaha', model: 'Grande', color: 'Đỏ', registered_at: '2024-03-15' },
    { id: 'veh-hung-01', license_plate: '43A-333.44', owner_id: 'usr-hung-003', vehicle_type: 'CAR', brand: 'Kia', model: 'K3', color: 'Xám', registered_at: '2023-09-09' },
    { id: 'veh-hung-02', license_plate: '43S1-666.77', owner_id: 'usr-hung-003', vehicle_type: 'MOTORBIKE', brand: 'Honda', model: 'AirBlade', color: 'Đen', registered_at: '2024-06-01' }
  ].map(v => ({ ...v, plate_color: 'WHITE' }));

  await knex('vehicles').insert(vehiclesData);

  // 6. Chèn Vi phạm (violations) & Hóa đơn (invoices)
  const violations = [];
  const invoices = [];

  const createViolationAndInvoice = (id, vehId, plate, camId, type, dateStr, dueDateStr, status, invStatus = null, amount = 5000000) => {
    violations.push({
      id: id,
      camera_id: camId,
      vehicle_id: vehId,
      detected_plate_text: plate,
      corrected_plate_text: plate,
      ocr_confidence: 0.95,
      violation_type: type,
      evidence_image_url: `https://picsum.photos/seed/${id}/400/300`,
      detected_at: dateStr,
      due_date: dueDateStr,
      status: status,
      verified_by: status !== 'AI_PENDING' ? 'usr-officer-001' : null,
      verified_at: status !== 'AI_PENDING' ? dateStr : null
    });

    if (status === 'INVOICED' && invStatus) {
      invoices.push({
        id: `inv-${id}`,
        violation_id: id,
        invoice_code: `INV-${id.toUpperCase()}`,
        amount: amount,
        issue_date: dateStr.split(' ')[0],
        due_date: dueDateStr.split(' ')[0],
        status: invStatus,
        paid_at: invStatus === 'PAID' ? '2026-09-10 10:00:00' : null
      });
    }
  };

  // --- 15 VI PHẠM CHO TRẦN VĂN DẦN ---
  createViolationAndInvoice('vio-dan-1a', 'veh-dan-01', '30F-123.45', 'cam-001', 'RED_LIGHT', '2026-09-01 08:30:00', '2026-09-15 08:30:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-dan-1b', 'veh-dan-01', '30F-123.45', 'cam-002', 'WRONG_LANE', '2026-09-10 14:20:00', '2026-09-25 14:20:00', 'INVOICED', 'UNPAID', 4000000);
  createViolationAndInvoice('vio-dan-1c', 'veh-dan-01', '30F-123.45', 'cam-001', 'SPEEDING', '2026-09-12 18:00:00', '2026-09-27 18:00:00', 'AI_PENDING');

  createViolationAndInvoice('vio-dan-2a', 'veh-dan-02', '29A-888.99', 'cam-002', 'HELMET_LESS', '2026-08-20 09:10:00', '2026-09-05 09:10:00', 'INVOICED', 'PAID', 500000);
  createViolationAndInvoice('vio-dan-2b', 'veh-dan-02', '29A-888.99', 'cam-001', 'RED_LIGHT', '2026-09-02 11:40:00', '2026-09-16 11:40:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-dan-2c', 'veh-dan-02', '29A-888.99', 'cam-002', 'WRONG_WAY', '2026-09-11 16:15:00', '2026-09-26 16:15:00', 'OFFICER_VERIFIED');

  createViolationAndInvoice('vio-dan-3a', 'veh-dan-03', '30H-999.99', 'cam-001', 'SPEEDING', '2026-08-25 21:00:00', '2026-09-09 21:00:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-dan-3b', 'veh-dan-03', '30H-999.99', 'cam-002', 'ILLEGAL_PARKING', '2026-09-05 10:30:00', '2026-09-20 10:30:00', 'INVOICED', 'UNPAID', 900000);
  createViolationAndInvoice('vio-dan-3c', 'veh-dan-03', '30H-999.99', 'cam-001', 'RED_LIGHT', '2026-09-13 07:45:00', '2026-09-28 07:45:00', 'REJECTED');

  createViolationAndInvoice('vio-dan-4a', 'veh-dan-04', '30K-555.66', 'cam-002', 'WRONG_LANE', '2026-09-03 15:00:00', '2026-09-18 15:00:00', 'INVOICED', 'OVERDUE', 4000000);
  createViolationAndInvoice('vio-dan-4b', 'veh-dan-04', '30K-555.66', 'cam-001', 'SPEEDING', '2026-09-08 13:20:00', '2026-09-23 13:20:00', 'INVOICED', 'UNPAID', 5000000);
  createViolationAndInvoice('vio-dan-4c', 'veh-dan-04', '30K-555.66', 'cam-002', 'RED_LIGHT', '2026-09-12 17:10:00', '2026-09-27 17:10:00', 'AI_PENDING');

  createViolationAndInvoice('vio-dan-5a', 'veh-dan-05', '29C-111.22', 'cam-001', 'WRONG_WAY', '2026-09-04 09:00:00', '2026-09-19 09:00:00', 'INVOICED', 'OVERDUE', 4000000);
  createViolationAndInvoice('vio-dan-5b', 'veh-dan-05', '29C-111.22', 'cam-002', 'ILLEGAL_PARKING', '2026-09-07 11:00:00', '2026-09-22 11:00:00', 'INVOICED', 'PAID', 900000);
  createViolationAndInvoice('vio-dan-5c', 'veh-dan-05', '29C-111.22', 'cam-001', 'WRONG_LANE', '2026-09-10 16:30:00', '2026-09-25 16:30:00', 'OFFICER_VERIFIED');

  createViolationAndInvoice('vio-mai-1a', 'veh-mai-01', '51G-777.88', 'cam-001', 'RED_LIGHT', '2026-09-02 08:00:00', '2026-09-17 08:00:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-mai-2a', 'veh-mai-02', '59P1-123.45', 'cam-002', 'HELMET_LESS', '2026-09-09 10:00:00', '2026-09-24 10:00:00', 'INVOICED', 'UNPAID', 500000);
  createViolationAndInvoice('vio-hung-1a', 'veh-hung-01', '43A-333.44', 'cam-001', 'SPEEDING', '2026-09-06 14:00:00', '2026-09-21 14:00:00', 'INVOICED', 'UNPAID', 5000000);

  await knex('violations').insert(violations);
  await knex('invoices').insert(invoices);

  console.log('✅ Đã nạp thành công bộ dữ liệu chuẩn kèm thông tin chi tiết địa chỉ và giới tính!');
};