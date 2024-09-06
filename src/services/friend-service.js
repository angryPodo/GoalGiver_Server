const axios = require('axios');
const { Op } = require('sequelize');
const User = require('../models/user-model');
const Friend = require('../models/friend-model');
const FriendRequest = require('../models/friend-request-model');

// 상수 정의
const KAKAO_FRIENDS_URL = 'https://kapi.kakao.com/v1/api/talk/friends';
const KAKAO_MESSAGE_SEND_URL = 'https://kapi.kakao.com/v1/api/talk/friends/message/send';

// 공통 헤더 생성 함수
const getKakaoHeaders = (kakaoToken) => ({
  Authorization: `Bearer ${kakaoToken}`,
});

// 카카오톡 친구 목록 가져오기
exports.getFriends = async (kakaoToken) => {
  try {
    const response = await axios.get(KAKAO_FRIENDS_URL, {
      headers: getKakaoHeaders(kakaoToken),
    });
    return response.data;
  } catch (error) {
    console.error('카카오톡 친구 목록 가져오기 실패:', error.message);
    throw new Error('친구 목록을 가져오는 중 문제가 발생했습니다.');
  }
};

// 친구에게 메시지 보내기
exports.sendMessageToFriend = async (kakaoToken, friendId, message) => {
  try {
    await axios.post(
      KAKAO_MESSAGE_SEND_URL,
      {
        template_object: {
          object_type: 'text',
          text: message,
          link: {
            web_url: 'https://developers.kakao.com',
            mobile_web_url: 'https://developers.kakao.com',
          },
        },
        receiver_uuids: [friendId],
      },
      {
        headers: getKakaoHeaders(kakaoToken),
      }
    );
  } catch (error) {
    console.error('친구에게 메시지 보내기 실패:', error.message);
    throw new Error('메시지 전송 중 문제가 발생했습니다.');
  }
};

// 앱 내 사용자 검색
exports.searchUser = async (keyword) => {
  return User.findAll({
    where: {
      username: {
        [Op.like]: `%${keyword}%`,
      },
    },
  });
};

// 앱 내 친구 신청
exports.addFriend = async (userId, friendId) => {
  const friendRequest = await FriendRequest.addFriendRequest(userId, friendId);
  return friendRequest;
};

// 친구 요청 수락
exports.acceptFriendRequest = async (userId, requestId) => {
  await findAndAcceptFriendRequest(userId, requestId);
};

// 친구 요청 거절
exports.rejectFriendRequest = async (userId, requestId) => {
  const request = await FriendRequest.findFriendRequest(userId, requestId);
  if (request) {
    await FriendRequest.deleteFriendRequest(requestId);
  }
};

// 친구 목록 조회
exports.showFriends = async (userId) => {
  return Friend.findAll({ where: { userId } });
};

// 유틸리티 함수: 친구 요청 찾기 및 수락
const findAndAcceptFriendRequest = async (userId, requestId) => {
  const request = await FriendRequest.findFriendRequest(userId, requestId);
  if (request) {
    await Friend.create({ userId: request.userId, friendId: request.friendId });
    await FriendRequest.deleteFriendRequest(requestId);
  }
};

//이미 친구인지
exports.areFriends = async (userId, friendId) => {
  const existingFriend = await Friend.findOne({
    where: {
      userId: userId,
      friendId: friendId,
    },
  });
  return !!existingFriend; // 친구 관계가 있으면 true 반환
};