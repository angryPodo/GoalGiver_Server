const pool = require('../../config/database');

/**
 * @function isValidationComplete
 * @description 특정 목표 인스턴스의 인증이 완료되었는지 확인합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {number} userId - 목표 인스턴스 ID
 * @returns {Promise<boolean>} 인증 완료 여부
 */
exports.isValidationComplete = async (instanceId, userId) => {
  const query =
    'select is_accepted from Team_Validation where validation_id = (select id from Goal_Validation where Goal_Instance_id = ?) and user_id = ?';
  try {
    const [rows] = await pool.execute(query, [instanceId, userId]);
    console.log(rows.length);
    return rows.length > 0 && rows[0].is_accepted;
  } catch (err) {
    console.error(err);
  }
};
/**
 * @function updateTeamValidation
 * @description 팀 목표의 인증 수락 상태를 업데이트합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {number} userId - 사용자 ID
 * @returns {Promise<void>}
 */
exports.updateTeamValidation = async (instanceId, userId) => {
  const query =
    'update Team_Validation set is_accepted = true, accepted_at = now() where validation_id = (select id from Goal_Validation where goal_instance_id = ?) and user_id = ?';
  await pool.execute(query, [instanceId, userId]);
};

/**
 * @function areAllTeamMembersAccepted
 * @description 모든 팀원이 인증을 수락했는지 확인합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @returns {Promise<boolean>} 모든 팀원이 수락했는지 여부
 */
exports.areAllTeamMembersAccepted = async (instanceId) => {
  const query =
    'select count(*) as total, sum(is_accepted) as accepted from Team_Validation where validation_id = (select id from Goal_Validation where goal_instance_id = ?)';
  const [rows] = await pool.execute(query, [instanceId]);

  return rows[0].total === Number(rows[0].accepted);
};

/**
 * @function markGoalValidationAsCompleted
 * @description 목표 인스턴스를 완료 상태로 마크합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @returns {Promise<void>}
 */
exports.markGoalValidationAsCompleted = async (instanceId) => {
  const query =
    'update Goal_Validation set validated_at = now() where goal_instance_id = ?';
  await pool.execute(query, [instanceId]);
};

/**
 * @function deleteNotificationByInstanceId
 * @description 특정 목표 인스턴스 ID와 관련된 알림을 삭제합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @returns {Promise<void>}
 */
exports.deleteNotification = async (instanceId) => {
  const query = `
  DELETE FROM Notifications 
  WHERE JSON_EXTRACT(content, '$.goal.instance_id') = CAST(? AS JSON)
`;

  try {
    await pool.execute(query, [instanceId]);
  } catch (error) {
    console.error('Error deleting notification:', error); // 에러 로그
    throw error;
  }
};
/**
 * @function getGoalByInstanceId
 * @description 인스턴스 ID로 목표 정보를 조회합니다.
 * @param {number} instanceId - 조회할 목표 인스턴스 ID
 * @returns {Promise<Object>} 목표 정보 객체
 * @throws {Error} 데이터베이스 조회 에러
 */
exports.getGoalByInstanceId = async (instanceId) => {
  const query =
    'SELECT g.*, gi.id as instance_id FROM Goals g JOIN Goal_Instances gi ON g.id = gi.goal_id WHERE gi.id = ?';
  const [rows] = await pool.execute(query, [instanceId]);

  if (rows.length === 0) {
    throw new Error('해당 목표를 찾을 수 없습니다.');
  }
  console.log(rows[0]);
  return rows[0];
};

/**
 * @function saveValidationResult
 * @description 목표 인증 결과를 저장합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {string} photoUrl - 인증 사진 URL
 */
exports.saveValidationResult = async (goalId, instanceId, photoUrl) => {
  const query =
    'insert into Goal_Validation (goal_id, goal_instance_id, validated_at, validation_data) values(?, ?, now(), ?)';
  await pool.execute(query, [goalId, instanceId, photoUrl]);
};

/**
 * @function notifyTeamMembers
 * @description 팀 목표 인증 요청을 팀원들에게 알립니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {Object} user - 요청한 사용자 정보
 */
