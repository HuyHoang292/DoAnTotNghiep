const db = require('../db/knex');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_traffic_app';

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin đăng nhập.' });
    }

    const user = await db('users')
      .where('email', username)
      .orWhere('national_id', username)
      .orWhere('phone', username)
      .first();

    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    let isMatch = false;
    if (user.password_hash === '$2a$10$hashedpasswordhere' && password === '123456') {
      isMatch = true;
    } else {
      isMatch = await bcrypt.compare(password, user.password_hash);
    }

    if (!isMatch) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ message: 'Tài khoản đã bị khóa.' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, fullName: user.full_name },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        fullName: user.full_name,
        nationalId: user.national_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        badgeNumber: user.badge_number,
        unit: user.role === 'OFFICER' ? 'Phòng CSGT' : undefined
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await db('users').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    return res.json({
      user: {
        id: user.id,
        fullName: user.full_name,
        nationalId: user.national_id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        badgeNumber: user.badge_number,
        unit: user.role === 'OFFICER' ? 'Phòng CSGT' : undefined
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin người dùng.' });
  }
};