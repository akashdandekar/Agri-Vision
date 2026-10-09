const { query } = require('../config/db');
const { sendPushNotification } = require('../config/firebase');

/**
 * Creates persistent notification in MySQL and optionally triggers FCM
 */
async function createNotification({ userId, title, message, type, metadata = null, deviceToken = null }) {
  try {
    if (!userId) return null;

    const metadataStr = metadata ? JSON.stringify(metadata) : null;
    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, is_read, metadata_json, created_at)
       VALUES (?, ?, ?, ?, 0, ?, NOW())`,
      [userId, title, message, type, metadataStr]
    );

    // Trigger FCM in background
    if (deviceToken) {
      sendPushNotification(deviceToken, { title, body: message }).catch(err => {
        console.warn('FCM delivery log:', err.message);
      });
    }

    return {
      id: result.insertId,
      userId,
      title,
      message,
      type
    };
  } catch (error) {
    console.error('Failed to create notification:', error.message);
    // Notification failure should not crash primary transaction
    return null;
  }
}

module.exports = {
  createNotification
};
