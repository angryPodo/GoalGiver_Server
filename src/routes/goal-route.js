const express = require('express');

const { imageUploader } = require('../middlewares/image-upload');

const {
  getUserGoals,
  createGoal,
  getWeeklyGoals,
  validatePhoto,
  requestTeamValidation,
  validateLocation,
  acceptValidation,
} = require('../controllers/goal-controller');

const goalRouter = express.Router();

/**
 * @route POST /goals/:instanceId/validate/accept
 * @description 목표 인스턴스에 대한 인증 수락을 처리
 */
goalRouter.post('/:instanceId/validate/accept', acceptValidation);

/**
 * @route GET /goals/week
 * @description 주간 목표를 조회합니다.
 * @queryParam {string} week_start - 조회 시작 날짜 (YYYY-MM-DD)
 * @queryParam {string} week_end - 조회 종료 날짜 (YYYY-MM-DD)
 */
goalRouter.get('/weeks', getWeeklyGoals);

/**
 * @route GET /goals
 * @description 사용자의 목표를 조회합니다.
 */
goalRouter.get('/', getUserGoals);

/**
 * @route POST /goals
 * @description 새 목표를 생성합니다.
 */
goalRouter.post('/', createGoal);

/**
 * @route POST /goals/:instanceId/validate/location
 * @description 위치 기반 인증을 처리합니다.
 */
goalRouter.post('/:instanceId/validate/location', validateLocation);

/**
 * @route POST /goals/:goalInstanceId/validate/photo
 * @description 목표 사진 인증을 처리합니다.
 * @param {number} goalInstanceId - 인증할 목표 인스턴스 ID
 */
goalRouter.post(
  '/:goalInstanceId/validate/photo',
  imageUploader.single('photo'),
  validatePhoto
);

/**
 * @route POST /goals/:goalInstanceId/validate/team
 * @description 팀원 인증을 처리합니다.
 * @param {number} goalInstanceId - 인증할 목표 인스턴스 ID
 */
goalRouter.post('/:goalInstanceId/validate/team', requestTeamValidation);

// 중복된 라우팅 설정 제거
// 기존에 중복 설정된 /week와 / 경로에 대한 라우팅을 한 번만 설정하도록 수정하였습니다.
// 또한 동일한 경로에 대해 POST 요청을 여러 번 처리하지 않도록 개선했습니다.

module.exports = goalRouter;
