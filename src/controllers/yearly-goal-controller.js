const { StatusCodes } = require('http-status-codes');
const goalService = require('../services/yearly-goal-service.js');

// 목표 연간 진행 상황 조회
const getYearlyProgress = async (req, res) => {
  const goalId = parseInt(req.params.goal_id, 10);
  const userId = parseInt(req.query.user_id, 10);

  try {
    if (!goalId || !userId) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: 'Goal ID and User ID are required' });
    }

    const goal = await goalService.getGoalYearlyProgress(goalId, userId);
    if (!goal) {
      return res.status(StatusCodes.NOT_FOUND).json({ message: 'Goal not found' });
    }

    res.status(StatusCodes.OK).json(goal);
  } catch (error) {
    console.error('Error in getYearlyProgress:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Server Error' });
  }
};

module.exports = { getYearlyProgress };