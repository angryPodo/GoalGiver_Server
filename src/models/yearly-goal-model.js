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

  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간(한국 시간대) 오프셋
  const now = new Date();
  const nowKST = new Date(now.getTime() + KST_OFFSET);

  try {
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];

    // D-Day 계산
    const endDate = new Date(goal.end_date);
    const timeDiff = endDate - now;
    const dDay = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // 밀리초를 일수로 변환

    // 전체 진행도 계산
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

    // 월별 진행도 계산
    const monthlyProgress = [];
    for (let month = 0; month < 12; month++) {
      const startOfMonth = new Date(nowKST.getFullYear(), month, 1);
      const endOfMonth = new Date(nowKST.getFullYear(), month + 1, 0, 23, 59, 59, 999);

      const [monthlyInstancesResult] = await db.query(
        'SELECT COUNT(*) AS total_instances FROM goal_instances WHERE goal_id = ? AND DATE(date) BETWEEN ? AND ?',
        [goalId, startOfMonth.toISOString().slice(0, 10), endOfMonth.toISOString().slice(0, 10)]
      );

      const [monthlyValidatedResult] = await db.query(
        'SELECT COUNT(*) AS validated_instances FROM goal_validation WHERE goal_id = ? AND DATE(validated_at) BETWEEN ? AND ?',
        [goalId, startOfMonth.toISOString().slice(0, 10), endOfMonth.toISOString().slice(0, 10)]
      );

      const totalMonthlyInstances = monthlyInstancesResult[0].total_instances;
      const validatedMonthlyInstances = monthlyValidatedResult[0].validated_instances;
      const monthlyPercent = totalMonthlyInstances > 0 ? (validatedMonthlyInstances / totalMonthlyInstances) * 100 : 0;

      monthlyProgress.push({
        month: `${month + 1}월`,
        completion_percent: Math.round(monthlyPercent)
      });
    }

    goal.monthly_progress = monthlyProgress;

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findGoalWithProgressById };
