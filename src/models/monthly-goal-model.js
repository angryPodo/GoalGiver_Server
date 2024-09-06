const db = require('../../config/database.js');

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

  try {
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];
    const startDate = new Date(goal.start_date);
    const endDate = new Date(goal.end_date);

    // 한국 시간으로 변환
    const KST_OFFSET = 9 * 60 * 60 * 1000; // 9시간
    const kstStartDate = new Date(startDate.getTime() + KST_OFFSET);
    const kstEndDate = new Date(endDate.getTime() + KST_OFFSET);

    // 시작일과 종료일을 자정으로 설정
    kstStartDate.setHours(0, 0, 0, 0);
    kstEndDate.setHours(0, 0, 0, 0);
    kstEndDate.setDate(kstEndDate.getDate() + 1); // 종료일을 다음 날 자정으로 설정

    const weeks = [];
    const currentMonth = kstStartDate.getMonth(); // 현재 목표의 시작 월
    const currentStart = new Date(kstStartDate);

    // 각 월의 시작일 설정
    const monthStartDays = [7, 4, 3, 7, 5, 2, 7, 4, 1, 29, 27, 1];
    const firstWeekStart = new Date(kstStartDate.getFullYear(), currentMonth, monthStartDays[currentMonth]);


    if (currentMonth === 9) { // 10월
      firstWeekStart.setDate(29);
    }
    if (currentMonth === 10) { // 11월
      firstWeekStart.setDate(27);
    }

    // 해당 월의 주차별로 주를 구분 (월요일 기준)
    while (currentStart.getMonth() === currentMonth || (currentMonth === 9 && currentStart.getMonth() === 8 && currentStart.getDate() >= 29)) {
      const weekStart = new Date(currentStart);
      const dayOfWeek = weekStart.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

      // 첫 주는 설정된 시작일로 조정
      if (weeks.length === 0) {
        weekStart.setDate(firstWeekStart.getDate());
      } else {
        weekStart.setDate(weekStart.getDate() - dayOfWeek + 1); // 이후 주는 월요일로 조정
      }

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // 주의 끝 (일요일)

      weeks.push({ start: weekStart, end: weekEnd > kstEndDate ? kstEndDate : weekEnd });
      currentStart.setDate(currentStart.getDate() + 7); // 다음 주로 이동

      // 4주까지만 추가
      if (weeks.length >= 4) {
        break;
      }
    }

    const weeklyProgress = [];

    for (let i = 0; i < weeks.length; i++) {
      const week = weeks[i];

      // 이번 주에 해당되는 goal_instance의 날짜 개수 구하기
      const [instanceCountResult] = await db.query(
        'SELECT COUNT(DISTINCT date) AS instance_count FROM goal_instances WHERE goal_id = ? AND date BETWEEN ? AND ?',
        [goalId, week.start.toISOString().split('T')[0], week.end.toISOString().split('T')[0]]
      );

      const requiredValidationDays = instanceCountResult[0].instance_count;

      // 이번 주에 인증된 날짜 개수 구하기
      const [validationResult] = await db.query(
        'SELECT COUNT(DISTINCT DATE(validated_at)) AS validated_days FROM goal_validation WHERE goal_id = ? AND DATE(validated_at) BETWEEN ? AND ?',
        [goalId, week.start.toISOString().split('T')[0], week.end.toISOString().split('T')[0]]
      );

      const validatedDays = validationResult[0].validated_days;

      // 주별 완료 퍼센트 계산
      const completionPercent = requiredValidationDays > 0 ? (validatedDays / requiredValidationDays) * 100 : 0;

      weeklyProgress.push({
        week: `${i + 1}주`,
        completion_percent: Math.round(completionPercent)
      });
    }

    // 주차가 4주 미만인 경우에는 빈 주차 추가
    for (let i = weeklyProgress.length; i < 4; i++) {
      weeklyProgress.push({
        week: `${i + 1}주`,
        start_date: null,
        end_date: null,
        completion_percent: 0
      });
    }

    goal.weekly_progress = weeklyProgress;

    // D-Day 계산
    const timeDiff = kstEndDate - new Date(new Date().getTime() + KST_OFFSET);
    const dDay = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
    goal.d_day = `D - ${dDay}`;

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

    // 변환된 날짜를 ISO 형식으로 설정
    goal.start_date = new Date(new Date(goal.start_date).getTime() + KST_OFFSET).toISOString();
    goal.end_date = new Date(new Date(goal.end_date).getTime() + KST_OFFSET).toISOString();

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findGoalWithProgressById };
