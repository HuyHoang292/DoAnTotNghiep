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
      .where(function () {
        this.where('email', username)
          .orWhere('national_id', username)
          .orWhere('phone', username);
      })
      .first();

    if (!user) {
      return res.status(401).json({ message: 'Tên đăng nhập hoặc mật khẩu không đúng.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

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
        unit: user.role === 'OFFICER' ? 'Phòng CSGT' : undefined,
        gender: user.gender ?? null,
        address: user.address ?? null,
        ward: user.ward ?? null,
        city: user.city ?? null,
        province: user.province ?? null,
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi lấy thông tin người dùng.' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới tối thiểu 6 ký tự.' });
    }

    const user = await db('users').where('id', req.user.id).first();
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng.' });

    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db('users').where('id', req.user.id).update({ password_hash: hashed });

    return res.json({ message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    console.error('ChangePassword Error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ nội bộ.' });
  }
};