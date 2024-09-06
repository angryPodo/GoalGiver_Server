//팀 목표 인증내역
const goalModel = require('../models/timeattack-validation-model');

// 목표 ID와 사용자 ID로 인증내역 조회
const getTeamGoalTimeAttack = async (goalId, userId) => {
  if (!goalId || !userId) {
    throw new Error('Goal ID and User ID are required');
  }
  const goal = await goalModel.findTeamGoalTimeAttackById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  return goal;
};

module.exports = {
  getTeamGoalTimeAttack,
};
