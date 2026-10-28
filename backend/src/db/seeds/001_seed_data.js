/**
 * Dữ liệu mẫu cho môi trường dev / demo.
 * ⚠️ Chạy seed sẽ XOÁ toàn bộ dữ liệu hiện có trong các bảng bên dưới.
 *
 * Mật khẩu mặc định của mọi tài khoản: 123456
 */

const bcrypt = require('bcryptjs');

// ════════════════════════════════════════════════════════════════════════════
// ẢNH (dán URL Cloudinary vào giữa dấu '')
// ════════════════════════════════════════════════════════════════════════════

// Ảnh biển số của phương tiện
const VEHICLE_IMAGES = {
  'veh-dan-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
  'veh-dan-02': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174568/doantotnghiep/violations/cqjxeprgo5gsqv5ukslr.jpg', // 51F-069.48
  'veh-mai-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174758/doantotnghiep/vehicles/go3sbsvujobtkokiktdm.jpg', // 51A-602.16
  'veh-hung-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174771/doantotnghiep/vehicles/y2d2cnolhdoctmncjomy.jpg', // 51A-720.78
};

// Ảnh bằng chứng của vi phạm
const VIOLATION_IMAGES = {
  'vio-pending-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
  'vio-pending-02': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174758/doantotnghiep/vehicles/go3sbsvujobtkokiktdm.jpg', // 51A-602.16
  'vio-pending-03': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174771/doantotnghiep/vehicles/y2d2cnolhdoctmncjomy.jpg', // 51A-720.78
  'vio-pending-04': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174568/doantotnghiep/violations/cqjxeprgo5gsqv5ukslr.jpg', // 51F-069.48
  'vio-verified-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
  'vio-verified-02': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174758/doantotnghiep/vehicles/go3sbsvujobtkokiktdm.jpg', // 51A-602.16
  'vio-rejected-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793175871/biensovn_2279_jpg.rf.fe3db0e739e55850c6a1beb76da38fdf.jpg', // ảnh mờ, không đọc được biển
  'vio-dan-1a': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
  'vio-dan-1b': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
  'vio-dan-2a': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174568/doantotnghiep/violations/cqjxeprgo5gsqv5ukslr.jpg', // 51F-069.48
  'vio-mai-1a': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174758/doantotnghiep/vehicles/go3sbsvujobtkokiktdm.jpg', // 51A-602.16
  'vio-hung-1a': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174771/doantotnghiep/vehicles/y2d2cnolhdoctmncjomy.jpg', // 51A-720.78
  'vio-officer-01': 'https://res.cloudinary.com/swmrzf85/image/upload/v1793174359/doantotnghiep/vehicles/xgcxpjrwjqddf3qzc8l6.jpg', // 51A-853.25
};

// Video mẫu của camera (Cloudinary …/video/upload/…), để trống nếu chưa có
const CAMERA_VIDEOS = {
  'cam-001': 'https://res.cloudinary.com/swmrzf85/video/upload/v1793185017/2026-10-28_17-54-28.mp4',
  'cam-002': 'https://res.cloudinary.com/swmrzf85/video/upload/q_auto,w_854,fps_30/v1793185017/2026-10-28_17-54-28.mp4',
};

// ════════════════════════════════════════════════════════════════════════════
// DỮ LIỆU
// ════════════════════════════════════════════════════════════════════════════

const OFFICER_ID = 'usr-officer-001';