exports.notifyTeamMembers = async (instanceId, user) => {
  const query =
    'SELECT user_id FROM Team_Members WHERE team_goal_id = (select id from Team_Goals where goal_id = (select goal_id from Goal_Instances where id = ?))';
  const [members] = await pool.query(query, [instanceId]);

  const goal = await this.getGoalByInstanceId(instanceId);
  const requesterName = user.nickname;

  for (const member of members) {
    if (member.user_id !== user.id) {
      const content = JSON.stringify({
        sender_id: user.id, // 알림 전송자 id 추가
        message: `${requesterName}님께서 '${goal.title}' 인증을 요청을 보냈습니다.`,
        goal: {
          goal_id: goal.id,
          instance_id: goal.instance_id,
          title: goal.title,
        },
      });
      const checkQuery = `SELECT COUNT(*) AS count FROM Notifications WHERE user_id = ?
                              AND JSON_EXTRACT(content, '$.goal.instance_id') = CAST(? AS JSON)`;
      const [existingNotifications] = await pool.execute(checkQuery, [
        member.user_id,
        instanceId,
      ]);

      if (existingNotifications[0].count > 0) {
        throw new Error('중복된 알림이 이미 존재합니다.');
      }
      try {
        const query =
          'INSERT INTO Notifications (user_id, content) VALUES (?, ?)';
        await pool.query(query, [member.user_id, content]);
      } catch (error) {
        console.error('Error inserting notification:', error); // 에러 로그
      }
    }
  }
};

/**
 * @function initializeTeamValidation
 * @description 팀 목표의 인증을 초기화하고 팀원 정보를 삽입합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {number} requesterId - 요청자의 사용자 ID
 */
exports.initializeTeamValidation = async (instanceId, requesterId) => {
  console.log(instanceId, requesterId);
  const query =
    'SELECT user_id FROM Team_Members WHERE team_goal_id = (select id from Team_Goals where goal_id = (select goal_id from Goal_Instances where id = ?))';
  // 팀원 정보를 가져옵니다.
  const [members] = await pool.query(query, [instanceId]);
  console.log(members);

  // 팀원 정보가 없을 경우 오류를 반환합니다.
  if (members.length === 0) {
    throw new Error('팀원 정보를 찾을 수 없습니다.');
  }

  // 각 팀원에 대해 team_validation에 기본값을 삽입합니다.
  for (const member of members) {
    if (member.user_id !== requesterId) {
      const query =
        'INSERT INTO Team_Validation (validation_id, user_id, sender_id) VALUES ((SELECT id FROM Goal_Validation WHERE goal_instance_id = ?), ?, ?)';
      await pool.query(query, [instanceId, member.user_id, requesterId]); // sender_id 값도 삽입하게끔 쿼리문 변경
      console.log('여기까진 완료');
    }
  }
};

/**
 * @function checkForExistingValidation
 * @description 중복 인증 데이터를 확인합니다.
 * @param {number} instanceId - 목표 인스턴스 ID
 * @returns {Promise<boolean>} 중복 여부
 */
exports.checkForExistingValidation = async (instanceId) => {
  const query =
    'SELECT COUNT(*) as count FROM Goal_Validation WHERE goal_instance_id = ? AND validated_at IS NOT NULL';
  const [rows] = await pool.execute(query, [instanceId]);

  return rows[0].count > 0; // 중복이 있으면 true, 없으면 false
};

/**
 * @function getGoalsByDateRange
 * @description 특정 날짜 범위 내의 목표 인스턴스를 조회합니다.
 * @param {string} week_start - 조회 시작 날짜 (YYYY-MM-DD)
 * @param {string} week_end - 조회 종료 날짜 (YYYY-MM-DD)
 * @returns {Promise<Array>} 목표 인스턴스 배열
 * @throws {Error} 데이터베이스 조회 에러
 */

exports.getGoalsByDateRange = async (userId, week_start, week_end) => {
  const query = `
    SELECT g.id as goal_id, gi.id as goal_instance_id, title, description, start_date, end_date, type, status,
    latitude, longitude, validation_type, emoji, donation_organization_id, donation_amount, gi.date
    FROM Goals g
    JOIN Goal_Instances gi ON g.id = gi.goal_id
    WHERE g.user_id = ? AND gi.date >= ? AND gi.date <= ?
  `;

  try {
    const [rows] = await pool.execute(query, [userId, week_start, week_end]);
    return rows;
  } catch (err) {
    console.error('날짜 범위에 따른 에러: ', err);
    throw err;
  }
};

