exports.setTestUser = (req, res, next) => {
  // 임의의 사용자 정보를 설정합니다.

  if (process.env.NODE_ENV !== 'production') {
    req.user = {
      id: 1,
      nickname: 'testuser',
      role: 'user',
    };
  }
  next();
};
