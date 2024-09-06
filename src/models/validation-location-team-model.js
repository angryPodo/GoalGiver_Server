const db = require('../../config/database.js');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const findValidationById = async (goalId, userId) => {
  const goalQuery = `
    SELECT
      g.id as goal_id, 
      g.title,
      g.start_date, 
      g.end_date, 
      g.emoji,
      g.type,
      g.validation_type,
      d.name as donation_organization,
      g.donation_amount as donation_point
    FROM Goals g
    LEFT JOIN Donation_Organizations d ON g.donation_organization_id = d.id
    WHERE g.id = ? AND g.user_id = ? AND g.status = 'ongoing';
  `;

  // 한국 시간대로 현재 날짜와 시간 계산
  const now = new Date();
  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간(한국 시간대) 오프셋

  try {
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];
    let validationQuery;

    // Progress percent 계산
    if (goal.type === 'personal') {
      // 검증된 인스턴스 수와 총 인스턴스 수를 동시에 조회
      const [progressResult] = await db.query(
        `
  SELECT 
    (SELECT COUNT(*) FROM Goal_Validation WHERE goal_id = ?) AS validated_instances,
    (SELECT COUNT(*) FROM Goal_Instances WHERE goal_id = ?) AS total_instances
`,
        [goalId, goalId]
      );

      const validatedInstances = progressResult[0].validated_instances;
      const totalInstances = progressResult[0].total_instances;
      const progressPercent =
        totalInstances > 0 ? (validatedInstances / totalInstances) * 100 : 0;

      goal.progress_percent = Math.round(progressPercent);
    } else if (goal.type === 'team') {
      const [teamValidationResult] = await db.query(
        'SELECT is_accepted FROM Team_Validation WHERE validation_id IN (SELECT id FROM Goal_Validation WHERE goal_id = ?)',
        [goalId]
      );

      // 팀 검증의 경우, is_accepted가 true인 경우 100%, false인 경우 0%
      const isAccepted =
        teamValidationResult.length > 0 &&
        teamValidationResult.every((validation) => validation.is_accepted);
      goal.progress_percent = isAccepted ? 100 : 0;
    }

    // goal의 validation_type과 type에 따라 다른 validation 쿼리를 설정
    if (goal.validation_type === 'location') {
      if (goal.type === 'personal') {
        validationQuery = `
          SELECT
            gv.validated_at as date
          FROM Goal_Validation gv
          WHERE gv.goal_id = ?
            AND gv.validated_at BETWEEN ? AND ?
        `;
      } else if (goal.type === 'team') {
        validationQuery = `
          SELECT
            tv.accepted_at as date
          FROM Team_Validation tv
          WHERE tv.validation_id IN (
            SELECT id FROM Goal_Validation WHERE goal_id = ?
          )
            AND tv.accepted_at BETWEEN ? AND ?
            AND tv.is_accepted = TRUE
        `;
      } else {
        throw new Error('Invalid goal type');
      }
    } else if (goal.validation_type === 'team') {
      validationQuery = `
        SELECT
          tv.accepted_at as date
        FROM Team_Validation tv
        WHERE tv.validation_id IN (
          SELECT id FROM Goal_Validation WHERE goal_id = ?
        )
          AND tv.accepted_at BETWEEN ? AND ?
          AND tv.is_accepted = TRUE
      `;
    } else {
      throw new Error('Invalid validation type');
    }

    // 인증 내역 조회 시 기간을 목표 시작 날짜부터 종료 날짜까지로 설정
    const [validationResult] = await db.query(validationQuery, [
      goalId,
      goal.start_date,
      goal.end_date,
    ]);

    // D-Day 계산
    const endDate = new Date(goal.end_date);
    const timeDiff = endDate - now;
    const dDay = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // 밀리초를 일수로 변환

    // 날짜를 한국 시간 기준으로 변환
    goal.start_date = new Date(
      new Date(goal.start_date).getTime() + KST_OFFSET
    ).toISOString();
    goal.end_date = new Date(
      new Date(goal.end_date).getTime() + KST_OFFSET
    ).toISOString();
    goal.d_day = `D - ${dDay}`;
    goal.progress = validationResult.map((entry) => {
      const kstDate = new Date(new Date(entry.date).getTime() + KST_OFFSET);
      return { ...entry, date: kstDate.toISOString() };
    });

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findValidationById };
