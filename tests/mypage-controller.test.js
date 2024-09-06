// 작성자: Minjae Han

const request = require('supertest');
const express = require('express');
const mypageRouter = require('../src/routes/mypage-route');
const { StatusCodes } = require('http-status-codes');
const {
  getUserProfile: mockGetUserProfile,
} = require('../src/services/mypage-service');
const {
  getUserDonations: mockGetUserDonations,
} = require('../src/services/donation-service');

jest.mock('../src/services/mypage-service');
jest.mock('../src/services/donation-service');

const app = express();
app.use(express.json());

// Mock middleware to inject req.user
app.use((req, res, next) => {
  req.user = { id: 1 };
  next();
});

app.use('/mypage', mypageRouter); // 경로를 '/mypage'로 설정

describe('GET /mypage/profile', () => {
  it('should return user profile with badges', async () => {
    const mockProfile = {
      userId: 1,
      nickname: 'JohnDoe',
      level: '골드',
      profilePhoto: 'profile.jpg',
      points: 150000,
      donationPoints: 100000,
      badges: [{ name: 'Gold Medal' }],
    };

    mockGetUserProfile.mockResolvedValue(mockProfile);

    const response = await request(app)
      .get('/mypage/profile') // '/profile' 경로로 요청
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual(mockProfile);
  });

  it('should handle errors properly', async () => {
    mockGetUserProfile.mockRejectedValue(new Error('Something went wrong'));

    const response = await request(app)
      .get('/mypage/profile') // '/profile' 경로로 요청
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.error).toBe('Internal Server Error');
  });
});

describe('GET /mypage/donations', () => {
  it('should return user donation history', async () => {
    const mockDonations = [
      { date: '2024-05-23', amount: 20000, organization: '유니세프' },
      { date: '2024-04-24', amount: 10000, organization: '굿네이버스' },
    ];

    mockGetUserDonations.mockResolvedValue(mockDonations);

    const response = await request(app)
      .get('/mypage/donations') // '/donations' 경로로 요청
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual(mockDonations);
  });

  it('should handle errors properly', async () => {
    mockGetUserDonations.mockRejectedValue(new Error('Something went wrong'));

    const response = await request(app)
      .get('/mypage/donations') // '/donations' 경로로 요청
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.error).toBe('Internal Server Error');
  });
});
