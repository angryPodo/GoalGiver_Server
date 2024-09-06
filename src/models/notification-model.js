const pool = require('../../config/database');

exports.getNotificationsByUserId = async (userId) => {
  const query = `
    SELECT id, user_id, content, created_at
    FROM Notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `;

  const [rows] = await pool.execute(query, [userId]);
  return rows;
};
