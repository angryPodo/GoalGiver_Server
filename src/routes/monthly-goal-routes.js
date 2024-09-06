const express = require('express');
const router = express.Router();

//월간
const monthlyGoalController = require('../controllers/monthly-goal-controller');

//const auth = require('../middlewares/auth');

// 목표 월간 진행 상황 조회 라우트
router.get('/:goal_id/monthly-progress' , monthlyGoalController.getMonthlyProgress);

module.exports = router;