const FINES = [
  {
    violation_type: 'RED_LIGHT',
    title: 'Vượt đèn đỏ / đèn vàng',
    description: 'Điều khiển phương tiện vượt qua hiệu lệnh đèn tín hiệu giao thông (đèn đỏ hoặc đèn vàng)',
    min_amount: 4000000,
    max_amount: 6000000,
    default_amount: 5000000,
  },
  {
    violation_type: 'WRONG_LANE',
    title: 'Đi sai làn đường',
    description: 'Điều khiển phương tiện không đúng phần đường, làn đường quy định',
    min_amount: 800000,
    max_amount: 1200000,
    default_amount: 1000000,
  },
  {
    violation_type: 'SPEEDING',
    title: 'Chạy quá tốc độ',
    description: 'Điều khiển phương tiện chạy quá tốc độ quy định',
    min_amount: 2000000,
    max_amount: 4000000,
    default_amount: 3000000,
  },
  {
    violation_type: 'ILLEGAL_PARKING',
    title: 'Đỗ xe trái quy định',
    description: 'Dừng, đỗ xe không đúng nơi quy định',
    min_amount: 400000,
    max_amount: 1000000,
    default_amount: 800000,
  },
  {
    violation_type: 'HELMET_LESS',
    title: 'Không đội mũ bảo hiểm',
    description: 'Người điều khiển, người ngồi trên xe mô tô không đội mũ bảo hiểm',
    min_amount: 200000,
    max_amount: 400000,
    default_amount: 300000,
  },
  {
    violation_type: 'WRONG_WAY',
    title: 'Đi ngược chiều',
    description: 'Điều khiển phương tiện đi ngược chiều của đường một chiều',
    min_amount: 4000000,
    max_amount: 6000000,
    default_amount: 5000000,
  },
];

// 1 Admin, 1 Officer, 3 Citizens
const STAFF = [
  {
    id: 'usr-admin-001',
    full_name: 'Trần Quản Trị',
    national_id: '001090000001',
    email: 'admin@traffic.gov.vn',
    phone: '0901000001',
    gender: 'MALE',
    date_of_birth: '1990-01-01',
    address: 'Số 1 Lê Duẩn',
    ward: 'Bến Nghé',
    city: 'Quận 1',
    province: 'TP. Hồ Chí Minh',
    role: 'ADMIN',
    badge_number: 'ADM-01',
  },
  {
    id: OFFICER_ID,
    full_name: 'Nguyễn Văn Cảnh Sát',
    national_id: '001090123456',
    email: 'officer@traffic.gov.vn',
    phone: '0901111222',
    gender: 'MALE',
    date_of_birth: '1985-05-15',
    address: 'Số 25 Trần Hưng Đạo',
    ward: 'Cửa Nam',
    city: 'Quận Hoàn Kiếm',
    province: 'Hà Nội',
    role: 'OFFICER',
    badge_number: 'CA-12345',
  },
];

const CITIZENS = [
  {
    id: 'usr-dan-001',
    full_name: 'Trần Văn Dần',
    national_id: '001095999888',
    email: 'citizen@gmail.com',
    phone: '0988888999',
    gender: 'MALE',
    date_of_birth: '1995-10-20',
    address: '123 Nguyễn Văn Linh',
    ward: 'Nam Dương',
    city: 'Quận Hải Châu',
    province: 'Đà Nẵng',
  },
  {
    id: 'usr-mai-002',
    full_name: 'Lê Thị Mai',
    national_id: '001095777666',
    email: 'lemai@gmail.com',
    phone: '0977666555',
    gender: 'FEMALE',
    date_of_birth: '1998-12-05',
    address: '456 Điện Biên Phủ',
    ward: 'Phường 25',
    city: 'Quận Bình Thạnh',
    province: 'TP. Hồ Chí Minh',
  },
  {
    id: 'usr-hung-003',
    full_name: 'Phạm Hùng',
    national_id: '001095333222',
    email: 'hungpham@gmail.com',
    phone: '0933222111',
    gender: 'MALE',
    date_of_birth: '1992-03-22',
    address: '789 Láng Hạ',
    ward: 'Láng Hạ',
    city: 'Quận Đống Đa',
    province: 'Hà Nội',
  },
];

const CAMERAS = [
  {
    id: 'cam-001',
    camera_code: 'CAM_HANGXANH_01',
    location_name: 'Ngã tư Hàng Xanh - Điện Biên Phủ',
    latitude: 10.801823,
    longitude: 106.711412,
    road_segment: 'Quận Bình Thạnh, TP.HCM',
    status: 'ONLINE',
  },
  {
    id: 'cam-002',
    camera_code: 'CAM_NGUYENTHAIHOC_01',
    location_name: 'Ngã tư Nguyễn Thái Học - Lê Duẩn',
    latitude: 21.028511,
    longitude: 105.842341,
    road_segment: 'Quận Ba Đình, Hà Nội',
    status: 'ONLINE',
  },
  {
    id: 'cam-officer-manual',
    camera_code: 'OFFICER_MANUAL',
    location_name: 'Ghi nhận trực tiếp bởi cán bộ',
    road_segment: 'Hiện trường',
    status: 'ONLINE',
  },
];

