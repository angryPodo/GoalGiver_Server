// 사진 인증 내역 조회
const express = require('express');
const router = express.Router();
const validationController = require('../controllers/validation-photo-controller');

router.get('/:goal_id/photo-validation-history', validationController.getValidationPhoto);

module.exports = router;
