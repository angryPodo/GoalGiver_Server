const validationModel = require('../models/validation-location-team-model');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const getValidationLocationTeam = async (goalId, userId) => {
  if (!goalId || !userId) {
    throw new Error('Goal ID and User ID are required');
  }
  const goal = await validationModel.findValidationById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  return goal;
};

module.exports = {
  getValidationLocationTeam,
};
