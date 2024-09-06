const {
  updateTeamValidation,
  areAllTeamMembersAccepted,
  markGoalValidationAsCompleted,
  deleteNotification,
} = require('../models/goal-model');

/**
 * @function acceptTeamValidation
 * @description 팀원의 인증 수락 상태를 업데이트하고 모든 팀원이 인증을 수락했는지 확인합니다.
 * @param {number} instanceId - 인스턴스 ID
 * @param {number} userId - 사용자 ID
 * @returns {Promise<boolean>} 모든 팀원이 수락했는지 여부
 */
exports.acceptTeamValidation = async (instanceId, userId) => {
  if (await isValidationComplete(instanceId, userId)) {
    throw new Error('이미 완료된 인증입니다.');
  }

  await updateTeamValidation(instanceId, userId);

  const allAccepted = await areAllTeamMembersAccepted(instanceId);

  if (allAccepted) {
    await markGoalValidationAsCompleted(instanceId);

    try {
      await deleteNotification(instanceId);
    } catch (err) {
      console.error(
        `Error deleting notification for instanceId ${instanceId}: ${err.message}`
      ); // 에러 로그
    }
  }

  return allAccepted;
};
const {
  getGoalByInstanceId,
  insertGoalValidation,
  isValidationComplete,
  saveValidationResult,
  notifyTeamMembers,
  initializeTeamValidation,
  checkForExistingValidation,
} = require('../models/goal-model');

/**
 * @function calculateLocation
 * @description 현재 위치를 저장된 목표 위치와 비교하여 인증합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {number} currentLatitude - 현재 위도
 * @param {number} currentLongitude - 현재 경도
 * @returns {Promise<boolean>} 위치가 허용 범위 내에 있는 경우 true, 그렇지 않으면 false를 반환
 * @throws {Error} 목표를 찾을 수 없는 경우 오류 발생
 */
