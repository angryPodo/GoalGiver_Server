const db = require('../../config/database.js');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
const findvalidationById = async (goalId, userId) => {
  const goalQuery = `
    SELECT
      g.id as goal_id, 
      g.title,
      g.start_date, 
      g.end_date, 
      g.emoji,
      d.name as donation_organization,
      g.donation_amount as donation_point,
      g.validation_type
    FROM goals g
    LEFT JOIN donation_organizations d ON g.donation_organization_id = d.id
    WHERE g.id = ? AND g.user_id = ? AND g.status = 'ongoing';
  `;

  // 한국 시간대로 현재 날짜와 시간 계산
  const now = new Date();
  const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간(한국 시간대) 오프셋

  try {
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (!goalResult || goalResult.length === 0) {
      throw new Error('Goal not found or no ongoing goals for this user.');
    }

    const goal = goalResult[0];

    // D-Day 계산
    const endDate = new Date(goal.end_date);
    const timeDiff = endDate - now;
    const dDay = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // 밀리초를 일수로 변환

    // progress_percent 계산 및 validation_history 추가
    let progressPercent = 0;
    let validationHistory = [];

    if (goal.validation_type === 'photo') {
      const [validatedInstancesResult] = await db.query(
        `SELECT 
          DATE(validated_at) AS date, 
          validation_data AS photo_url 
         FROM goal_validation 
         WHERE goal_id = ? 
         AND validation_data IS NOT NULL
         ORDER BY validated_at ASC`,
        [goalId]
      );

      validationHistory = validatedInstancesResult.map(row => ({
        date: new Date(new Date(row.date).getTime() + KST_OFFSET).toISOString().split('T')[0],
        photo_url: row.photo_url
      }));

      const [totalInstancesResult] = await db.query(
        'SELECT COUNT(*) AS total_instances FROM goal_instances WHERE goal_id = ?',
        [goalId]
      );

      const totalInstances = totalInstancesResult[0].total_instances;
      const validatedInstances = validatedInstancesResult.length;

      if (totalInstances > 0) {
        progressPercent = (validatedInstances / totalInstances) * 100;
      }
    }

    goal.progress_percent = Math.round(progressPercent);

    // 날짜를 한국 시간 기준으로 변환
    goal.start_date = new Date(new Date(goal.start_date).getTime() + KST_OFFSET).toISOString().split('T')[0];
    goal.end_date = new Date(new Date(goal.end_date).getTime() + KST_OFFSET).toISOString().split('T')[0];
    goal.d_day = `D - ${dDay}`;

    // validation_history를 goal 객체에 추가
    goal.validation_history = validationHistory;

    // 결과 객체 반환
    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findvalidationById };
