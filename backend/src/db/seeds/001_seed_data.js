const crypto = require('crypto');

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

  // 2. Chèn Khung mức phạt (fines) - Đầy đủ 6 loại vi phạm Enum
  await knex('fines').insert([
    {
      violation_type: 'RED_LIGHT',
      title: 'Vượt đèn đỏ / đèn vàng',
      description: 'Không chấp hành hiệu lệnh của đèn tín hiệu giao thông',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00
    },
    {
      violation_type: 'WRONG_LANE',
      title: 'Đi sai làn đường',
      description: 'Điều khiển phương tiện đi không đúng phần đường hoặc làn đường quy định',
      min_amount: 3000000.00,
      max_amount: 5000000.00,
      default_amount: 4000000.00
    },
    {
      violation_type: 'SPEEDING',
      title: 'Chạy quá tốc độ quy định',
      description: 'Điều khiển xe chạy quá tốc độ quy định từ 10km/h đến 20km/h',
      min_amount: 4000000.00,
      max_amount: 6000000.00,
      default_amount: 5000000.00
    },
    {
      violation_type: 'ILLEGAL_PARKING',
      title: 'Đỗ xe trái quy định',
      description: 'Đỗ xe tại nơi có biển Cấm dừng xe và đỗ xe hoặc trên vỉa hè',
      min_amount: 800000.00,
      max_amount: 1000000.00,
      default_amount: 900000.00
    },
    {
      violation_type: 'HELMET_LESS',
      title: 'Không đội mũ bảo hiểm',
      description: 'Người điều khiển hoặc người ngồi trên xe máy không đội mũ bảo hiểm',
      min_amount: 400000.00,
      max_amount: 600000.00,
      default_amount: 500000.00
    },
    {
      violation_type: 'WRONG_WAY',
      title: 'Đi ngược chiều',
      description: 'Đi ngược chiều của đường một chiều hoặc đường có biển Cấm đi ngược chiều',
      min_amount: 3000000.00,
      max_amount: 5000000.00,
      default_amount: 4000000.00
    }
  ]);

  // 3. Chèn Người dùng (users)
  // Password hash dưới đây là bcrypt của chuỗi '123456' (tạo bằng bcryptjs)
  const defaultPasswordHash = '$2b$10$Tr1o9eEdiSsZ9CMwZktB6.SDMF2NFX0/RvNU/OpBzW/qX/s0T84k.';

  await knex('users').insert([
    {
      id: 'usr-admin-001',
      full_name: 'Trần Quản Trị',
      national_id: '001090000001',
      email: 'admin@traffic.gov.vn',
      phone: '0901000001',
      password_hash: defaultPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      badge_number: 'ADM-01'
    },
    {
      id: 'usr-officer-001',
      full_name: 'Nguyễn Văn Công An',
      national_id: '001090123456',
      email: 'officer@traffic.gov.vn',
      phone: '0901111222',
      password_hash: defaultPasswordHash,
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
      password_hash: defaultPasswordHash,
      role: 'CITIZEN',
      status: 'ACTIVE',
      badge_number: null
    },
    {
      id: 'usr-citizen-002',
      full_name: 'Lê Thị Mai',
      national_id: '001095777666',
      email: 'lemai@gmail.com',
      phone: '0977666555',
      password_hash: defaultPasswordHash,
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
      chassis_number: 'CHS-TYT-99812',
      engine_number: 'ENG-TYT-11029',
      registered_at: '2023-01-15'
    },
    {
      id: 'veh-002',
      license_plate: '29A-888.99',
      owner_id: 'usr-citizen-001',
      vehicle_type: 'MOTORBIKE',
      plate_color: 'WHITE',
      brand: 'Honda',
      model: 'SH 150i',
      color: 'Trắng',
      chassis_number: 'CHS-HND-77123',
      engine_number: 'ENG-HND-33412',
      registered_at: '2024-03-20'
    },
    {
      id: 'veh-003',
      license_plate: '30H-999.99',
      owner_id: 'usr-citizen-002',
      vehicle_type: 'CAR',
      plate_color: 'WHITE',
      brand: 'Mercedes-Benz',
      model: 'E300',
      color: 'Đỏ',
      chassis_number: 'CHS-MER-00192',
      engine_number: 'ENG-MER-88123',
      registered_at: '2025-05-10'
    }
  ]);

  // 5. Chèn Camera (cameras)
  await knex('cameras').insert([
    {
      id: 'cam-001',
      camera_code: 'CAM_HANGXANH_01',
      location_name: 'Ngã tư Hàng Xanh - Đường Điện Biên Phủ',
      latitude: 10.801823,
      longitude: 106.711412,
      road_segment: 'Quận Bình Thạnh, TP.HCM',
      rtsp_stream_url: 'rtsp://admin:pass@192.168.1.100:554/stream1',
      status: 'ONLINE'
    },
    {
      id: 'cam-002',
      camera_code: 'CAM_NGUYENTHAIHOC_01',
      location_name: 'Ngã tư Nguyễn Thái Học - Lê Duẩn',
      latitude: 21.028511,
      longitude: 105.842341,
      road_segment: 'Quận Ba Đình, Hà Nội',
      rtsp_stream_url: 'rtsp://admin:pass@192.168.1.101:554/stream1',
      status: 'ONLINE'
    }
  ]);

  // 6. Chèn Vi phạm (violations)
  await knex('violations').insert([
    {
      id: 'vio-001',
      camera_id: 'cam-001',
      vehicle_id: 'veh-001',
      detected_plate_text: '30F-123.45',
      corrected_plate_text: null,
      ocr_confidence: 0.96,
      violation_type: 'RED_LIGHT',
      evidence_image_url: 'https://storage.googleapis.com/traffic-evidence/img_redlight_001.jpg',
      evidence_video_url: 'https://storage.googleapis.com/traffic-evidence/vid_redlight_001.mp4',
      detected_at: '2026-09-10 08:30:00',
      status: 'AI_PENDING',
      rejection_reason: null,
      verified_by: null,
      verified_at: null,
      due_date: null
    },
    {
      id: 'vio-002',
      camera_id: 'cam-002',
      vehicle_id: 'veh-002',
      detected_plate_text: '29A-888.99',
      corrected_plate_text: '29A-888.99',
      ocr_confidence: 0.91,
      violation_type: 'WRONG_LANE',
      evidence_image_url: 'https://storage.googleapis.com/traffic-evidence/img_lane_002.jpg',
      evidence_video_url: null,
      detected_at: '2026-09-08 14:15:00',
      status: 'OFFICER_VERIFIED',
      rejection_reason: null,
      verified_by: 'usr-officer-001',
      verified_at: '2026-09-08 15:00:00',
      due_date: '2026-09-23 15:00:00'
    },
    {
      id: 'vio-003',
      camera_id: 'cam-001',
      vehicle_id: 'veh-003',
      detected_plate_text: '30H-999.99',
      corrected_plate_text: '30H-999.99',
      ocr_confidence: 0.98,
      violation_type: 'SPEEDING',
      evidence_image_url: 'https://storage.googleapis.com/traffic-evidence/img_speed_003.jpg',
      evidence_video_url: null,
      detected_at: '2026-09-01 10:00:00',
      status: 'INVOICED',
      rejection_reason: null,
      verified_by: 'usr-officer-001',
      verified_at: '2026-09-01 11:30:00',
      due_date: '2026-09-15 23:59:59'
    }
  ]);

  // 7. Chèn Sự kiện AI Real-time (camera_events)
  await knex('camera_events').insert([
    {
      id: 'evt-001',
      camera_id: 'cam-001',
      video_timestamp: 124.5,
      detected_plate_text: '30F-123.45',
      ocr_confidence: 0.96,
      bounding_box: JSON.stringify({ x: 210, y: 450, width: 120, height: 45 }),
      is_violation: true,
      violation_type: 'RED_LIGHT',
      snapshot_url: 'https://storage.googleapis.com/traffic-evidence/evt_001.jpg',
      promoted_violation_id: 'vio-001'
    },
    {
      id: 'evt-002',
      camera_id: 'cam-001',
      video_timestamp: 130.0,
      detected_plate_text: '51G-555.55',
      ocr_confidence: 0.89,
      bounding_box: JSON.stringify({ x: 300, y: 500, width: 110, height: 40 }),
      is_violation: false,
      violation_type: null,
      snapshot_url: 'https://storage.googleapis.com/traffic-evidence/evt_002.jpg',
      promoted_violation_id: null
    }
  ]);

  // 8. Chèn Hóa đơn phạt nguội (invoices)
  await knex('invoices').insert([
    {
      id: 'inv-001',
      violation_id: 'vio-003',
      invoice_code: 'INV-20260901-001',
      amount: 5000000.00,
      issue_date: '2026-09-01',
      due_date: '2026-09-15',
      status: 'UNPAID',
      payment_method: null,
      transaction_id: null,
      paid_at: null
    }
  ]);

  // 9. Chèn Thông báo (notifications)
  await knex('notifications').insert([
    {
      id: 'ntf-001',
      user_id: 'usr-citizen-002',
      invoice_id: 'inv-001',
      channel: 'EMAIL',
      title: 'Thông báo phạt nguội vi phạm giao thông',
      message: 'Phương tiện BKS 30H-999.99 đã vi phạm Chạy quá tốc độ. Số tiền phạt: 5.000.000 VNĐ. Hạn thanh toán: 15/09/2026.',
      status: 'SENT',
      sent_at: '2026-09-01 12:00:00',
      error_log: null
    }
  ]);

  // 10. Chèn Nhật ký hệ thống (audit_logs)
  await knex('audit_logs').insert([
    {
      user_id: 'usr-officer-001',
      action: 'VERIFY_VIOLATION',
      target_table: 'violations',
      target_id: 'vio-003',
      old_data: JSON.stringify({ status: 'AI_PENDING' }),
      new_data: JSON.stringify({ status: 'OFFICER_VERIFIED', verified_by: 'usr-officer-001' }),
      ip_address: '14.241.120.45'
    }
  ]);
};