exports.calculateLocation = async (
  instanceId,
  currentLatitude,
  currentLongitude
) => {
  const goal = await getGoalByInstanceId(instanceId);
  if (!goal) {
    throw new Error('목표가 없습니다');
  }
  if (await isValidationComplete(instanceId)) {
    throw new Error('이미 완료된 인증입니다.');
  }

  const savedLatitude = goal.latitude;
  const savedLongitude = goal.longitude;

  const distance = calculateDistance(
    savedLatitude,
    savedLongitude,
    currentLatitude,
    currentLongitude
  );

  const allowedDistance = 50; // 오차 범위 - 50미터
  if (distance <= allowedDistance) {
    // Helper function to format date as 'YYYY-MM-DD HH:MM:SS'
    function formatDateToSQLDatetime(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-indexed
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    const currentTime = formatDateToSQLDatetime(new Date());

    await insertGoalValidation(
      goal.id,
      instanceId,
      currentLatitude,
      currentLongitude,
      currentTime
    );

    return true;
  }
  return false;
};

/**
 * @function calculateDistance
 * @description 두 지점 간의 거리를 계산합니다.
 * @param {number} lat1 - 첫 번째 지점의 위도
 * @param {number} lon1 - 첫 번째 지점의 경도
 * @param {number} lat2 - 두 번째 지점의 위도
 * @param {number} lon2 - 두 번째 지점의 경도
 * @returns {number} 두 지점 간의 거리 (미터)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const toRadians = (degrees) => degrees * (Math.PI / 180);

  const earthRadius = 6371e3;

  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadius * c; // 두 지점 간의 거리 (미터)

  return distance;
};

/**
 * @function uploadPhotoAndValidate
 * @description 사진을 S3에 업로드하고 목표 인증을 처리합니다.
 * @param {Object} req - Express 요청 객체
 * @returns {Promise<string>} 업로드된 사진 URL
 * @throws {Error} 권한 에러 또는 인증 타입 에러
 */
exports.uploadPhotoAndValidate = async (req) => {
  const photoUrl = req.file.location;
  const instanceId = req.params.goalInstanceId;

  const goalInstance = await getGoalByInstanceId(instanceId);
  if (!goalInstance) {
    throw new Error('목표 정보를 찾을 수 없습니다.');
  }
  if (req.user.id !== goalInstance.user_id) {
    throw new Error('접근 권한이 없습니다. (아이디 불일치)');
  }
  if (goalInstance.validation_type !== 'photo') {
    throw new Error('사진 인증 타입이 아닙니다.');
  }

  // 중복 데이터 검사
  const existingValidation = await checkForExistingValidation(instanceId);
  if (existingValidation) {
    throw new Error('이미 인증된 요청입니다.');
  }

  await saveValidationResult(goalInstance.id, instanceId, photoUrl);

  return photoUrl;
};

const { updateGoalValidation } = require('../models/goal-model');
exports.requestTeamValidationService = async (instanceId, user) => {
  const goalInstance = await getGoalByInstanceId(instanceId);
  if (!goalInstance) {
    throw new Error('목표 정보를 찾을 수 없습니다.');
  }
  if (user.id !== goalInstance.user_id) {
    throw new Error('접근 권한이 없습니다. (아이디 불일치)');
  }
  if (goalInstance.type !== 'team') {
    throw new Error('유효한 목표 타입이 아닙니다.');
  }
  await updateGoalValidation(goalInstance);
  // 팀원 인증 초기화
  await initializeTeamValidation(instanceId, user.id);

  // 팀원들에게 알림 전송
  await notifyTeamMembers(instanceId, user);
};

// ./src/services/goal-service.js
const { getGoalsByDateRange } = require('../models/goal-model');

/**
 * @function getGoals
 * @description 주어진 날짜 범위 내의 목표를 조회하여 구조화된 데이터로 반환합니다.
 * @param {number} userId - 사용자 ID
 * @param {string} week_start - 조회 시작 날짜 (YYYY-MM-DD)
 * @param {string} week_end - 조회 종료 날짜 (YYYY-MM-DD)
 * @returns {Object} 주간 목표 데이터
 */
exports.getGoals = async (userId, week_start, week_end) => {
  const goals = await getGoalsByDateRange(userId, week_start, week_end);

  const response = {
    week_start,
    week_end,
    goals: goals.reduce((acc, goal) => {
      // UTC 날짜를 로컬 날짜로 변환
      const goalDate = new Date(goal.date);
      const localDate = new Date(
        goalDate.getTime() - goalDate.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split('T')[0]; // 로컬 날짜 문자열 추출

      if (!acc[localDate]) {
        acc[localDate] = { date: localDate, goals: [] };
      }
      acc[localDate].goals.push(goal);
      return acc;
    }, {}),
  };

  response.goals = Object.values(response.goals).sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  return response;
};

// 작성자: Minjae Han

const { getUserGoals } = require('../models/goal-model');

exports.getUserGoals = async (userId) => {
  try {
    const goals = await getUserGoals(userId);

    // 데이터 유효성 검사를 추가합니다.
    if (!Array.isArray(goals)) {
      throw new Error('목표 조회 결과가 유효하지 않습니다.');
    }

    const response = {
      userId,
      goals: goals.map((goal) => ({
        id: goal.id,
        title: goal.title,
        description: goal.description,
        startDate: goal.start_date,
        endDate: goal.end_date,
        type: goal.type,
        status: goal.status,
        latitude: goal.latitude,
        longitude: goal.longitude,
        validationType: goal.validation_type,
        emoji: goal.emoji,
        donationOrganizationId: goal.donation_organization_id,
        donationAmount: goal.donation_amount,
      })),
    };

    return response;
  } catch (error) {
    console.error('사용자 목표 조회 중 에러 발생: ', error);
    throw error;
  }
};

// 작성자: Minjae Han

const {
  createPersonalGoal,
  createTeamGoal,
  createGoalRepeat,
} = require('../models/goal-model');

exports.createGoal = async (goalData) => {
  let newGoal;
  if (goalData.type === 'team') {
    newGoal = await createTeamGoal(goalData);
  } else {
    newGoal = await createPersonalGoal(goalData);
  }

  if (goalData.repeatType) {
    await createGoalRepeat(newGoal.id, goalData);
  }

  return newGoal;
};
