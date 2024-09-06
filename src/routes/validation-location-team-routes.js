const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validation-location-team-controller');

router.get('/:goal_id/date-validation-history', validationController.getValidationLocationTeam);

module.exports = router;
