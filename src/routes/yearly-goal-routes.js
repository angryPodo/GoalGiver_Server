const express = require('express');
const router = express.Router();
//연간
const yearlyGoalController = require('../controllers/yearly-goal-controller.js');

//const auth = require('../middlewares/auth');

// 목표 연간 진행 상황 조회 라우트
router.get('/:goal_id/yearly-progress' , yearlyGoalController.getYearlyProgress);


module.exports = router;
