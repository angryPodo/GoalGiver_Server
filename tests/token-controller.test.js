// tests/unit/token-controller.test.js

const request = require('supertest');
const express = require('express');
const { saveTokenController } = require('../src/controllers/token-controller');
const { saveToken } = require('../src/services/token-service');
const { StatusCodes } = require('http-status-codes');

jest.mock('../src/services/token-service'); // 서비스 모의 설정

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.locals.user = { id: 1 }; // 사용자 ID를 1로 설정
  next();
});
app.post('/save-token', saveTokenController);

describe('POST /save-token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and success message when token is saved successfully', async () => {
    saveToken.mockResolvedValue(); // 토큰 저장 성공 시 응답

    const response = await request(app)
      .post('/save-token')
      .set('Authorization', 'Bearer testtoken') // 인증 헤더 설정
      .send({
        token: 'faketoken123',
      });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ message: '토큰 저장 성공' });
    expect(saveToken).toHaveBeenCalledWith(1, 'faketoken123');
  });

  it('should return 500 and error message when token saving fails', async () => {
    saveToken.mockRejectedValue(new Error('Database error')); // 오류 발생 시

    const response = await request(app)
      .post('/save-token')
      .set('Authorization', 'Bearer testtoken') // 인증 헤더 설정
      .send({
        token: 'faketoken123',
      });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({
      message: '토큰 저장 실패',
      error: 'Database error',
    });
  });
});
