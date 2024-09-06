//팀 목표 인증내역
const db = require('../../config/database.js');

//팀 목표 인증내역
const findTeamGoalTimeAttackById = async (goalId, userId) => {
  const goalQuery = `
    SELECT
      g.id as goal_id, 
      g.title,
      g.start_date, 
      g.end_date, 
      g.emoji,
      d.name as donation_organization,
      g.donation_amount as donation_point,
      tg.start_time,  -- team_goals의 start_time
      tg.end_time     -- team_goals의 end_time
    FROM goals g
    LEFT JOIN donation_organizations d ON g.donation_organization_id = d.id
    LEFT JOIN team_goals tg ON g.id = tg.goal_id
    WHERE g.id = ? AND g.user_id = ? AND g.status = 'ongoing';
  `;

  const KST_OFFSET = 9 * 60 * 60 * 1000; // 한국 표준시 오프셋

  try {
    // Goal 정보를 가져옴
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];

    // remaining_time 계산
    const today = new Date().toISOString().split('T')[0]; // 현재 날짜 (YYYY-MM-DD)
    const startTime = new Date(`${today}T${goal.start_time}`);
    const endTime = new Date(`${today}T${goal.end_time}`);

    const remainingTime = endTime - startTime; // 종료 시간에서 시작 시간을 뺌
    const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    goal.remaining_time = `${remainingHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    // 팀 검증된 날짜 조회
    // 팀 목표에서 내 인증 내역을 가져오는 것으로
    const validationQuery = `
      SELECT tv.accepted_at 
      FROM Team_Validation tv
      JOIN Goal_Validation gv ON tv.validation_id = gv.id
      WHERE gv.goal_id = ? AND tv.user_id = ? AND tv.is_accepted = TRUE;
    `;

    const [teamValidationResult] = await db.query(validationQuery, [goalId, userId]);

    // 인증된 날짜가 존재하는 경우 진행률 100%로 설정
    goal.my_progress_percent = teamValidationResult.length > 0 ? 100 : 0;

    // 인증된 날짜를 추가
    // 내가 인증받은 날짜
    goal.validation_history = teamValidationResult.map(validation => {
      // 날짜를 한국 시간 기준으로 변환
      const validatedDateKST = new Date(new Date(validation.accepted_at).getTime() + KST_OFFSET);
      const dateOnly = validatedDateKST.toISOString().split('T')[0]; // YYYY-MM-DD 형식으로 변환
      return { date: dateOnly };
    });

    // 시작일과 종료일을 한국 시간 기준으로 변환
    goal.start_date = new Date(new Date(goal.start_date).getTime() + KST_OFFSET).toISOString();
    goal.end_date = new Date(new Date(goal.end_date).getTime() + KST_OFFSET).toISOString();

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findTeamGoalTimeAttackById };
