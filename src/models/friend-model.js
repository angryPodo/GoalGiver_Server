const db = require('../../config/database');

// 공통된 쿼리 실행 함수
const executeQuery = async (query, params = []) => {
  try {
    const [rows] = await db.query(query, params);
    return rows;
  } catch (error) {
    console.error('Database query failed:', error);
    throw new Error('Database query failed');
  }
};

// 친구 목록 조회
exports.getFriends = async (userId) => {
  const query = 'SELECT * FROM Friends WHERE user_id = ?';
  return executeQuery(query, [userId]);
};

// 친구 추가
exports.addFriend = async (userId, friendId) => {
  const query = 'INSERT INTO Friends (user_id, friend_id) VALUES (?, ?)';
  await executeQuery(query, [userId, friendId]);
};
