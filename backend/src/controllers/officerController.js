const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../db/knex');
const { mapVehicle, mapOwner, mapCamera, mapViolation, mapInvoice } = require('../utils/mappers');
const { normalizePlate, recognizePlateFromImage } = require('../services/plateRecognition');

// Cấu hình dịch vụ gửi email tự động
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'email_cua_ban@gmail.com', // Thay bằng email hệ thống của bạn hoặc cấu hình trong file .env
    pass: process.env.EMAIL_PASS || 'mat_khau_ung_dung',      // Mật khẩu ứng dụng (App Password) của email
  },
});

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

async function lookupByPlate(plateInput) {
  const key = normalizePlate(plateInput);
  if (!key) return null;

  const vehicles = await db('vehicles as veh')
    .leftJoin('users as u', 'u.id', 'veh.owner_id')
    .select('veh.*', 'u.full_name', 'u.national_id', 'u.email', 'u.phone', 'u.role', 'u.status', 'u.id as owner_row_id');

  const vehicleRow = vehicles.find((row) => normalizePlate(row.license_plate) === key) || null;
  const vehicle = vehicleRow ? mapVehicle(vehicleRow) : null;
  const owner = vehicleRow
    ? mapOwner({
        id: vehicleRow.owner_id,
        full_name: vehicleRow.full_name,
        national_id: vehicleRow.national_id,
        email: vehicleRow.email,
        phone: vehicleRow.phone,
        role: vehicleRow.role,
        status: vehicleRow.status,
      })
    : null;

  const violationRows = await db('violations as v')
    .leftJoin('vehicles as veh', 'veh.id', 'v.vehicle_id')
    .leftJoin('cameras as c', 'c.id', 'v.camera_id')
    .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
    .select(
      'v.*',
      'veh.license_plate',
      'c.location_name',
      'f.title as fine_title',
      'f.description as fine_description',
      'f.min_amount',
      'f.max_amount',
      'f.default_amount'
    )
    .modify((query) => {
      query.where(function () {
        this.whereRaw(
          "REPLACE(REPLACE(REPLACE(UPPER(v.detected_plate_text), ' ', ''), '.', ''), '-', '') = ?",
          [key],
        );
        if (vehicle) {
          this.orWhere('v.vehicle_id', vehicle.id);
        }
      });
    })
    .orderBy('v.detected_at', 'desc');

  const violations = violationRows.map(mapViolation);
  const invoices = violations.length
    ? await db('invoices')
        .whereIn('violation_id', violations.map((item) => item.id))
        .select('*')
        .orderBy('issue_date', 'desc')
    : [];

  return {
    plate: vehicle?.licensePlate || plateInput,
    vehicle,
    owner,
    violations,
    invoices: invoices.map(mapInvoice),
  };
}

exports.lookupPlate = async (req, res) => {
  try {
    const plate = String(req.query.plate || req.params.plate || '').trim();
    if (!plate) {
      return res.status(400).json({ message: 'Vui lòng nhập biển số xe.' });
    }
    const result = await lookupByPlate(plate);
    return res.json(result);
  } catch (error) {
    console.error('Lookup plate error:', error);
    return res.status(500).json({ message: 'Không thể tra cứu biển số.' });
  }
};

