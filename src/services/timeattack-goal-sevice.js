// 팀미션(타임어택) 진행상황
const goalModel = require('../models/timeattack-goal-model');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
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
