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
    {
      violation_type: 'RED_LIGHT',
      title: 'Vượt đèn đỏ / đèn vàng',
      description: 'Điều khiển phương tiện vượt qua hiệu lệnh đèn tín hiệu giao thông (đèn đỏ hoặc đèn vàng)',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00,
    },
    {
      violation_type: 'WRONG_LANE',
      title: 'Đi sai làn đường',
      description: 'Điều khiển phương tiện không đúng phần đường, làn đường quy định',
      min_amount: 800000.00,
      max_amount: 1200000.00,
      default_amount: 1000000.00,
    },
    {
      violation_type: 'SPEEDING',
      title: 'Chạy quá tốc độ',
      description: 'Điều khiển phương tiện chạy quá tốc độ quy định',
      min_amount: 2000000.00,
      max_amount: 4000000.00,
      default_amount: 3000000.00,
    },
    {
      violation_type: 'ILLEGAL_PARKING',
      title: 'Đỗ xe trái quy định',
      description: 'Dừng, đỗ xe không đúng nơi quy định',
      min_amount: 400000.00,
      max_amount: 1000000.00,
      default_amount: 800000.00,
    },
    {
      violation_type: 'HELMET_LESS',
      title: 'Không đội mũ bảo hiểm',
      description: 'Người điều khiển, người ngồi trên xe mô tô không đội mũ bảo hiểm',
      min_amount: 200000.00,
      max_amount: 400000.00,
      default_amount: 300000.00,
    },
    {
      violation_type: 'WRONG_WAY',
      title: 'Đi ngược chiều',
      description: 'Điều khiển phương tiện đi ngược chiều của đường một chiều',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00,
    },
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
      date_of_birth: '1990-01-01',
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
      date_of_birth: '1985-05-15',
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
      date_of_birth: '1995-10-20',
      address: '123 Nguyễn Văn Linh',
      ward: 'Nam Dương',
      city: 'Quận Hải Châu',
      province: 'Đà Nẵng',
      role: 'CITIZEN',
      status: 'ACTIVE',
      must_change_password: true,
      password_changed: false
    },
    {
      id: 'usr-mai-002',
      full_name: 'Lê Thị Mai',
      national_id: '001095777666',
      email: 'lemai@gmail.com',
      phone: '0977666555',
      password_hash: defaultPasswordHash,
      gender: 'FEMALE',
      date_of_birth: '1998-12-05',
      address: '456 Điện Biên Phủ',
      ward: 'Phường 25',
      city: 'Quận Bình Thạnh',
      province: 'TP. Hồ Chí Minh',
      role: 'CITIZEN',
      status: 'ACTIVE',
      must_change_password: true,
      password_changed: false
    },
    {
      id: 'usr-hung-003',
      full_name: 'Phạm Hùng',
      national_id: '001095333222',
      email: 'hungpham@gmail.com',
      phone: '0933222111',
      password_hash: defaultPasswordHash,
      gender: 'MALE',
      date_of_birth: '1992-03-22',
      address: '789 Láng Hạ',
      ward: 'Láng Hạ',
      city: 'Quận Đống Đa',
      province: 'Hà Nội',
      role: 'CITIZEN',
      status: 'ACTIVE',
      must_change_password: true,
      password_changed: false
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
    },
    {
      id: 'cam-officer-manual',
      camera_code: 'OFFICER_MANUAL',
      location_name: 'Ghi nhận trực tiếp bởi cán bộ',
      road_segment: 'Hiện trường',
      status: 'ONLINE'
    }
  ]);

  // 5. Chèn Phương tiện (vehicles)
  const vehiclesData = [
    { id: 'veh-dan-01', license_plate: '30F-123.45', owner_id: 'usr-dan-001', vehicle_type: 'CAR', brand: 'Toyota', model: 'Camry', color: 'Đen', registered_at: '2023-01-15' },
    { id: 'veh-dan-02', license_plate: '29A-888.99', owner_id: 'usr-dan-001', vehicle_type: 'MOTORBIKE', brand: 'Honda', model: 'SH 150i', color: 'Trắng', registered_at: '2023-05-20' },
    { id: 'veh-mai-01', license_plate: '51G-777.88', owner_id: 'usr-mai-002', vehicle_type: 'CAR', brand: 'Mazda', model: 'CX-5', color: 'Trắng', registered_at: '2023-11-11' },
    { id: 'veh-hung-01', license_plate: '43A-333.44', owner_id: 'usr-hung-003', vehicle_type: 'CAR', brand: 'Kia', model: 'K3', color: 'Xám', registered_at: '2023-09-09' }
  ].map(v => ({ ...v, plate_color: 'WHITE' }));

  await knex('vehicles').insert(vehiclesData);

  // 6. Chèn Vi phạm (violations) & Hóa đơn (invoices)
  const violations = [];
  const invoices = [];

  const createViolationAndInvoice = (id, vehId, plate, camId, dateStr, dueDateStr, status, invStatus = null, amount = 5000000) => {
    violations.push({
      id: id,
      camera_id: camId,
      vehicle_id: vehId,
      detected_plate_text: plate,
      corrected_plate_text: plate,
      ocr_confidence: 0.95,
      violation_type: 'RED_LIGHT', // Tham chiếu đến bảng fines
      evidence_image_url: `https://picsum.photos/seed/${id}/400/300`,
      detected_at: dateStr,
      due_date: dueDateStr,
      status: status,
      source: 'AI',
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

  // --- VI PHẠM CHO CÁC XE ---
  // AI_PENDING - chờ xác minh
  createViolationAndInvoice('vio-pending-01', 'veh-dan-01', '30F-123.45', 'cam-001', '2026-10-20 08:30:00', '2026-11-04 08:30:00', 'AI_PENDING');
  createViolationAndInvoice('vio-pending-02', 'veh-mai-01', '51G-777.88', 'cam-002', '2026-10-20 09:15:00', '2026-11-04 09:15:00', 'AI_PENDING');
  createViolationAndInvoice('vio-pending-03', 'veh-hung-01', '43A-333.44', 'cam-001', '2026-10-20 10:00:00', '2026-11-04 10:00:00', 'AI_PENDING');
  createViolationAndInvoice('vio-pending-04', 'veh-dan-02', '29A-888.99', 'cam-002', '2026-10-20 14:30:00', '2026-11-04 14:30:00', 'AI_PENDING');
  
  // OFFICER_VERIFIED - đã xác minh chưa phát hóa đơn
  createViolationAndInvoice('vio-verified-01', 'veh-dan-01', '30F-123.45', 'cam-001', '2026-10-18 08:00:00', '2026-11-02 08:00:00', 'OFFICER_VERIFIED');
  createViolationAndInvoice('vio-verified-02', 'veh-mai-01', '51G-777.88', 'cam-002', '2026-10-18 11:30:00', '2026-11-02 11:30:00', 'OFFICER_VERIFIED');
  
  // REJECTED - bị từ chối
  violations.push({
    id: 'vio-rejected-01',
    camera_id: 'cam-001',
    vehicle_id: null,
    detected_plate_text: 'UNCLEAR',
    corrected_plate_text: null,
    ocr_confidence: 0.45,
    violation_type: 'RED_LIGHT',
    evidence_image_url: 'https://picsum.photos/seed/vio-rejected-01/400/300',
    detected_at: '2026-10-19 15:00:00',
    due_date: null,
    status: 'REJECTED',
    source: 'AI',
    rejection_reason: 'Ảnh mờ, không nhận diện được biển số rõ ràng',
    verified_by: 'usr-officer-001',
    verified_at: '2026-10-19 16:00:00'
  });
  
  // INVOICED - đã phát hành hóa đơn
  createViolationAndInvoice('vio-dan-1a', 'veh-dan-01', '30F-123.45', 'cam-001', '2026-09-01 08:30:00', '2026-09-15 08:30:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-dan-1b', 'veh-dan-01', '30F-123.45', 'cam-002', '2026-09-10 14:20:00', '2026-09-25 14:20:00', 'INVOICED', 'UNPAID', 5000000);
  createViolationAndInvoice('vio-dan-2a', 'veh-dan-02', '29A-888.99', 'cam-002', '2026-08-20 09:10:00', '2026-09-05 09:10:00', 'INVOICED', 'PAID', 5000000);
  createViolationAndInvoice('vio-mai-1a', 'veh-mai-01', '51G-777.88', 'cam-001', '2026-09-02 08:00:00', '2026-09-17 08:00:00', 'INVOICED', 'OVERDUE', 5000000);
  createViolationAndInvoice('vio-hung-1a', 'veh-hung-01', '43A-333.44', 'cam-001', '2026-09-06 14:00:00', '2026-09-21 14:00:00', 'INVOICED', 'UNPAID', 5000000);

  violations.push({
    id: 'vio-officer-01',
    camera_id: 'cam-officer-manual',
    vehicle_id: 'veh-dan-01',
    detected_plate_text: '30F-123.45',
    corrected_plate_text: '30F-123.45',
    ocr_confidence: 1,
    violation_type: 'WRONG_LANE',
    evidence_image_url: 'https://picsum.photos/seed/vio-officer-01/400/300',
    detected_at: '2026-10-21 07:45:00',
    due_date: '2026-11-05 07:45:00',
    status: 'OFFICER_VERIFIED',
    source: 'OFFICER',
    verified_by: 'usr-officer-001',
    verified_at: '2026-10-21 07:45:00',
  });

  await knex('violations').insert(violations);
  await knex('invoices').insert(invoices);

  console.log('✅ Đã nạp thành công bộ dữ liệu thử!');
};