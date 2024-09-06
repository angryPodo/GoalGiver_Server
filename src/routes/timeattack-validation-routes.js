//팀 목표 인증내역
const express = require('express');
const router = express.Router();

const TeamGoalTimeAttackController = require('../controllers/timeattack-validation-controller.js');

//const auth = require('../middlewares/auth');


router.get('/team/:goal_id/validation-history' , TeamGoalTimeAttackController.getTeamGoalTimeAttack);


module.exports = router;
