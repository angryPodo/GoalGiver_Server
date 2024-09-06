
// 위치 인증내역, 팀원인증 내역(goalsuccess)

const { StatusCodes } = require('http-status-codes');
const validationService = require('../services/validation-location-team-service');

const getValidationLocationTeam = async (req, res) => {
  const goalId = parseInt(req.params.goal_id, 10);
  const userId = parseInt(req.query.user_id, 10);
  try {
    const goal = await validationService.getValidationLocationTeam(goalId, userId);
    res.status(StatusCodes.OK).json(goal);
  } catch (error) {
    console.error('Error in getValidationLocationTeam:', error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Internal Server Error' });
  }
};

module.exports = {
  getValidationLocationTeam,
};
