// 작성자: Minjae Han

const pool = require('../../config/database');

exports.getUserDonations = async (userId) => {
  try {
    const query = `
      SELECT d.donation_date AS date, d.amount, o.name AS organization
      FROM Donations d
      JOIN Donation_Organizations o ON d.donation_organization_id = o.id
      WHERE d.user_id = ?
      ORDER BY d.donation_date DESC
    `;

    const [rows] = await pool.query(query, [userId]);

    if (rows.length === 0) {
      console.log(`No donations found for user with ID: ${userId}`);
    }

    return rows;
  } catch (error) {
    console.error('Error fetching user donations:', error.message);
    throw new Error('Unable to fetch user donations. Please try again later.');
  }
};
