const pool = require('../../config/database');

/**
 * @function saveToken
 * @description 사용자 FCM 토큰을 저장하거나 업데이트
 * @param {number} userId - 사용자 ID
 * @param {string} token - FCM 토큰
 * @returns {Promise<void>}
 * @throws {Error} 데이터베이스 쿼리 실패 시 예외 발생
 */
exports.saveToken = async (userId, token) => {
  // 먼저 해당 사용자의 기존 토큰이 있는지 확인합니다.
  const [existingTokens] = await pool.query(
    'SELECT id FROM User_Tokens WHERE user_id = ?',
    [userId]
  );

  if (existingTokens.length > 0) {
    // 기존 토큰이 있으면 해당 사용자 토큰을 업데이트합니다.
    await pool.query('UPDATE User_Tokens SET token = ? WHERE user_id = ?', [
      token,
      userId,
    ]);
  } else {
    // 기존 토큰이 없으면 새로 삽입합니다.
    await pool.query('INSERT INTO User_Tokens (user_id, token) VALUES (?, ?)', [
      userId,
      token,
    ]);
  }
};
