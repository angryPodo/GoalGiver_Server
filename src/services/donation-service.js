// 작성자: Minjae Han

const { getUserDonations } = require('../models/donation-model');

exports.getUserDonations = async (userId) => {
  return await getUserDonations(userId);
};
