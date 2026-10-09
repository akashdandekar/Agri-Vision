const { query } = require('../config/db');

/**
 * Get notifications for current logged-in user
 */
async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user.id;

    const notifications = await query(
      `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
      [userId]
    );

    const [unread] = await query(
      `SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return res.json({
      success: true,
      unreadCount: parseInt(unread.unread_count, 10),
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a single notification as read
 */
async function markNotificationAsRead(req, res, next) {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await query(
      `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
      [id, userId]
    );

    return res.json({
      success: true,
      message: 'Notification marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user.id;

    await query(
      `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
};
