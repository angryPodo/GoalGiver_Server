// 사진 인증 내역 조회
const validationModel = require('../models/validation-photo-model');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const getValidationPhoto = async (goalId, userId) => {
  if (!goalId || !userId) {
    throw new Error('Goal ID and User ID are required');
  }
  const goal = await validationModel.findvalidationById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  return goal;
};

module.exports = {
  getValidationPhoto,
};
