const axios = require('axios');
const { findUserByKakaoId } = require('../models/user-model'); // 유저 모델에서 가져옴

const kakaoAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 필요합니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 카카오 API를 이용해 사용자 정보 가져오기
    const kakaoResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const kakaoUserInfo = kakaoResponse.data;
    const kakaoId = kakaoUserInfo.id;

    // 데이터베이스에서 kakaoId를 이용해 사용자 검색
    const user = await findUserByKakaoId(kakaoId);

    if (!user) {
      return res.status(404).json({ error: '사용자가 존재하지 않습니다.' });
    }

    // 사용자 정보를 req.user에 할당
    req.user = {
      id: user.id, // 데이터베이스의 사용자 ID
      kakaoId: kakaoUserInfo.id,
      nickname: user.nickname,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error('카카오 사용자 정보 요청 실패: ', err);
    return res.status(401).json({ error: '유효하지 않은 카카오 토큰입니다.' });
  }
};

module.exports = kakaoAuthMiddleware;
