const db = require('../../config/database.js');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const findGoalWithProgressById = async (goalId, userId) => {
  const goalQuery = `
    SELECT
      g.id as goal_id, 
      g.title,
      g.start_date, 
      g.end_date, 
      g.emoji,
      d.name as donation_organization,
      g.donation_amount as donation_point
    FROM goals g
    LEFT JOIN donation_organizations d ON g.donation_organization_id = d.id
    WHERE g.id = ? AND g.user_id = ? AND g.status = 'ongoing';
  `;

  // 한국 시간대로 현재 날짜와 시간 계산
  const now = new Date();
  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간(한국 시간대) 오프셋
  const nowKST = new Date(now.getTime() + KST_OFFSET);

  // 일요일부터 토요일까지 한 주의 시작일과 종료일을 계산
  const startOfWeek = new Date(nowKST);
  startOfWeek.setDate(nowKST.getDate() - nowKST.getDay()); // 일요일로 설정
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // 토요일로 설정
  endOfWeek.setHours(23, 59, 59, 999);

  const validationQuery = `
    SELECT
      gv.validated_at as date
    FROM goal_validation gv
    WHERE gv.goal_id = ?
      AND gv.validated_at BETWEEN ? AND ?
  `;

  try {
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);
    const [validationResult] = await db.query(validationQuery, [goalId, startOfWeek.toISOString(), endOfWeek.toISOString()]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];

    // D-Day 계산
    const endDate = new Date(goal.end_date);
    const timeDiff = endDate - now;
    const dDay = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // 밀리초를 일수로 변환

    // progress_percent 계산
    const [totalValidationResult] = await db.query(
      'SELECT COUNT(*) AS validated_instances FROM goal_validation WHERE goal_id = ?',
      [goalId]
    );
    const [totalInstancesResult] = await db.query(
      'SELECT COUNT(*) AS total_instances FROM goal_instances WHERE goal_id = ?',
      [goalId]
    );

    const totalInstances = totalInstancesResult[0].total_instances;
    const validatedInstances = totalValidationResult[0].validated_instances;
    const progressPercent = totalInstances > 0 ? (validatedInstances / totalInstances) * 100 : 0;

    goal.progress_percent = Math.round(progressPercent);


    // 날짜를 한국 시간 기준으로 변환
    goal.start_date = new Date(new Date(goal.start_date).getTime() + KST_OFFSET).toISOString();
    goal.end_date = new Date(new Date(goal.end_date).getTime() + KST_OFFSET).toISOString();
    goal.d_day = `D - ${dDay}`;
    goal.progress = validationResult.map(entry => {
      const kstDate = new Date(new Date(entry.date).getTime() + KST_OFFSET);
      return { ...entry, date: kstDate.toISOString() };
    });

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findGoalWithProgressById };
