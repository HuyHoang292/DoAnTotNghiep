const db = require('../../db/knex');
const { mapNotification } = require('../../services/notifications');

exports.listNotifications = async (req, res) => {
  try {
    const query = () => db('notifications').where({ user_id: req.user.id, channel: 'APP_PUSH' });
    const [rows, unread] = await Promise.all([
      query().orderBy('created_at', 'desc').limit(50),
      query().where('is_read', false).count({ total: 'id' }).first(),
    ]);
    return res.json({
      notifications: rows.map(mapNotification),
      unreadCount: Number(unread?.total ?? 0),
    });
  } catch (error) {
    console.error('List notifications error:', error);
    return res.status(500).json({ message: 'Không thể tải thông báo.' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const updated = await db('notifications')
      .where({ id: req.params.id, user_id: req.user.id, is_read: false })
      .update({ is_read: true, read_at: new Date() });
    return res.json({ updated });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ message: 'Không thể cập nhật thông báo.' });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const updated = await db('notifications')
      .where({ user_id: req.user.id, is_read: false })
      .update({ is_read: true, read_at: new Date() });
    return res.json({ updated });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ message: 'Không thể cập nhật thông báo.' });
  }
};
