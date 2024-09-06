const { kakaoLogin, kakaoCallback, registerNickname, checkNicknameDuplicate, kakaoLogout, deleteKakaoAccount } = require('../services/auth-service');
const { StatusCodes } = require('http-status-codes');

exports.kakaoLogin = (req, res) => {
  const kakaoAuthURL = kakaoLogin();
  res.redirect(kakaoAuthURL);
};

exports.kakaoRedirect = async (req, res, next) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(StatusCodes.BAD_REQUEST).json({ message: '인증 코드가 제공되지 않았습니다.' });
    }
    const kakaoUser = await kakaoCallback(code);
    // 로그인 성공 후 클라이언트로 유저 정보를 반환
    res.status(StatusCodes.OK).json({ message: '회원가입 성공, 닉네임 설정 필요', user: kakaoUser });
  } catch (error) {
    next(error);
  }
};

// 닉네임 등록
exports.registerNickname = async (req, res, next) => {
  try {
    const { kakaoId, nickname } = req.body; // 클라이언트로부터 kakaoId와 nickname을 받아옴
    const result = await registerNickname(kakaoId, nickname);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

// 닉네임 중복 확인
exports.checkNicknameDuplicate = async (req, res, next) => {
  try {
    const { nickname } = req.body;
    const result = await checkNicknameDuplicate(nickname);
    res.status(StatusCodes.OK).json(result);
  } catch (error) {
    next(error);
  }
};

exports.kakaoLogout = async (req, res, next) => {
  try {
    const { kakaoId } = req.body; // 클라이언트로부터 kakaoId를 받아옴
    await kakaoLogout(kakaoId);
    res.status(StatusCodes.OK).json({ message: '로그아웃 성공' });
  } catch (error) {
    next(error);
  }
};

exports.deleteKakaoAccount = async (req, res, next) => {
  try {
    const { kakaoId } = req.body; // 클라이언트로부터 kakaoId를 받아옴
    await deleteKakaoAccount(kakaoId);
    res.status(StatusCodes.OK).json({ message: '계정 삭제 성공' });
  } catch (error) {
    next(error);
  }
};
