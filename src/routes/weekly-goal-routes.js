const express = require('express');
const router = express.Router();
//주간
const weeklyGoalController = require('../controllers/weekly-goal-controller');

//const auth = require('../middlewares/auth');

// 목표 주간 진행 상황 조회 라우트
router.get('/:goal_id/weekly-progress' , weeklyGoalController.getWeeklyProgress);


module.exports = router;