// 사용자 목표 조회 함수
exports.getUserGoals = async (userId) => {
  const query = `
    SELECT g.id, g.title, g.description, g.start_date, g.end_date, g.type, g.status,
          g.latitude, g.longitude, g.validation_type, g.emoji,
          g.donation_organization_id, g.donation_amount
    FROM Goals g
    WHERE g.user_id = ?
  `;

  try {
    const [rows] = await pool.execute(query, [userId]);
    return rows;
  } catch (err) {
    console.error('사용자 목표 조회 중 에러 발생: ', err);
    throw err;
  }
};

async function createGoalInstances(goalId, startDate, endDate, repeatData) {
  try {
    const instances = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // 한글 요일을 영문 약어로 변환하는 맵핑
    const dayMapping = {
      월: 'mon',
      화: 'tue',
      수: 'wed',
      목: 'thu',
      금: 'fri',
      토: 'sat',
      일: 'sun',
    };

    // daysOfWeek가 문자열로 전달된 경우, 이를 배열로 변환하고 영문 약어로 변환
    const daysOfWeek = (repeatData.daysOfWeek || '')
      .split(',')
      .map((day) => day.trim()) // 공백 제거
      .map((day) => dayMapping[day]); // 한글 요일을 영문 약어로 변환

    if (repeatData.repeatType === 'daily') {
      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + (repeatData.intervalOfDays || 1))
      ) {
        instances.push([goalId, date.toISOString().split('T')[0]]);
      }
    } else if (repeatData.repeatType === 'weekly') {
      for (
        let date = new Date(start);
        date <= end;
        date.setDate(date.getDate() + 1)
      ) {
        if (
          daysOfWeek.includes(
            date.toLocaleString('en', { weekday: 'short' }).toLowerCase()
          )
        ) {
          instances.push([goalId, date.toISOString().split('T')[0]]);
        }
      }
    } else if (repeatData.repeatType === 'monthly') {
      for (
        let date = new Date(start);
        date <= end;
        date.setMonth(date.getMonth() + 1)
      ) {
        date.setDate(repeatData.dayOfMonth || date.getDate());
        instances.push([goalId, date.toISOString().split('T')[0]]);
      }
    }

    if (instances.length > 0) {
      const query = 'INSERT INTO Goal_Instances (goal_id, date) VALUES ?';
      await pool.query(query, [instances]);
    }
  } catch (error) {
    if (error.code === 'ER_LOCK_WAIT_TIMEOUT') {
      console.error('Lock wait timeout occurred. Retrying transaction...');
      return await createGoalInstances(goalId, startDate, endDate, repeatData);
    }
    throw error;
  }
}
// 개인 목표 생성 함수
exports.createPersonalGoal = async (goalData) => {
  const query = `
    INSERT INTO Goals (user_id, title, description, start_date, end_date, type, validation_type, latitude, longitude, emoji, donation_organization_id, donation_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    goalData.userId,
    goalData.title,
    goalData.description,
    goalData.startDate,
    goalData.endDate,
    goalData.type,
    goalData.validationType,
    goalData.latitude || null, // 여기서 goalData.latitude가 null이 아니면 그 값을 사용하고, null이면 null로 처리
    goalData.longitude || null, // 마찬가지로 goalData.longitude의 기본값 처리
    goalData.emoji || '', // 이모지 기본값을 빈 문자열로 처리
    goalData.donationOrganizationId || null, // 기부 기관 ID가 없으면 null로 처리
    goalData.donationAmount || 0, // 기부 금액이 없으면 0으로 처리
  ];

  const [result] = await pool.execute(query, values);

  if (goalData.repeatType) {
    await createGoalInstances(
      result.insertId,
      goalData.startDate,
      goalData.endDate,
      goalData
    );
  }

  return { id: result.insertId, ...goalData };
};

// 팀 목표 생성 함수
exports.createTeamGoal = async (goalData) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Goals 테이블에 목표 정보 삽입
    const [goalResult] = await connection.execute(
      `
      INSERT INTO Goals (user_id, title, description, start_date, end_date, type, validation_type, latitude, longitude, emoji, donation_organization_id, donation_amount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        goalData.userId,
        goalData.title,
        goalData.description,
        goalData.startDate,
        goalData.endDate,
        goalData.type,
        goalData.validationType,
        goalData.latitude || null, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
        goalData.longitude || null, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
        goalData.emoji || '', // 기본값 처리를 통해 올바른 값이 들어가도록 수정
        goalData.donationOrganizationId || null, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
        goalData.donationAmount || 0, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
      ]
    );

    const goalId = goalResult.insertId;

    // Team_Goals 테이블에 추가 정보 삽입
    const [teamGoalResult] = await connection.execute(
      `
      INSERT INTO Team_Goals (goal_id, time_attack, start_time, end_time)
      VALUES (?, ?, ?, ?)
    `,
      [
        goalId,
        goalData.timeAttack || false, // 기본값을 false로 설정
        goalData.startTime || null, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
        goalData.endTime || null, // 기본값 처리를 통해 올바른 값이 들어가도록 수정
      ]
    );

    // Team_Members 테이블에 팀원 정보 삽입
    for (const memberId of goalData.teamMemberIds) {
      await connection.execute(
        `
        INSERT INTO Team_Members (team_goal_id, user_id)
        VALUES (?, ?)
      `,
        [teamGoalResult.insertId, memberId]
      );
    }

    await connection.commit();

    // 트랜잭션 외부에서 인스턴스 생성
    if (goalData.repeatType) {
      await createGoalInstances(
        goalId,
        goalData.startDate,
        goalData.endDate,
        goalData
      );
    }

    return { id: goalId, ...goalData };
  } catch (err) {
    await connection.rollback();
    console.error('팀 목표 생성 중 에러 발생: ', err);
    throw err;
  } finally {
    connection.release();
  }
};

