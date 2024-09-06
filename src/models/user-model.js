const pool = require('../../config/database');

const findUserByKakaoId = async (kakaoId) => {
  const [rows] = await pool.query('SELECT * FROM Users WHERE kakaoId = ?', [
    kakaoId,
  ]);
  return rows[0];
};

const createUser = async (userData) => {
  const { kakaoId, email, nickname, profileImage, refreshToken } = userData;
  const [result] = await pool.query(
    'INSERT INTO Users (kakaoId, email, nickname, profile_image, refreshToken) VALUES (?, ?, ?, ?, ?)',
    [kakaoId, email, nickname, profileImage, refreshToken]
  );
  return result.insertId;
};

const updateUserTokens = async (kakaoId, accessToken, refreshToken) => {
  await pool.query(
    'UPDATE Users SET accessToken = ?, refreshToken = ? WHERE kakaoId = ?',
    [accessToken, refreshToken, kakaoId]
  );
};

const deleteUserByKakaoId = async (kakaoId) => {
  await pool.query('DELETE FROM Users WHERE kakaoId = ?', [kakaoId]);
};

const findUserByNickname = async (nickname) => {
  const [rows] = await pool.query('SELECT * FROM Users WHERE nickname = ?', [
    nickname,
  ]);
  return rows[0];
};

const updateUserNickname = async (kakaoId, nickname) => {
  await pool.query('UPDATE Users SET nickname = ? WHERE kakaoId = ?', [
    nickname,
    kakaoId,
  ]);
};

module.exports = {
  findUserByKakaoId,
  createUser,
  updateUserTokens,
  deleteUserByKakaoId,
  findUserByNickname,
  updateUserNickname,
};
