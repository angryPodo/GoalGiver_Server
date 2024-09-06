const pool = require('../../config/database');

exports.getUserProfile = async (userId) => {
  try {
    const [user] = await pool.query(
      `
      SELECT id AS userId, nickname, level, profile_image AS profilePhoto, points, donation_points AS donationPoints
      FROM Users
      WHERE id = ?
    `,
      [userId]
    );

    if (user.length === 0) {
      throw new Error('User not found');
    }

    const [badges] = await pool.query(
      `
      SELECT ub.badge_name AS name
      FROM User_Badges ub
      WHERE ub.user_id = ?
    `,
      [userId]
    );

    return {
      ...user[0],
      badges,
    };
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    throw err;
  }
};
