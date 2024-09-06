const express = require('express');
const router = express.Router();
const {
  getFriends,
  sendMessageToFriend,
  searchUser,
  addFriend,
  acceptFriendRequest,
  rejectFriendRequest,
  showFriends,
  getFriendRequests
} = require('../controllers/friend-controller');
const kakaoAuthMiddleware = require('../middlewares/kakaoAuthMiddleware');

router.get('/api/talk/friends', getFriends);
router.post('/api/talk/friends/message/send', sendMessageToFriend);
router.get('/user/search-user', searchUser);
router.post('/friends-request/:id', kakaoAuthMiddleware, addFriend);
router.patch('/friend-requests/:id/accept', acceptFriendRequest);
router.patch('/friend-requests/:id/reject', rejectFriendRequest);
router.get('/friends/show', kakaoAuthMiddleware, showFriends);
router.get('/friend-requests', kakaoAuthMiddleware, getFriendRequests);

module.exports = router;
