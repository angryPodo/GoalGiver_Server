const axios = require('axios');
const {
  findUserByKakaoId,
  createUser,
  updateUserTokens,
  deleteUserByKakaoId,
  findUserByNickname,
  updateUserNickname,
} = require('../models/user-model');
require('dotenv').config();

// 카카오 로그인 URL 생성
const kakaoLogin = () => {
  const kakaoAuthURL = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.KAKAO_CLIENT_ID}&redirect_uri=${process.env.KAKAO_REDIRECT_URI}`;
  return kakaoAuthURL;
};

// 클라이언트에서 받은 카카오 엑세스 토큰을 사용하여 사용자 정보 처리
const kakaoCallback = async (access_token) => {
  try {
    const userResponse = await axios.get('https://kapi.kakao.com/v2/user/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const { id, kakao_account } = userResponse.data;

    let user = await findUserByKakaoId(id);

    if (!user) {
      await createUser({
        kakaoId: id,
        email: kakao_account.email || '',
        nickname: null,
        profileImage: kakao_account.profile?.profile_image_url || '',
        refreshToken: null, // 리프레시 토큰을 서버에 저장하지 않음
      });

      user = await findUserByKakaoId(id);
    }

    return {
      kakaoId: id,
      email: kakao_account.email || '',
      profileImage: kakao_account.profile?.profile_image_url || '',
      nickname: user.nickname,
    };
  } catch (error) {
    console.error(
      '카카오 API 요청 실패:',
      error.response?.data || error.message
    );
    throw new Error('카카오 로그인 실패');
  }
};

// 닉네임 설정 및 중복 확인
const registerNickname = async (kakaoId, nickname) => {
  // 빈 문자열 등록 방지
  if (!kakaoId || !nickname) {
    throw new Error('닉네임이 입력되지 않음');
  }

  const existingUser = await findUserByNickname(nickname);
  if (existingUser) {
    throw new Error('중복된 닉네임');
  }

  await updateUserNickname(kakaoId, nickname);

  return { message: '닉네임 등록 성공' };
};

// 닉네임 중복 확인
const checkNicknameDuplicate = async (nickname) => {
  const existingUser = await findUserByNickname(nickname);
  if (existingUser) {
    throw new Error('중복된 닉네임');
  }
  return { message: '사용 가능한 닉네임' };
};

// 로그아웃
const kakaoLogout = async (kakaoId) => {
  const user = await findUserByKakaoId(kakaoId);

  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  try {
    await axios.post('https://kapi.kakao.com/v1/user/logout', null, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });

    return true; // 로그아웃 성공
  } catch (error) {
    console.error(
      '카카오 로그아웃 실패:',
      error.response?.data || error.message
    );
    throw new Error('카카오 로그아웃 실패');
  }
};

// 계정 삭제
const deleteKakaoAccount = async (kakaoId) => {
  const user = await findUserByKakaoId(kakaoId);

  if (!user) {
    throw new Error('사용자를 찾을 수 없습니다.');
  }

  try {
    await axios.post('https://kapi.kakao.com/v1/user/unlink', null, {
      headers: {
        Authorization: `Bearer ${user.accessToken}`,
      },
    });

    await deleteUserByKakaoId(kakaoId);
    return true; // 계정 삭제 성공
  } catch (error) {
    console.error(
      '카카오 계정 삭제 실패:',
      error.response?.data || error.message
    );
    throw new Error('카카오 계정 삭제 실패');
  }
};

module.exports = {
  kakaoLogin,
  kakaoCallback,
  registerNickname,
  checkNicknameDuplicate,
  kakaoLogout,
  deleteKakaoAccount,
};
