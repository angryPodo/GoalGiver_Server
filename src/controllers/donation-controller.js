// 작성자: Minjae Han

const { getUserDonations } = require('../services/donation-service');
const { StatusCodes } = require('http-status-codes');

exports.getUserDonations = async (req, res) => {
  let userId; // try 블록 바깥에서 userId 변수 선언

  try {
    userId = req.user?.id; // req.user가 정의되지 않은 경우를 대비

    if (!userId) {
      console.error('기부 내역 조회 실패: 사용자 ID가 없습니다.');
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ error: '사용자 ID가 유효하지 않습니다.' });
    }

    const donations = await getUserDonations(userId);

    if (!donations || donations.length === 0) {
      console.log(`사용자 ID(${userId})의 기부 내역이 없습니다.`);
      return res
        .status(StatusCodes.OK)
        .json({ message: '기부 내역이 없습니다.', donations: [] });
    }

    res.status(StatusCodes.OK).json(donations);
  } catch (err) {
    console.error(`기부 내역 조회 API 에러 (사용자 ID: ${userId}): `, err);
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({
        error: '서버 내부 오류가 발생했습니다. 나중에 다시 시도해 주세요.',
      });
  }
};
