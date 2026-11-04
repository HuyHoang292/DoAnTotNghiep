const db = require('../../db/knex');
const crypto = require('crypto');
const { mapInvoice } = require('../../utils/mappers');
const { now } = require('./helpers');

exports.createInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, dueDate } = req.body;

    const violation = await db('violations as v')
      .leftJoin('fines as f', 'f.violation_type', 'v.violation_type')
      .where('v.id', id)
      .select('v.*', 'f.default_amount', 'f.min_amount', 'f.max_amount')
      .first();

    if (!violation) {
      return res.status(404).json({ message: 'Không tìm thấy vi phạm.' });
    }

    if (violation.status !== 'OFFICER_VERIFIED') {
      return res.status(400).json({ message: 'Vi phạm phải được xác minh trước khi phát hành hóa đơn.' });
    }

    // Check if invoice already exists
    const existingInvoice = await db('invoices').where('violation_id', id).first();
    if (existingInvoice) {
      return res.status(400).json({ message: 'Vi phạm này đã có hóa đơn.' });
    }

    if (!violation.vehicle_id) {
      return res.status(400).json({ message: 'Vi phạm chưa xác định được phương tiện.' });
    }

    // Determine amount
    const invoiceAmount = amount || violation.default_amount;
    if (invoiceAmount < violation.min_amount || invoiceAmount > violation.max_amount) {
      return res.status(400).json({ 
        message: `Số tiền phải trong khoảng ${violation.min_amount.toLocaleString('vi-VN')} - ${violation.max_amount.toLocaleString('vi-VN')} đ` 
      });
    }

    // Determine due date (15 days from now if not specified)
    const issueDateObj = new Date();
    const dueDateObj = dueDate ? new Date(dueDate) : new Date(issueDateObj.getTime() + 15 * 24 * 60 * 60 * 1000);

    const invoiceId = crypto.randomUUID();
    const invoiceCode = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    await db.transaction(async (trx) => {
      // Create invoice
      await trx('invoices').insert({
        id: invoiceId,
        violation_id: id,
        invoice_code: invoiceCode,
        amount: invoiceAmount,
        issue_date: issueDateObj.toISOString().split('T')[0],
        due_date: dueDateObj.toISOString().split('T')[0],
        status: 'UNPAID',
        created_at: now(),
        updated_at: now(),
      });

      // Update violation status
      await trx('violations')
        .where('id', id)
        .update({
          status: 'INVOICED',
          updated_at: now(),
        });
    });

    const invoice = await db('invoices').where('id', invoiceId).first();
    const updatedViolation = await db('violations').where('id', id).first();

    return res.status(201).json({ 
      invoice,
      violation: updatedViolation,
      message: `Đã phát hành biên lai ${invoiceCode}` 
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    return res.status(500).json({ message: 'Không thể tạo hóa đơn.' });
  }
};

// Tạo hóa đơn từ vi phạm
// Huỷ hóa đơn chưa thanh toán, lý do được lưu vào audit_logs
exports.cancelInvoice = async (req, res) => {
  try {
    const reason = String(req.body?.reason || '').trim();
    if (reason.length < 5) {
      return res.status(400).json({ message: 'Lý do huỷ tối thiểu 5 ký tự.' });
    }

    const invoice = await db('invoices').where('id', req.params.id).first();
    if (!invoice) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn.' });
    }
    if (invoice.status !== 'UNPAID' && invoice.status !== 'OVERDUE') {
      return res.status(400).json({ message: 'Chỉ huỷ được hóa đơn chưa thanh toán.' });
    }

    await db.transaction(async (trx) => {
      await trx('invoices').where('id', invoice.id).update({ status: 'CANCELLED', updated_at: now() });
      await trx('audit_logs').insert({
        user_id: req.user.id,
        action: 'CANCEL_INVOICE',
        target_table: 'invoices',
        target_id: invoice.id,
        old_data: JSON.stringify({ status: invoice.status }),
        new_data: JSON.stringify({ status: 'CANCELLED', reason }),
        ip_address: req.ip || null,
      });
    });

    const updated = await db('invoices').where('id', invoice.id).first();
    return res.json({ invoice: mapInvoice(updated), message: 'Đã huỷ hóa đơn.' });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    return res.status(500).json({ message: 'Không thể huỷ hóa đơn.' });
  }
};