const VEHICLES = [
  { id: 'veh-dan-01', license_plate: '51A-853.25', owner_id: 'usr-dan-001', vehicle_type: 'CAR', brand: 'Toyota', model: 'Camry', color: 'Đen', registered_at: '2023-01-15' },
  { id: 'veh-dan-02', license_plate: '51F-069.48', owner_id: 'usr-dan-001', vehicle_type: 'MOTORBIKE', brand: 'Honda', model: 'SH 150i', color: 'Trắng', registered_at: '2023-05-20' },
  { id: 'veh-mai-01', license_plate: '51A-602.16', owner_id: 'usr-mai-002', vehicle_type: 'CAR', brand: 'Mazda', model: 'CX-5', color: 'Trắng', registered_at: '2023-11-11' },
  { id: 'veh-hung-01', license_plate: '51A-720.78', owner_id: 'usr-hung-003', vehicle_type: 'CAR', brand: 'Kia', model: 'K3', color: 'Xám', registered_at: '2023-09-09' },
];

/**
 * Vi phạm. Các trường không ghi sẽ lấy mặc định:
 *   type = RED_LIGHT, source = AI, biển số lấy theo xe.
 * invoice: trạng thái hóa đơn (chỉ dùng khi status = INVOICED).
 */
const VIOLATIONS = [
  // AI_PENDING - chờ cán bộ xác minh
  { id: 'vio-pending-01', vehicle: 'veh-dan-01', camera: 'cam-001', at: '2026-10-20 08:30:00', due: '2026-11-04 08:30:00', status: 'AI_PENDING' },
  { id: 'vio-pending-02', vehicle: 'veh-mai-01', camera: 'cam-002', at: '2026-10-20 09:15:00', due: '2026-11-04 09:15:00', status: 'AI_PENDING' },
  { id: 'vio-pending-03', vehicle: 'veh-hung-01', camera: 'cam-001', at: '2026-10-20 10:00:00', due: '2026-11-04 10:00:00', status: 'AI_PENDING' },
  { id: 'vio-pending-04', vehicle: 'veh-dan-02', camera: 'cam-002', at: '2026-10-20 14:30:00', due: '2026-11-04 14:30:00', status: 'AI_PENDING' },

  // OFFICER_VERIFIED - đã xác minh, chưa phát hóa đơn
  { id: 'vio-verified-01', vehicle: 'veh-dan-01', camera: 'cam-001', at: '2026-10-18 08:00:00', due: '2026-11-02 08:00:00', status: 'OFFICER_VERIFIED' },
  { id: 'vio-verified-02', vehicle: 'veh-mai-01', camera: 'cam-002', at: '2026-10-18 11:30:00', due: '2026-11-02 11:30:00', status: 'OFFICER_VERIFIED' },

  // REJECTED - ảnh không đọc được biển số
  {
    id: 'vio-rejected-01', vehicle: null, camera: 'cam-001', at: '2026-10-19 15:00:00', due: null, status: 'REJECTED',
    plate: 'UNCLEAR', confidence: 0.45, verifiedAt: '2026-10-19 16:00:00',
    rejection_reason: 'Ảnh mờ, không nhận diện được biển số rõ ràng',
  },

  // INVOICED - đã phát hành hóa đơn
  { id: 'vio-dan-1a', vehicle: 'veh-dan-01', camera: 'cam-001', at: '2026-09-01 08:30:00', due: '2026-09-15 08:30:00', status: 'INVOICED', invoice: 'OVERDUE' },
  { id: 'vio-dan-1b', vehicle: 'veh-dan-01', camera: 'cam-002', at: '2026-09-10 14:20:00', due: '2026-09-25 14:20:00', status: 'INVOICED', invoice: 'UNPAID' },
  { id: 'vio-dan-2a', vehicle: 'veh-dan-02', camera: 'cam-002', at: '2026-08-20 09:10:00', due: '2026-09-05 09:10:00', status: 'INVOICED', invoice: 'PAID' },
  { id: 'vio-mai-1a', vehicle: 'veh-mai-01', camera: 'cam-001', at: '2026-09-02 08:00:00', due: '2026-09-17 08:00:00', status: 'INVOICED', invoice: 'OVERDUE' },
  { id: 'vio-hung-1a', vehicle: 'veh-hung-01', camera: 'cam-001', at: '2026-09-06 14:00:00', due: '2026-09-21 14:00:00', status: 'INVOICED', invoice: 'UNPAID' },

  // Cán bộ ghi nhận trực tiếp
  {
    id: 'vio-officer-01', vehicle: 'veh-dan-01', camera: 'cam-officer-manual', at: '2026-10-21 07:45:00', due: '2026-11-05 07:45:00',
    status: 'OFFICER_VERIFIED', type: 'WRONG_LANE', source: 'OFFICER', confidence: 1,
  },
];