exports.scanPlate = async (req, res) => {
  try {
    const image = req.body?.image;
    if (!image) {
      return res.status(400).json({ message: 'Thiếu ảnh camera để nhận diện.' });
    }

    const recognized = await recognizePlateFromImage(image);
    if (!recognized.plateText) {
      const hasBox = recognized.detections && recognized.detections.length > 0;
      const hasChars = Boolean(recognized.rawText);
      return res.status(422).json({
        message: hasChars
          ? `Đã đọc được ký tự "${recognized.rawText}" nhưng chưa khớp định dạng biển số Việt Nam. Hãy sửa lại ô nhập rồi bấm Tra cứu.`
          : hasBox
            ? `Đã phát hiện vùng biển số (confidence ${Math.round((recognized.confidence || 0) * 100)}%) nhưng chưa đọc được ký tự. Hãy đưa camera gần hơn, đảm bảo ánh sáng đủ và biển số nằm trong khung vuông.`
            : 'Không tìm thấy biển số trong ảnh. Hãy canh biển số vào khung vuông xanh và giữ yên tay.',
        ...recognized,
        plate: recognized.rawText || '',
        vehicle: null,
        owner: null,
        violations: [],
        invoices: [],
      });
    }

    const result = await lookupByPlate(recognized.plateText);
    return res.json({
      ...recognized,
      ...result,
      plate: result?.vehicle?.licensePlate || recognized.plateText,
    });
  } catch (error) {
    console.error('Scan plate error:', error);
    return res.status(500).json({
      message: error.message || 'Không thể nhận diện biển số.',
    });
  }
};

const VEHICLE_TYPES = ['CAR', 'MOTORBIKE', 'TRUCK', 'BUS', 'OTHER'];
const PLATE_COLORS = ['WHITE', 'BLUE', 'YELLOW', 'RED'];
const DEFAULT_CITIZEN_PASSWORD = '123456';

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

exports.listCitizens = async (req, res) => {
  try {
    const users = await db('users')
      .where('role', 'CITIZEN')
      .orderBy('created_at', 'desc');
    return res.json({ users: users.map(mapOwner) });
  } catch (error) {
    console.error('List citizens error:', error);
    return res.status(500).json({ message: 'Không thể tải danh sách công dân.' });
  }
};

