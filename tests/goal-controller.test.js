// tests/goal-controller.test.js

const request = require('supertest');
const express = require('express');
const notificationRouter = require('../src/routes/notification-route');

const goalRouter = require('../src/routes/goal-route');

const { StatusCodes } = require('http-status-codes');
const {
  uploadPhotoAndValidate,
  requestTeamValidationService,
  getUserGoals: mockGetUserGoals,
  createGoal: mockCreateGoal,
  getGoals,
} = require('../src/services/goal-service');

const { setTestUser } = require('../src/middlewares/set-test-user');

jest.mock('../src/services/goal-service');

const { acceptTeamValidation } = require('../src/services/goal-service');

const app = express();
app.use(express.json());
app.use(setTestUser); // 가짜 사용자 설정 미들웨어 사용
app.use('/goal', goalRouter);
app.use('/goals', goalRouter);

describe('Goal Controller Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 각 테스트 전 모의 함수 초기화
  });
});
describe('POST /goals/:goalInstanceId/validate/accept', () => {
  it('should return 200 and message when all team members accept', async () => {
    acceptTeamValidation.mockResolvedValue(true);

    const response = await request(app).post('/goals/1/validate/accept');

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({
      message: '모든 팀원이 인증을 수락하였습니다.',
    });

    expect(acceptTeamValidation).toHaveBeenCalledWith('1', 1); // instanceId를 문자열로 기대
  });

  it('should return 200 and message when not all team members have accepted', async () => {
    acceptTeamValidation.mockResolvedValue(false);

    const response = await request(app).post('/goals/2/validate/accept');

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({
      message: '인증을 수락하였습니다.',
    });

    expect(acceptTeamValidation).toHaveBeenCalledWith('2', 1); // instanceId를 문자열로 기대
  });

  it('should return 409 if validation is already complete', async () => {
    acceptTeamValidation.mockRejectedValue(
      new Error('이미 완료된 인증입니다.')
    );

    const response = await request(app).post('/goals/3/validate/accept');

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body).toHaveProperty('message', '이미 완료된 인증입니다.');

    expect(acceptTeamValidation).toHaveBeenCalledWith('3', 1); // instanceId를 문자열로 기대
  });

  it('should return 500 on unexpected errors', async () => {
    acceptTeamValidation.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app).post('/goals/4/validate/accept');

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toHaveProperty('message', '인증 처리 중 오류 발생');

    expect(acceptTeamValidation).toHaveBeenCalledWith('4', 1); // instanceId를 문자열로 기대
  });
});

describe('POST /goals/:goalInstanceId/validate/photo', () => {
  it('should return 200 and success message when photo validation is successful', async () => {
    uploadPhotoAndValidate.mockResolvedValue('photo-url');

    const response = await request(app)
      .post('/goals/1/validate/photo')
      .attach('photo', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({
      message: '인증 성공',
      data: 'photo-url',
    });

    expect(uploadPhotoAndValidate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: 1 })
    );
  });

  it('should return 403 if user does not have permission', async () => {
    uploadPhotoAndValidate.mockRejectedValue(
      new Error('접근 권한이 없습니다. (아이디 불일치)')
    );

    const response = await request(app)
      .post('/goals/1/validate/photo')
      .attach('photo', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body).toHaveProperty(
      'message',
      '접근 권한이 없습니다. (아이디 불일치)'
    );
  });

  it('should return 400 if the goal type is invalid', async () => {
    uploadPhotoAndValidate.mockRejectedValue(
      new Error('사진 인증 타입이 아닙니다.')
    );

    const response = await request(app)
      .post('/goals/1/validate/photo')
      .attach('photo', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toHaveProperty(
      'message',
      '사진 인증 타입이 아닙니다.'
    );
  });

  it('should return 409 if the request is already validated', async () => {
    uploadPhotoAndValidate.mockRejectedValue(
      new Error('이미 인증된 요청입니다.')
    );

    const response = await request(app)
      .post('/goals/1/validate/photo')
      .attach('photo', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body).toHaveProperty('message', '이미 인증된 요청입니다.');
  });

  it('should return 500 on unexpected error', async () => {
    uploadPhotoAndValidate.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .post('/goals/1/validate/photo')
      .attach('photo', Buffer.from('fake image content'), {
        filename: 'test.jpg',
        contentType: 'image/jpeg',
      });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toHaveProperty('message', '에러로 인한 인증 실패');
  });
});

