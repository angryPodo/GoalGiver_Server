const { acceptTeamValidation } = require('../services/goal-service');
const { StatusCodes } = require('http-status-codes');

/**
 * @function acceptValidation
 * @description 팀 목표 인증 수락을 처리하고 결과를 반환합니다.
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.acceptValidation = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const userId = req.user.id;

    const allAccepted = await acceptTeamValidation(instanceId, userId);

    if (allAccepted) {
      res
        .status(StatusCodes.OK)
        .json({ message: '모든 팀원이 인증을 수락하였습니다.' });
    } else {
      res.status(StatusCodes.OK).json({ message: '인증을 수락하였습니다.' });
    }
  } catch (err) {
    if (err.message === '이미 완료된 인증입니다.') {
      res.status(StatusCodes.CONFLICT).json({ message: err.message });
    } else {
      res
        .status(StatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: '인증 처리 중 오류 발생', error: err.message });
    }
  }
};
// src/controllers/goal-controller.js

const {
  uploadPhotoAndValidate,
  requestTeamValidationService,
} = require('../services/goal-service');

const { getGoals } = require('../services/goal-service');

/**
 * @function validatePhoto
 * @description 목표 사진 인증을 처리하고 결과를 반환합니다.
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.validatePhoto = async (req, res) => {
  try {
    const result = await uploadPhotoAndValidate(req);
    res.status(StatusCodes.OK).json({ message: '인증 성공', data: result });
  } catch (error) {
    if (error.message.includes('접근 권한이 없습니다')) {
      res.status(StatusCodes.FORBIDDEN).json({
        message: '접근 권한이 없습니다. (아이디 불일치)',
      });
    } else if (error.message.includes('사진 인증 타입이 아닙니다')) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: '사진 인증 타입이 아닙니다.',
      });
    } else if (error.message.includes('이미 인증된 요청입니다')) {
      res.status(StatusCodes.CONFLICT).json({
        message: '이미 인증된 요청입니다.',
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '에러로 인한 인증 실패',
        error: error.message,
      });
    }
  }
};

/**
 * @function validateTeam
 * @description 팀원 인증을 처리하고 결과를 반환합니다.
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.requestTeamValidation = async (req, res) => {
  try {
    const result = await requestTeamValidationService(
      req.params.goalInstanceId,
      req.user
    );
    res.status(StatusCodes.OK).json({
      message: '인증 요청이 성공적으로 전송되었습니다.',
      data: result,
    });
  } catch (error) {
    if (error.message.includes('중복된 알림이 이미 존재합니다.')) {
      res.status(StatusCodes.CONFLICT).json({
        message: '이미 같은 알림이 존재합니다.',
      });
    } else if (error.message.includes('접근 권한이 없습니다')) {
      res.status(StatusCodes.FORBIDDEN).json({
        message: '접근 권한이 없습니다. (아이디 불일치)',
      });
    } else if (error.message.includes('유효한 목표 타입이 아닙니다')) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: '유효한 목표 타입이 아닙니다.',
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '인증 요청 전송 중 에러 발생',
        error: error.message,
      });
    }
  }
};

/**
 * @function isValidDate
 * @description 주어진 문자열이 유효한 날짜인지 확인합니다.
 * @param {string} dateString - 확인할 날짜 문자열
 * @returns {boolean} 유효한 날짜인지 여부
 */
const isValidDate = (dateString) => {
  return !isNaN(Date.parse(dateString));
};

/**
 * @function getWeeklyGoals
 * @description 주간 목표를 조회하여 클라이언트에 반환합니다.
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 * @param {Function} next - Express next 미들웨어 함수
 */
exports.getWeeklyGoals = async (req, res, next) => {
  const { week_start, week_end } = req.query;
  const userId = req.user?.id;

  if (!userId) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: 'userId가 올바르지 않습니다.' });
  }
  // 쿼리 파라미터가 없는 경우 처리
  if (!week_start || !week_end) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: 'week_start 또는 week_end가 없습니다.' });
  }

  // 유효한 날짜 형식인지 확인
  if (!isValidDate(week_start) || !isValidDate(week_end)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: '유효한 날짜 형식이 아닙니다.' });
  }

  // 날짜 객체로 변환
  const startDate = new Date(week_start);
  const endDate = new Date(week_end);

  // 시작 날짜가 종료 날짜보다 이후인 경우
  if (startDate > endDate) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: '시작 날짜는 종료 날짜보다 이전이어야 합니다.' });
  }

  // 기간이 7일을 넘는 경우
  const differenceInTime = endDate.getTime() - startDate.getTime();
  const differenceInDays = differenceInTime / (1000 * 3600 * 24);

  if (differenceInDays > 7) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: '기간은 최대 7일 이내여야 합니다.' });
  }

  try {
    const goals = await getGoals(userId, week_start, week_end);
    res.status(StatusCodes.OK).json(goals);
  } catch (err) {
    console.error('주간 목표 조회 에러', err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: '주간 목표 조회 에러' });
    next(err);
  }
};

// 작성자: Minjae Han

const { getUserGoals } = require('../services/goal-service');

exports.getUserGoals = async (req, res, next) => {
  try {
    const userId = req.user?.id; // req.user가 정의되지 않은 경우를 대비해 안전하게 처리
    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '유효하지 않은 사용자 ID입니다.' });
    }

    const goals = await getUserGoals(userId);
    res.status(StatusCodes.OK).json(goals);
  } catch (err) {
    console.error('내 목표 조회 API 에러: ', err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal Server Error' });
  }
};

// 작성자: Minjae Han

const { createGoal } = require('../services/goal-service');
const { getPoint } = require('../models/goal-model');

exports.createGoal = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '유효하지 않은 사용자 ID입니다.' });
    }

    const { title, startDate, endDate, type, validationType, donationAmount } =
      req.body;

    // 필수 필드 검증
    if (!title || !startDate || !endDate || !type || !validationType) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '유효하지 않은 요청입니다.' });
    }
    console.log(userId);
    const prevPoint = await getPoint(userId);
    if (donationAmount > prevPoint) {
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '기부 포인트가 부족합니다.' });
    }
    const goalData = req.body;
    goalData.userId = userId;

    const newGoal = await createGoal(goalData);
    res.status(StatusCodes.CREATED).json(newGoal);
  } catch (err) {
    console.error('목표 추가 API 에러: ', err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: 'Internal Server Error' });
  }
};
const { calculateLocation } = require('../services/goal-service');

/**
 * @function validateLocation
 * @description 목표 인스턴스에 대한 위치 인증을 처리합니다.
 * @param {Object} req - Express 요청 객체
 * @param {Object} res - Express 응답 객체
 */
exports.validateLocation = async (req, res) => {
  try {
    const { instanceId } = req.params;
    const { latitude, longitude } = req.body;

    const result = await calculateLocation(instanceId, latitude, longitude);

    if (result) {
      res.status(StatusCodes.OK).json({ message: '위치 인증 성공' });
    } else {
      res.status(StatusCodes.BAD_REQUEST).json({ message: '위치 인증 실패' });
    }
  } catch (err) {
    if (err.message.includes('목표가 없습니다')) {
      res.status(StatusCodes.NOT_FOUND).json({
        message: '해당 목표를 찾을 수 없습니다.',
      });
    } else if (err.message.includes('이미 완료된 인증입니다')) {
      res.status(StatusCodes.CONFLICT).json({
        message: '이미 완료된 인증입니다.',
      });
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '위치 인증 중 오류 발생',
        error: err.message,
      });
    }
  }
};
