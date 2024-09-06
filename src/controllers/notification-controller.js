//notification-controller.js

const {
  sendNotification,
  getNotificationsByUserId,
} = require('../services/notification-service');
const { StatusCodes } = require('http-status-codes');
/**
 * @function sendNotificationController
 * @description 알림을 전송하는 API 컨트롤러
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.sendNotificationController = async (req, res) => {
  try {
    const { tokens, notification, data } = req.body;

    const response = await sendNotification(tokens, notification, data);

    res
      .status(StatusCodes.OK)
      .json({ message: '알림 전송 성공', data: response });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: '알림 전송 실패', error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

    const response = await getNotificationsByUserId(userId);

    res
      .status(StatusCodes.OK)
      .json({ message: '알림 조회 성공', data: response });
  } catch (err) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: '알림 도회 실패', error: err.message });
  }
};
