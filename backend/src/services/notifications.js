/**
 * notifications.js
 *
 * Gửi thông báo vi phạm cho chủ phương tiện sau khi cán bộ xác minh:
 * luôn lưu thông báo trong ứng dụng (APP_PUSH), gửi thêm email nếu công dân có email và hệ thống đã cấu hình.
 */

const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db/knex');

const VIOLATION_LABELS = {
  RED_LIGHT: 'Vượt đèn đỏ',
  WRONG_LANE: 'Đi sai làn đường',
  SPEEDING: 'Chạy quá tốc độ',
  ILLEGAL_PARKING: 'Đỗ xe sai quy định',
  HELMET_LESS: 'Không đội mũ bảo hiểm',
  WRONG_WAY: 'Đi ngược chiều',
};

const emailConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
const transporter = emailConfigured
  ? nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  })
  : null;

function formatDateTime(value) {
  return new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

function mapNotification(row) {
  return {
    id: row.id,
    violationId: row.violation_id ?? null,
    invoiceId: row.invoice_id ?? null,
    title: row.title,
    message: row.message,
    isRead: Boolean(row.is_read),
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

/**
 * Thông báo lỗi vi phạm đã được cán bộ xác minh tới chủ phương tiện.
 * Không ném lỗi: việc gửi thông báo thất bại không được làm hỏng thao tác duyệt.
 */
async function notifyViolationVerified(violationId) {
  try {
    const row = await db('violations as v')
      .join('vehicles as veh', 'veh.id', 'v.vehicle_id')
      .join('users as u', 'u.id', 'veh.owner_id')
      .leftJoin('cameras as c', 'c.id', 'v.camera_id')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .where('v.id', violationId)
      .select(
        'v.id',
        'v.violation_type',
        'v.detected_at',
        'v.corrected_plate_text',
        'v.detected_plate_text',
        'veh.license_plate',
        'u.id as user_id',
        'u.full_name',
        'u.email',
        'c.location_name',
        'f.title as fine_title',
      )
      .first();
    // Chưa xác định được chủ phương tiện thì chưa có ai để thông báo
    if (!row) return;

    const already = await db('notifications').where({ user_id: row.user_id, violation_id: row.id }).first();
    if (already) return;

    const plate = row.license_plate || row.corrected_plate_text || row.detected_plate_text;
    const typeLabel = row.fine_title || VIOLATION_LABELS[row.violation_type] || row.violation_type;
    const place = row.location_name ? ` tại ${row.location_name}` : '';
    const title = `Thông báo vi phạm: ${typeLabel}`;
    const message = `Phương tiện biển số ${plate} vi phạm lỗi "${typeLabel}" lúc ${formatDateTime(row.detected_at)}${place}. `
      + 'Vi phạm đã được cán bộ CSGT xác minh. Vui lòng xem chi tiết và hình ảnh bằng chứng trên Cổng dịch vụ công.';

    const id = crypto.randomUUID();
    await db('notifications').insert({
      id,
      user_id: row.user_id,
      violation_id: row.id,
      channel: 'APP_PUSH',
      title,
      message,
      status: 'SENT',
      sent_at: new Date(),
      is_read: false,
      created_at: new Date(),
    });

    if (transporter && row.email) {
      const baseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
      const link = `${baseUrl}/citizen/violations/${row.id}`;
      transporter.sendMail({
        from: `"Cổng dịch vụ công CSGT" <${process.env.EMAIL_USER}>`,
        to: row.email,
        subject: title,
        html: `
          <h3>Xin chào ${escapeHtml(row.full_name)},</h3>
          <p>${escapeHtml(message)}</p>
          <p><a href="${link}" target="_blank">Xem chi tiết vi phạm</a></p>
          <p>Trân trọng,<br/>Lực lượng Cảnh sát Giao thông</p>
        `,
      }).catch((error) => {
        console.error('Send violation email error:', error.message);
        db('notifications').insert({
          id: crypto.randomUUID(),
          user_id: row.user_id,
          violation_id: row.id,
          channel: 'EMAIL',
          title,
          message,
          status: 'FAILED',
          error_log: error.message,
          is_read: true,
          created_at: new Date(),
        }).catch(() => {});
      });
    }
  } catch (error) {
    console.error('Notify violation error:', error);
  }
}

module.exports = { notifyViolationVerified, mapNotification };
