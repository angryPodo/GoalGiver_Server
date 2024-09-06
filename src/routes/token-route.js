const express = require('express');
const tokenController = require('../controllers/token-controller');

const tokenRouter = express.Router();

/**
 * @route POST /save-token
 * @description 사용자의 FCM 토큰을 저장합니다.
 */
tokenRouter.post('/save-token', tokenController.saveTokenController);

module.exports = tokenRouter;
