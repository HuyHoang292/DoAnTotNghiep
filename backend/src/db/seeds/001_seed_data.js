exports.seed = async function(knex) {
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

  // 2. Chèn Khung mức phạt (fines)
  await knex('fines').insert([
    {
      violation_type: 'RED_LIGHT',
      title: 'Vượt đèn đỏ',
      description: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00
    },
    {
      violation_type: 'WRONG_LANE',
      title: 'Đi sai làn đường',
      description: 'Đi không đúng phần đường hoặc làn đường quy định',
      min_amount: 3000000.00,
      max_amount: 5000000.00,
      default_amount: 4000000.00
    },
    {
      violation_type: 'SPEEDING',
      title: 'Chạy quá tốc độ',
      description: 'Điều khiển xe chạy quá tốc độ quy định từ 10km/h đến 20km/h',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00
    },
    {
      violation_type: 'ILLEGAL_PARKING',
      title: 'Đỗ xe trái quy định',
      description: 'Đỗ xe tại nơi có biển Cấm dừng xe và đỗ xe',
      min_amount: 800000.00,
      max_amount: 1000000.00,
      default_amount: 900000.00
    }
  ]);

  // 3. Chèn Người dùng (users)
  await knex('users').insert([
    {
      id: 'usr-admin-001',
      full_name: 'Nguyễn Văn Công An',
      national_id: '001090123456',
      email: 'officer@traffic.gov.vn',
      phone: '0901111222',
      password_hash: '$2a$10$hashedpasswordhere', //123456
      role: 'OFFICER',
      status: 'ACTIVE',
      badge_number: 'CA-12345'
    },
    {
      id: 'usr-citizen-001',
      full_name: 'Trần Văn Dân',
      national_id: '001095999888',
      email: 'citizen@gmail.com',
      phone: '0988888999',
      password_hash: '$2a$10$hashedpasswordhere', //123456
      role: 'CITIZEN',
      status: 'ACTIVE',
      badge_number: null
    }
  ]);

  // 4. Chèn Phương tiện (vehicles)
  await knex('vehicles').insert([
    {
      id: 'veh-001',
      license_plate: '30F-123.45',
      owner_id: 'usr-citizen-001',
      vehicle_type: 'CAR',
      plate_color: 'WHITE',
      brand: 'Toyota',
      model: 'Camry',
      color: 'Đen',
      registered_at: '2023-01-15'
    }
  ]);

  // 5. Chèn Camera (cameras)
  await knex('cameras').insert([
    {
      id: 'cam-001',
      camera_code: 'CAM_NGUYENTHAIHOC_01',
      location_name: 'Ngã tư Nguyễn Thái Học - Lê Duẩn',
      latitude: 21.028511,
      longitude: 105.842341,
      road_segment: 'Quận Ba Đình',
      status: 'ONLINE'
    }
  ]);

  // 6. Chèn Vi phạm AI chờ duyệt (violations)
  await knex('violations').insert([
    {
      id: 'vio-001',
      camera_id: 'cam-001',
      vehicle_id: 'veh-001',
      detected_plate_text: '30F-123.45',
      ocr_confidence: 0.95,
      violation_type: 'RED_LIGHT',
      evidence_image_url: 'https://storage.googleapis.com/traffic-evidence/img001.jpg',
      detected_at: new Date(),
      status: 'AI_PENDING'
    }
  ]);
};