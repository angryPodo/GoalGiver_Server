
// 사진 인증 내역 조회
const { StatusCodes } = require('http-status-codes');
const validationService = require('../services/validation-photo-service');

const getValidationPhoto = async (req, res) => {
  const goalId = parseInt(req.params.goal_id, 10);
  const userId = parseInt(req.query.user_id, 10);
  try {
    const goal = await validationService.getValidationPhoto(goalId, userId);
    res.status(StatusCodes.OK).json(goal);
  } catch (error) {
    console.error('Error in getValidationPhoto:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  getValidationPhoto,
};