exports.createCitizen = async (req, res) => {
  try {
    const fullName = String(req.body?.fullName || '').trim();
    const nationalId = String(req.body?.nationalId || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const gender = String(req.body?.gender || 'MALE').trim().toUpperCase();
    const dateOfBirth = String(req.body?.dateOfBirth || '').trim();
    
    // Đảm bảo lấy đầy đủ thông tin địa chỉ từ request gửi lên của frontend
    const address = String(req.body?.address || '').trim();
    const ward = String(req.body?.ward || '').trim();
    const city = String(req.body?.city || '').trim();
    const province = String(req.body?.province || '').trim();

    if (!fullName || !nationalId || !phone || !email) {
      return res.status(400).json({ message: 'Vui lòng nhập họ tên, CCCD, email và số điện thoại.' });
    }

    // Kiểm tra email đã tồn tại chưa (đảm bảo email là duy nhất)
    const existingEmail = await db('users').where('email', email).first();
    if (existingEmail) {
      return res.status(409).json({ message: 'Email đã được sử dụng bởi tài khoản khác. Vui lòng dùng email khác.' });
    }

    const passwordHash = await bcrypt.hash(DEFAULT_CITIZEN_PASSWORD, 10);
    const id = crypto.randomUUID();

    // Thực hiện insert đầy đủ các trường địa chỉ vào cơ sở dữ liệu
    await db('users').insert({
      id,
      full_name: fullName,
      national_id: nationalId,
      email,
      phone,
      date_of_birth: dateOfBirth || null,
      gender: gender || null,
      address: address || null,
      ward: ward || null,
      city: city || null,
      province: province || null,
      password_hash: passwordHash,
      role: 'CITIZEN',
      status: 'ACTIVE',
      badge_number: null,
      must_change_password: true, // Bắt buộc đổi mật khẩu khi đăng nhập lần đầu
      password_changed: false,
      created_by: req.user?.id || null,
      created_at: now(),
      updated_at: now(),
    });

    // --- TỰ ĐỘNG GỬI EMAIL THÔNG BÁO TÀI KHOẢN ---
    const localLoginUrl = 'http://localhost:3000/login';

    const mailOptions = {
      from: '"Cổng dịch vụ công CSGT" <csgt@gov.vn>',
      to: email,
      subject: 'Thông báo cấp tài khoản Cổng dịch vụ công CSGT',
      html: `
        <h3>Xin chào ${fullName},</h3>
        <p>Tài khoản Cổng dịch vụ công của bạn đã được cơ quan Công an đăng ký thành công.</p>
        <p><b>Thông tin đăng nhập:</b></p>
        <ul>
          <li>Tên đăng nhập (CCCD hoặc SĐT): <b>${nationalId}</b> hoặc <b>${phone}</b></li>
          <li>Mật khẩu tạm thời: <b>${DEFAULT_CITIZEN_PASSWORD}</b></li>
        </ul>
        <p>Bạn vui lòng truy cập đường dẫn sau để đăng nhập và đổi mật khẩu:</p>
        <p><a href="${localLoginUrl}" target="_blank">${localLoginUrl}</a></p>
        <p>Trân trọng,<br/>Lực lượng Cảnh sát Giao thông</p>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Lỗi gửi email tự động cho công dân:', error);
      } else {
        console.log('Đã gửi email thành công tới:', email);
      }
    });
    // ---------------------------------------------

    const created = await db('users').where('id', id).first();
    return res.status(201).json({
      user: mapOwner(created),
      temporaryPassword: DEFAULT_CITIZEN_PASSWORD,
      message: 'Đã đăng ký công dân, lưu đầy đủ địa chỉ và gửi email thông báo thành công.',
    });
  } catch (error) {
    console.error('Create citizen error:', error);
    if (isDup(error)) {
      return res.status(409).json({ message: dupMessage(error, 'Thông tin công dân bị trùng.') });
    }
    return res.status(500).json({ message: 'Không thể thêm công dân.' });
  }
};

exports.updateCitizen = async (req, res) => {
  try {
    const existing = await findCitizen(req.params.id);
    if (!existing) {
      return res.status(404).json({ message: 'Không tìm thấy công dân.' });
    }

    const patch = { updated_at: now() };
    const fullName = String(req.body?.fullName ?? '').trim();
    const nationalId = String(req.body?.nationalId ?? '').trim();
    const phone = String(req.body?.phone ?? '').trim();
    const emailRaw = req.body?.email;
    const email = emailRaw == null ? '' : String(emailRaw).trim().toLowerCase();
    const dateOfBirth = String(req.body?.dateOfBirth ?? '').trim();
    const gender = String(req.body?.gender ?? '').trim().toUpperCase();
    const address = String(req.body?.address ?? '').trim();
    const ward = String(req.body?.ward ?? '').trim();
    const city = String(req.body?.city ?? '').trim();
    const province = String(req.body?.province ?? '').trim();

    if (fullName) patch.full_name = fullName;
    if (nationalId) patch.national_id = nationalId;
    if (phone) patch.phone = phone;
    if (email) {
      // Kiểm tra email có bị trùng với người khác không
      if (email !== existing.email) {
        const existingEmail = await db('users').where('email', email).whereNot('id', existing.id).first();
        if (existingEmail) {
          return res.status(409).json({ message: 'Email đã được sử dụng bởi tài khoản khác. Vui lòng dùng email khác.' });
        }
      }
      patch.email = email;
    }
    if (dateOfBirth) patch.date_of_birth = dateOfBirth;
    if (gender) patch.gender = gender;
    if (address) patch.address = address;
    if (ward) patch.ward = ward;
    if (city) patch.city = city;
    if (province) patch.province = province;

    const changed = Object.keys(patch).filter((k) => k !== 'updated_at');
    if (changed.length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật. Hãy điền ít nhất một ô.' });
    }

    await db('users').where('id', existing.id).update(patch);
    const updated = await db('users').where('id', existing.id).first();
    return res.json({ user: mapOwner(updated) });
  } catch (error) {
    console.error('Update citizen error:', error);
    if (isDup(error)) {
      return res.status(409).json({ message: dupMessage(error, 'Thông tin công dân bị trùng.') });
    }
    return res.status(500).json({ message: 'Không thể cập nhật công dân.' });
  }
};

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

    if (licensePlate) patch.license_plate = licensePlate;
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