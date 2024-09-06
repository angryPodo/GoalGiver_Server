// tests/unit/notification-controller.test.js

const request = require('supertest');
const express = require('express');
const {
  sendNotificationController,
} = require('../src/controllers/notification-controller');
const { sendNotification } = require('../src/services/notification-service');

jest.mock('../src/services/notification-service'); // 서비스 모의 설정

const app = express();
app.use(express.json());
app.post('/send-notification', sendNotificationController);

describe('POST /send-notification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 200 and success message when notification is sent', async () => {
    const mockResponse = { successCount: 1, failureCount: 0 };
    sendNotification.mockResolvedValue(mockResponse);

    const response = await request(app)
      .post('/send-notification')
      .send({
        tokens: ['token1', 'token2'],
        notification: { title: 'Test', body: 'This is a test' },
        data: { key: 'value' },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: '알림 전송 성공',
      data: mockResponse,
    });
    expect(sendNotification).toHaveBeenCalledWith(
      ['token1', 'token2'],
      { title: 'Test', body: 'This is a test' },
      { key: 'value' }
    );
  });

  it('should return 500 and error message when notification sending fails', async () => {
    sendNotification.mockRejectedValue(new Error('Sending failed'));

    const response = await request(app)
      .post('/send-notification')
      .send({
        tokens: ['token1', 'token2'],
        notification: { title: 'Test', body: 'This is a test' },
        data: { key: 'value' },
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: '알림 전송 실패',
      error: 'Sending failed',
    });
  });
});
