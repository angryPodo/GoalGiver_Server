const goalModel = require('../models/yearly-goal-model.js');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const getGoalYearlyProgress = async (goalId, userId) => {
  if (!goalId || !userId) {
    throw new Error('Goal ID and User ID are required');
  }
  const goal = await goalModel.findGoalWithProgressById(goalId, userId);
  if (!goal) {
    throw new Error('Goal not found');
  }
  return goal;
};

module.exports = {
  getGoalYearlyProgress,
};