describe('POST /goals/:goalInstanceId/validate/team', () => {
  it('should return 200 and success message when team validation is requested successfully', async () => {
    requestTeamValidationService.mockResolvedValue();

    const response = await request(app).post('/goals/1/validate/team').send();

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({
      message: '인증 요청이 성공적으로 전송되었습니다.',
      data: undefined,
    });

    expect(requestTeamValidationService).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ id: 1 })
    );
  });

  it('should return 403 if user does not have permission', async () => {
    requestTeamValidationService.mockRejectedValue(
      new Error('접근 권한이 없습니다. (아이디 불일치)')
    );

    const response = await request(app).post('/goals/1/validate/team').send();

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(response.body).toHaveProperty(
      'message',
      '접근 권한이 없습니다. (아이디 불일치)'
    );
  });

  it('should return 400 if the goal type is invalid', async () => {
    requestTeamValidationService.mockRejectedValue(
      new Error('유효한 목표 타입이 아닙니다.')
    );

    const response = await request(app).post('/goals/1/validate/team').send();

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toHaveProperty(
      'message',
      '유효한 목표 타입이 아닙니다.'
    );
  });

  it('should return 500 on unexpected error', async () => {
    requestTeamValidationService.mockRejectedValue(
      new Error('Unexpected error')
    );

    const response = await request(app).post('/goals/1/validate/team').send();

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toHaveProperty(
      'message',
      '인증 요청 전송 중 에러 발생'
    );
  });
});

describe('GET /goals/week', () => {
  it('should return 400 if week_start or week_end is missing', async () => {
    const response = await request(app).get('/goals/week');
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({
      error: 'week_start 또는 week_end가 없습니다.',
    });
  });

  it('should return 400 if week_start or week_end is not a valid date', async () => {
    const response = await request(app)
      .get('/goals/week')
      .query({ week_start: 'invalid-date', week_end: '2024-07-27' });
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({
      error: '유효한 날짜 형식이 아닙니다.',
    });
  });

  it('should return 400 if start date is after end date', async () => {
    const response = await request(app)
      .get('/goals/week')
      .query({ week_start: '2024-07-28', week_end: '2024-07-27' });
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({
      error: '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
    });
  });

  it('should return 400 if the date range exceeds 7 days', async () => {
    const response = await request(app)
      .get('/goals/week')
      .query({ week_start: '2024-07-21', week_end: '2024-07-29' });
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({
      error: '기간은 최대 7일 이내여야 합니다.',
    });
  });

  it('should return 200 and goals data', async () => {
    const mockGoals = {
      week_start: '2024-07-21',
      week_end: '2024-07-27',
      goals: [],
    };
    getGoals.mockResolvedValue(mockGoals);

    const response = await request(app)
      .get('/goals/week')
      .query({ week_start: '2024-07-21', week_end: '2024-07-27' });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual(mockGoals);
    expect(getGoals).toHaveBeenCalledWith(1, '2024-07-21', '2024-07-27');
  });

  it('should handle errors from getGoals service', async () => {
    getGoals.mockRejectedValue(new Error('Database error'));

    const response = await request(app)
      .get('/goals/week')
      .query({ week_start: '2024-07-21', week_end: '2024-07-27' });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toHaveProperty('message', '주간 목표 조회 에러');
  });
});

describe('GET /goal', () => {
  it('should return user goals', async () => {
    const mockGoals = [
      {
        id: 1,
        title: 'Read a book',
        description: 'Read a new book every week',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'personal',
        status: 'ongoing',
      },
    ];

    mockGetUserGoals.mockResolvedValue({
      userId: 1,
      goals: mockGoals,
    });

    const response = await request(app)
      .get('/goal')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({
      userId: 1,
      goals: mockGoals,
    });
  });

  it('should handle errors properly', async () => {
    mockGetUserGoals.mockRejectedValue(new Error('Something went wrong'));

    const response = await request(app)
      .get('/goal')
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.error).toBe('Internal Server Error');
  });
});

