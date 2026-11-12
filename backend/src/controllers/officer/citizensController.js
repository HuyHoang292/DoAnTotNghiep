const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const db = require('../../db/knex');
const { mapOwner, mapDriverLicense } = require('../../utils/mappers');
const { now, dupMessage, isDup, isDupPrimary, nextCitizenId, findCitizen } = require('./helpers');

// Cấu hình dịch vụ gửi email tự động
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'email_cua_ban@gmail.com', // Thay bằng email hệ thống của bạn hoặc cấu hình trong file .env
    pass: process.env.EMAIL_PASS || 'mat_khau_ung_dung',      // Mật khẩu ứng dụng (App Password) của email
  },
});

const DEFAULT_CITIZEN_PASSWORD = '123456';

// Token JWT hết hạn sau 1 ngày → phiên chưa đăng xuất và còn trong 24h coi là đang đăng nhập
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function toIsoOrNull(value) {
  return value ? new Date(value).toISOString() : null;
}

function isSessionActive(row) {
  return Boolean(
    row?.logged_in_at &&
    !row.logged_out_at &&
    Date.now() - new Date(row.logged_in_at).getTime() < SESSION_TTL_MS
  );
}

function mapLoginHistory(row) {
  return {
    id: row.id,
    status: row.status,
    failureReason: row.failure_reason ?? null,
    ipAddress: row.ip_address ?? null,
    userAgent: row.user_agent ?? null,
    loggedInAt: toIsoOrNull(row.logged_in_at),
    loggedOutAt: toIsoOrNull(row.logged_out_at),
    isActive: row.status === 'SUCCESS' && isSessionActive(row),
  };
}

exports.listCitizens = async (req, res) => {
  try {
    const users = await db('users')
      .where('role', 'CITIZEN')
      .orderBy('created_at', 'desc');

    // Lần đăng nhập thành công gần nhất + tổng số lần đăng nhập của mỗi công dân
    const stats = await db('login_history')
      .where('status', 'SUCCESS')
      .groupBy('user_id')
      .select('user_id')
      .max({ last_login_at: 'logged_in_at' })
      .count({ login_count: 'id' });
    const latestSessions = await db('login_history as lh')
      .join(
        db('login_history')
          .where('status', 'SUCCESS')
          .groupBy('user_id')
          .select('user_id')
          .max({ max_id: 'id' })
          .as('latest'),
        'latest.max_id',
        'lh.id'
      )
      .select('lh.user_id', 'lh.logged_in_at', 'lh.logged_out_at');
    const licenses = await db('driver_licenses')
      .orderBy('issue_date', 'asc')
      .select('user_id', 'license_class', 'status', 'expiry_date');

    const statsByUser = new Map(stats.map((row) => [row.user_id, row]));
    const sessionByUser = new Map(latestSessions.map((row) => [row.user_id, row]));
    const licensesByUser = new Map();
    for (const row of licenses) {
      const list = licensesByUser.get(row.user_id) ?? [];
      const { licenseClass, status } = mapDriverLicense(row);
      list.push({ licenseClass, status });
      licensesByUser.set(row.user_id, list);
    }

    return res.json({
      users: users.map((user) => {
        const stat = statsByUser.get(user.id);
        return {
          ...mapOwner(user),
          passwordChanged: Boolean(user.password_changed),
          lastLoginAt: toIsoOrNull(stat?.last_login_at),
          loginCount: Number(stat?.login_count ?? 0),
          isOnline: isSessionActive(sessionByUser.get(user.id)),
          driverLicenses: licensesByUser.get(user.id) ?? [],
        };
      }),
    });
  } catch (error) {
    console.error('List citizens error:', error);
    return res.status(500).json({ message: 'Không thể tải danh sách công dân.' });
  }
};

exports.getCitizenLoginHistory = async (req, res) => {
  try {
    const user = await db('users').where({ id: req.params.id, role: 'CITIZEN' }).first();
    if (!user) return res.status(404).json({ message: 'Không tìm thấy công dân.' });

    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const rows = await db('login_history')
      .where('user_id', user.id)
      .orderBy('logged_in_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit);

    return res.json({ history: rows.map(mapLoginHistory) });
  } catch (error) {
    console.error('Get citizen login history error:', error);
    return res.status(500).json({ message: 'Không thể tải lịch sử đăng nhập.' });
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
    // Thực hiện insert đầy đủ các trường địa chỉ vào cơ sở dữ liệu
    const citizenRow = {
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
    };

    // Mã công dân dạng user-citizen-???; hai cán bộ tạo cùng lúc có thể trùng mã thì lấy mã kế tiếp
    let id;
    for (let attempt = 0; ; attempt += 1) {
      id = await nextCitizenId();
      try {
        await db('users').insert({ id, ...citizenRow });
        break;
      } catch (error) {
        if (!isDupPrimary(error) || attempt >= 4) throw error;
      }
    }

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
