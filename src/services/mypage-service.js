// 작성자: Minjae Han

const { getUserProfile } = require('../models/mypage-model');

exports.getUserProfile = async (userId) => {
  return await getUserProfile(userId);
};
