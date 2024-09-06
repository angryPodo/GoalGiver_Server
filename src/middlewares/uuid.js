const { v4 } = require('uuid');

/**
 * UUID 생성기
 * @returns {string} 생성된 UUID
 */
exports.createUUID = () => {
  const tokens = v4().split('-');
  console.log('token', tokens);
  return tokens[2] + tokens[1] + tokens[0] + tokens[3] + tokens[4];
};
