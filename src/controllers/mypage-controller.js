// 작성자: Minjae Han

const { getUserProfile } = require('../services/mypage-service');
const { StatusCodes } = require('http-status-codes');

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user?.id; // req.user가 정의되지 않은 경우 대비

    if (!userId) {
      console.error('마이페이지 조회 실패: 사용자 ID가 없습니다.');
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '사용자 ID가 유효하지 않습니다.' });
    }

    const profile = await getUserProfile(userId);

    if (!profile) {
      console.error(
        `마이페이지 조회 실패: 사용자 ID(${userId})에 해당하는 프로필이 없습니다.`
      );
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: '프로필을 찾을 수 없습니다.' });
    }

    res.status(StatusCodes.OK).json(profile);
  } catch (err) {
    console.error(
      `마이페이지 조회 API 에러 (사용자 ID: ${req.user?.id}): `,
      err
    );
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: '서버 내부 오류가 발생했습니다. 나중에 다시 시도해 주세요.',
    });
  }
};