// 목표 반복 생성 함수
exports.createGoalRepeat = async (goalId, repeatData) => {
  const query = `
    INSERT INTO Goal_Repeats (goal_id, repeat_type, days_of_week, day_of_month, interval_of_days)
    VALUES (?, ?, ?, ?, ?)
  `;

  // daysOfWeek가 문자열로 전달될 경우 배열로 변환
  const daysOfWeekArray = Array.isArray(repeatData.daysOfWeek)
    ? repeatData.daysOfWeek
    : repeatData.daysOfWeek.split(',').map((day) => day.trim());

  const values = [
    goalId,
    repeatData.repeatType,
    daysOfWeekArray.length > 0 ? daysOfWeekArray.join(',') : null,
    repeatData.dayOfMonth || null,
    repeatData.intervalOfDays || null,
  ];

  await pool.execute(query, values);
};
/**
 * @function getGoalByInstanceId
 * @description 인스턴스 ID로 목표 정보를 조회합니다.
 * @param {number} instanceId - 조회할 목표 인스턴스 ID
 * @returns {Promise<Object>} 목표 정보 객체
 * @throws {Error} 데이터베이스 조회 에러
 */
exports.getGoalByInstanceId = async (instanceId) => {
  const [rows] = await pool.query(
    'SELECT g.*, gi.id as instance_id FROM Goals g JOIN Goal_Instances gi ON g.id = gi.goal_id WHERE gi.id = ?',
    [instanceId]
  );

  if (rows.length === 0) {
    throw new Error('해당 목표를 찾을 수 없습니다.');
  }
  console.log(rows[0]);
  return rows[0];
};

exports.isValidationComplete = async (instanceId) => {
  const query =
    'select 1 from Goal_Validation where goal_instance_id = ? and validated_at is not null';
  const [rows] = await pool.execute(query, [instanceId]);

  return rows.length > 0;
};

/**
 * @function insertGoalValidation
 * @description 새로운 목표 인증 레코드를 삽입합니다.
 * @param {number} goalId - 목표 ID
 * @param {number} instanceId - 목표 인스턴스 ID
 * @param {number} latitude - 인증된 위도
 * @param {number} longitude - 인증된 경도
 * @returns {Promise<void>}
 */
exports.insertGoalValidation = async (
  goalId,
  instance_id,
  latitude,
  longitude,
  validatedAt
) => {
  await pool.query(
    'insert into Goal_Validation (goal_id, goal_instance_id, validated_at, validation_data) values (?, ?, ?, ?)',
    [goalId, instance_id, validatedAt, JSON.stringify({ latitude, longitude })]
  );
};

exports.updateGoalValidation = async (goalInstance) => {
  const query =
    'insert into Goal_Validation (goal_id, goal_instance_id) values (?, ?)';
  await pool.execute(query, [goalInstance.id, goalInstance.instance_id]);
};

exports.getPoint = async (userId) => {
  console.log(userId);
  const query = 'SELECT points from Users where id = ?';
  const [rows] = await pool.execute(query, [userId]);
  console.log(rows[0].points);
  return rows[0].points;
};
