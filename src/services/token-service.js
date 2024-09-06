const tokenModel = require('../models/token-model');

/**
 * @function saveToken
 * @description 사용자의 FCM 토큰을 데이터베이스에 저장
 * @param {number} userId - 사용자 ID
 * @param {string} token - FCM 토큰
 * @throws {Error} 토큰 저장 중 오류 발생 시 예외 발생
 */
exports.saveToken = async (userId, token) => {
  try {
    await tokenModel.saveToken(userId, token);
  } catch (error) {
    throw new Error('토큰 저장 중 오류 발생: ' + error.message);
  }
};
