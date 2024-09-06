// 주간 목표 상세 조회
const goalModel = require('../models/weekly-goal-model');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const getGoalWeeklyProgress = async (goalId, userId) => {
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
  getGoalWeeklyProgress,
};
