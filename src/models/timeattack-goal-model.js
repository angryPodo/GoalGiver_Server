const db = require('../../config/database.js');

// 목표 ID와 사용자 ID로 목표와 진행 상황을 조회
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
    const [goalResult] = await db.query(goalQuery, [goalId, userId]);

    if (goalResult.length === 0) {
      throw new Error('Goal not found');
    }

    const goal = goalResult[0];

    // remaining_time 계산
    const today = new Date().toISOString().split('T')[0]; // 현재 날짜 (YYYY-MM-DD)

    const startTime = new Date(`${today}T${goal.start_time}`);
    const endTime = new Date(`${today}T${goal.end_time}`);
    //console.log('start_time:', startTime);
    //console.log('end_time:', endTime);

    const remainingTime = endTime - startTime; // 종료 시간에서 시작 시간을 뺌
    const remainingHours = Math.floor(remainingTime / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));
    const remainingSeconds = Math.floor((remainingTime % (1000 * 60)) / 1000);

    goal.remaining_time = `${remainingHours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    goal.remaining_time = `${remainingHours}:${remainingMinutes}:${remainingSeconds}`;

    // progress_percent 계산
    const [teamValidationResult] = await db.query(
      'SELECT is_accepted FROM Team_Validation WHERE validation_id IN (SELECT id FROM Goal_Validation WHERE goal_id = ?)',
      [goalId]
    );

    // 팀 검증의 경우, is_accepted가 true인 경우 100%, false인 경우 0%
    const isAccepted = teamValidationResult.length > 0 && teamValidationResult.every(validation => validation.is_accepted);
    goal.my_progress_percent = isAccepted ? 100 : 0;


    // 팀 멤버 진행 상황 및 팀의 기본 포인트 조회
    const teamQuery = `
      SELECT
        u.nickname as member_name,
        tm.user_id
      FROM team_members tm
      JOIN users u ON tm.user_id = u.id
      JOIN team_goals tg ON tm.team_goal_id = tg.id
      WHERE tg.goal_id = ?
    `;

    const [teamMembers] = await db.query(teamQuery, [goalId]);

    // 각 팀 멤버의 진행도 계산
    const teamProgress = {
      members: await Promise.all(teamMembers.map(async member => {
        const [teamValidationResult] = await db.query(
          'SELECT is_accepted FROM Team_Validation WHERE validation_id IN (SELECT id FROM Goal_Validation WHERE goal_id = ? AND user_id = ?)',
          [goalId, member.user_id]
        );

        // 팀 검증의 경우, is_accepted가 true인 경우 100%, false인 경우 0%
        const isAccepted = teamValidationResult.length > 0 && teamValidationResult.every(validation => validation.is_accepted);
        const memberProgressPercent = isAccepted ? 100 : 0;

        return {
          member_name: member.member_name,
          member_progress_percent: memberProgressPercent,
          member_donation_point: goal.donation_point // 목표 설정 시 지정된 포인트로 설정
        };
      }))
    };

    goal.team_progress = teamProgress;

    // 날짜를 한국 시간 기준으로 변환
    goal.start_date = new Date(new Date(goal.start_date).getTime() + KST_OFFSET).toISOString();
    goal.end_date = new Date(new Date(goal.end_date).getTime() + KST_OFFSET).toISOString();

    return goal;
  } catch (error) {
    console.error('Error fetching goal with progress:', error);
    throw error;
  }
};

module.exports = { findTeamGoalTimeAttackById };