describe('POST /goal', () => {
  it('should create a personal goal', async () => {
    const mockGoal = {
      id: 1,
      title: '달리기 챌린지',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: 'personal',
      validationType: 'photo',
      latitude: 37.7749,
      longitude: -122.4194,
      emoji: '🏃',
      donationOrganizationId: 1,
      donationAmount: 1000,
    };

    mockCreateGoal.mockResolvedValue(mockGoal);

    const response = await request(app)
      .post('/goal')
      .send(mockGoal)
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toEqual(expect.objectContaining(mockGoal));
  });

  it('should create a team goal with members and repeat instances', async () => {
    const mockGoal = {
      id: 2,
      title: '팀 달리기 챌린지',
      startDate: '2024-08-10',
      endDate: '2024-08-30',
      type: 'team',
      validationType: 'team',
      teamMemberIds: [2, 3, 4],
      timeAttack: false,
      startTime: '09:00:00',
      endTime: '10:00:00',
      repeatType: 'weekly',
      daysOfWeek: ['mon', 'wed', 'fri'],
    };

    const mockCreatedGoal = {
      ...mockGoal,
      id: 2,
      instances: [
        { date: '2024-08-12' },
        { date: '2024-08-14' },
        { date: '2024-08-16' },
        { date: '2024-08-19' },
        { date: '2024-08-21' },
        { date: '2024-08-23' },
        { date: '2024-08-26' },
        { date: '2024-08-28' },
        { date: '2024-08-30' },
      ],
    };

    mockCreateGoal.mockResolvedValue(mockCreatedGoal);

    const response = await request(app)
      .post('/goal')
      .send(mockGoal)
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toEqual(expect.objectContaining(mockCreatedGoal));
  });

  it('should create a team goal with monthly repeat instances', async () => {
    const mockGoal = {
      id: 3,
      title: '팀 월간 회의',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      type: 'team',
      validationType: 'team',
      teamMemberIds: [2, 3, 4],
      timeAttack: false,
      startTime: '09:00:00',
      endTime: '10:00:00',
      repeatType: 'monthly',
      dayOfMonth: 15, // 매달 15일에 반복
    };

    const mockCreatedGoal = {
      ...mockGoal,
      id: 3,
      instances: [
        { date: '2024-01-15' },
        { date: '2024-02-15' },
        { date: '2024-03-15' },
        { date: '2024-04-15' },
        { date: '2024-05-15' },
        { date: '2024-06-15' },
        { date: '2024-07-15' },
        { date: '2024-08-15' },
        { date: '2024-09-15' },
        { date: '2024-10-15' },
        { date: '2024-11-15' },
        { date: '2024-12-15' },
      ],
    };

    mockCreateGoal.mockResolvedValue(mockCreatedGoal);

    const response = await request(app)
      .post('/goal')
      .send(mockGoal)
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(response.body).toEqual(expect.objectContaining(mockCreatedGoal));
  });

  it('should return an error if required fields are missing', async () => {
    const response = await request(app)
      .post('/goal')
      .send({
        title: '',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'personal',
        validationType: 'photo',
      })
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toEqual({
      error: '유효하지 않은 요청입니다.',
    });
  });

  it('should handle errors properly', async () => {
    mockCreateGoal.mockRejectedValue(new Error('Something went wrong'));

    const response = await request(app)
      .post('/goal')
      .send({
        title: '팀 달리기 챌린지',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        type: 'team',
        validationType: 'team',
        teamMemberIds: [2, 3, 4],
        timeAttack: false,
        startTime: '09:00:00',
        endTime: '10:00:00',
      })
      .set('Authorization', 'Bearer fake-jwt-token');

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body.error).toBe('Internal Server Error');
  });
});

// tests/unit/goal-controller.test.js

const { calculateLocation } = require('../src/services/goal-service');

// Body parser 및 미들웨어 설정
app.use(express.json());
app.use('/goals', goalRouter);

describe('POST /goals/:goalInstanceId/validate/location', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // 각 테스트 전 모의 함수 초기화
  });

  it('should return 200 for successful location validation', async () => {
    calculateLocation.mockResolvedValue(true);

    const response = await request(app)
      .post('/goals/1/validate/location')
      .send({ latitude: 37.7749, longitude: -122.4194 });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveProperty('message', '위치 인증 성공');
  });

  it('should return 400 for failed location validation', async () => {
    calculateLocation.mockResolvedValue(false);

    const response = await request(app)
      .post('/goals/1/validate/location')
      .send({ latitude: 37.7749, longitude: -122.4194 });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body).toHaveProperty('message', '위치 인증 실패');
  });

  it('should return 409 for duplicate location validation', async () => {
    calculateLocation.mockRejectedValue(new Error('이미 완료된 인증입니다.'));

    const response = await request(app)
      .post('/goals/1/validate/location')
      .send({ latitude: 37.7749, longitude: -122.4194 });

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body).toHaveProperty('message', '이미 완료된 인증입니다.');
  });

  it('should return 404 if goal is not found', async () => {
    calculateLocation.mockRejectedValue(new Error('목표가 없습니다'));

    const response = await request(app)
      .post('/goals/1/validate/location')
      .send({ latitude: 37.7749, longitude: -122.4194 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body).toHaveProperty(
      'message',
      '해당 목표를 찾을 수 없습니다.'
    );
  });

  it('should return 500 on unexpected errors', async () => {
    calculateLocation.mockRejectedValue(new Error('Unexpected error'));

    const response = await request(app)
      .post('/goals/1/validate/location')
      .send({ latitude: 37.7749, longitude: -122.4194 });

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toHaveProperty('message', '위치 인증 중 오류 발생');
  });
});