const INVOICE_PAID_AT = '2026-09-10 10:00:00';

// ════════════════════════════════════════════════════════════════════════════
// CHUYỂN DỮ LIỆU SANG DÒNG DATABASE
// ════════════════════════════════════════════════════════════════════════════

function buildViolationRows() {
  const plateOf = Object.fromEntries(VEHICLES.map((v) => [v.id, v.license_plate]));
  const fineOf = Object.fromEntries(FINES.map((f) => [f.violation_type, f.default_amount]));

  const violations = VIOLATIONS.map((v) => {
    const plate = v.plate ?? plateOf[v.vehicle];
    const reviewed = v.status !== 'AI_PENDING';
    return {
      id: v.id,
      camera_id: v.camera,
      vehicle_id: v.vehicle,
      detected_plate_text: plate,
      corrected_plate_text: v.status === 'REJECTED' ? null : plate,
      ocr_confidence: v.confidence ?? 0.95,
      violation_type: v.type ?? 'RED_LIGHT',
      evidence_image_url: VIOLATION_IMAGES[v.id] || `https://picsum.photos/seed/${v.id}/400/300`,
      detected_at: v.at,
      due_date: v.due,
      status: v.status,
      source: v.source ?? 'AI',
      rejection_reason: v.rejection_reason ?? null,
      verified_by: reviewed ? OFFICER_ID : null,
      verified_at: reviewed ? v.verifiedAt ?? v.at : null,
    };
  });

  const invoices = VIOLATIONS.filter((v) => v.status === 'INVOICED' && v.invoice).map((v) => ({
    id: `inv-${v.id}`,
    violation_id: v.id,
    invoice_code: `INV-${v.id.toUpperCase()}`,
    amount: fineOf[v.type ?? 'RED_LIGHT'],
    issue_date: v.at.split(' ')[0],
    due_date: v.due.split(' ')[0],
    status: v.invoice,
    paid_at: v.invoice === 'PAID' ? INVOICE_PAID_AT : null,
  }));

  return { violations, invoices };
}

// ════════════════════════════════════════════════════════════════════════════
// SEED
// ════════════════════════════════════════════════════════════════════════════

exports.seed = async function (knex) {
  // 1. Dọn dữ liệu cũ (tắt khóa ngoại để truncate được)
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of [
    'audit_logs',
    'notifications',
    'invoices',
    'camera_events',
    'violations',
    'cameras',
    'fines',
    'vehicle_verification_history',
    'vehicles',
    'users',
  ]) {
    await knex(table).truncate();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // 2. Danh mục
  await knex('fines').insert(FINES);
  await knex('cameras').insert(CAMERAS.map((c) => ({ ...c, video_url: CAMERA_VIDEOS[c.id] || null })));

  // 3. Người dùng
  const password_hash = await bcrypt.hash('123456', 10);
  await knex('users').insert([
    ...STAFF.map((u) => ({ ...u, password_hash, status: 'ACTIVE' })),
    ...CITIZENS.map((u) => ({
      ...u,
      password_hash,
      role: 'CITIZEN',
      status: 'ACTIVE',
      must_change_password: true,
      password_changed: false,
    })),
  ]);

  // 4. Phương tiện
  await knex('vehicles').insert(
    VEHICLES.map((v) => ({
      ...v,
      plate_color: 'WHITE',
      plate_image_url: VEHICLE_IMAGES[v.id] || null,
    })),
  );

  // 5. Vi phạm & hóa đơn
  const { violations, invoices } = buildViolationRows();
  await knex('violations').insert(violations);
  await knex('invoices').insert(invoices);

  console.log('✅ Đã nạp thành công bộ dữ liệu thử!');
};