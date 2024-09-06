// 작성자: Minjae Han

const express = require('express');
const { getUserProfile } = require('../controllers/mypage-controller');
const { getUserDonations } = require('../controllers/donation-controller');

const mypageRouter = express.Router(); // router 변수로 라우터 정의

// 마이페이지 정보 조회
mypageRouter.get('/profile', getUserProfile); // 작성자: Minjae Han

// 기부 내역 조회
mypageRouter.get('/donations', getUserDonations); // 작성자: Minjae Han

module.exports = mypageRouter; // router 변수로 내보냄
