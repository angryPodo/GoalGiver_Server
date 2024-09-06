const { saveToken } = require('../services/token-service');
const { StatusCodes } = require('http-status-codes');

/**
 * @function saveTokenController
 * @description 사용자의 FCM 토큰을 저장하는 컨트롤러
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.saveTokenController = async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  try {
    await saveToken(userId, token);
    res.status(StatusCodes.OK).json({ message: '토큰 저장 성공' });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: '토큰 저장 실패', error: err.message });
  }
};
