const express = require('express');
const router = express.Router();

const TeamGoalTimeAttackController = require('../controllers/timeattack-goal-controller.js');

//const auth = require('../middlewares/auth');


router.get('/team/:goal_id/timeattack' , TeamGoalTimeAttackController.getTeamGoalTimeAttack);


module.exports = router;
