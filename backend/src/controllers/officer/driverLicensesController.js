const crypto = require('crypto');
const db = require('../../db/knex');
const { mapDriverLicense, toDateOnly } = require('../../utils/mappers');
const { now, isDup, findCitizen } = require('./helpers');

// Hạng GPLX mới theo Luật TTATGTĐB 2024 và hạng cũ cấp trước 01/01/2025 (vẫn còn hiệu lực)
const LICENSE_CLASSES = [
  'A1', 'A', 'B1', 'B', 'C1', 'C', 'D1', 'D2', 'D', 'BE', 'C1E', 'CE', 'D1E', 'D2E', 'DE',
  'A2', 'A3', 'A4', 'B2', 'E', 'FB2', 'FC', 'FD', 'FE',
];
const LICENSE_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Đọc & kiểm tra dữ liệu GPLX từ body. partial = true khi cập nhật (chỉ kiểm tra trường được gửi)
function parseDriverLicenseBody(body, partial) {
  const data = {};
  const has = (key) => body?.[key] !== undefined;

  if (!partial || has('licenseNumber')) {
    const licenseNumber = String(body?.licenseNumber ?? '').trim();
    if (!/^\d{12}$/.test(licenseNumber)) return { error: 'Số GPLX phải gồm đúng 12 chữ số.' };
    data.license_number = licenseNumber;
  }
  if (!partial || has('licenseClass')) {
    const licenseClass = String(body?.licenseClass ?? '').trim().toUpperCase();
    if (!LICENSE_CLASSES.includes(licenseClass)) return { error: 'Hạng bằng lái không hợp lệ.' };
    data.license_class = licenseClass;
  }
  if (!partial || has('issueDate')) {
    const issueDate = String(body?.issueDate ?? '').trim();
    if (!DATE_RE.test(issueDate)) return { error: 'Vui lòng nhập ngày cấp.' };
    data.issue_date = issueDate;
  }
  if (!partial || has('expiryDate')) {
    const expiryDate = String(body?.expiryDate ?? '').trim();
    if (expiryDate && !DATE_RE.test(expiryDate)) return { error: 'Ngày hết hạn không hợp lệ.' };
    data.expiry_date = expiryDate || null;
  }
  if (!partial || has('issuedBy')) {
    data.issued_by = String(body?.issuedBy ?? '').trim() || null;
  }
  if (has('status')) {
    const status = String(body.status).trim().toUpperCase();
    if (!LICENSE_STATUSES.includes(status)) return { error: 'Trạng thái GPLX không hợp lệ.' };
    data.status = status;
  }
  return { data };
}

function driverLicenseDupMessage(error) {
  const msg = String(error?.sqlMessage || error?.message || '');
  if (msg.includes('license_number')) return 'Số GPLX đã tồn tại trong hệ thống.';
  if (msg.includes('license_class')) return 'Công dân đã có bằng lái hạng này.';
  return 'Thông tin GPLX bị trùng.';
}

exports.listCitizenDriverLicenses = async (req, res) => {
  try {
    const user = await findCitizen(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy công dân.' });

    const rows = await db('driver_licenses')
      .where('user_id', user.id)
      .orderBy('issue_date', 'desc');
    return res.json({ licenses: rows.map(mapDriverLicense) });
  } catch (error) {
    console.error('List driver licenses error:', error);
    return res.status(500).json({ message: 'Không thể tải giấy phép lái xe.' });
  }
};

exports.createDriverLicense = async (req, res) => {
  try {
    const user = await findCitizen(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy công dân.' });

    const { data, error } = parseDriverLicenseBody(req.body, false);
    if (error) return res.status(400).json({ message: error });
    if (data.expiry_date && data.expiry_date <= data.issue_date) {
      return res.status(400).json({ message: 'Ngày hết hạn phải sau ngày cấp.' });
    }

    const id = crypto.randomUUID();
    await db('driver_licenses').insert({
      id,
      user_id: user.id,
      ...data,
      status: data.status || 'ACTIVE',
      created_at: now(),
      updated_at: now(),
    });

    const created = await db('driver_licenses').where('id', id).first();
    return res.status(201).json({ license: mapDriverLicense(created) });
  } catch (error) {
    console.error('Create driver license error:', error);
    if (isDup(error)) return res.status(409).json({ message: driverLicenseDupMessage(error) });
    return res.status(500).json({ message: 'Không thể thêm giấy phép lái xe.' });
  }
};

exports.updateDriverLicense = async (req, res) => {
  try {
    const existing = await db('driver_licenses').where('id', req.params.id).first();
    if (!existing) return res.status(404).json({ message: 'Không tìm thấy giấy phép lái xe.' });

    const { data, error } = parseDriverLicenseBody(req.body, true);
    if (error) return res.status(400).json({ message: error });
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật.' });
    }

    const issueDate = data.issue_date ?? toDateOnly(existing.issue_date);
    const expiryDate = data.expiry_date !== undefined ? data.expiry_date : toDateOnly(existing.expiry_date);
    if (expiryDate && expiryDate <= issueDate) {
      return res.status(400).json({ message: 'Ngày hết hạn phải sau ngày cấp.' });
    }

    await db('driver_licenses').where('id', existing.id).update({ ...data, updated_at: now() });
    const updated = await db('driver_licenses').where('id', existing.id).first();
    return res.json({ license: mapDriverLicense(updated) });
  } catch (error) {
    console.error('Update driver license error:', error);
    if (isDup(error)) return res.status(409).json({ message: driverLicenseDupMessage(error) });
    return res.status(500).json({ message: 'Không thể cập nhật giấy phép lái xe.' });
  }
};

exports.deleteDriverLicense = async (req, res) => {
  try {
    const deleted = await db('driver_licenses').where('id', req.params.id).del();
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy giấy phép lái xe.' });
    return res.json({ message: 'Đã xoá giấy phép lái xe.' });
  } catch (error) {
    console.error('Delete driver license error:', error);
    return res.status(500).json({ message: 'Không thể xoá giấy phép lái xe.' });
  }
};
