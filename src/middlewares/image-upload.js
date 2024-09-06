const path = require('path');
const AWS = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const dotenv = require('dotenv');
const { createUUID } = require('./uuid');

dotenv.config();

const s3 = new AWS.S3({
  region: process.env.AWS_S3_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const allowedExtensions = ['.png', '.jpg', '.jpeg', '.bmp', '.gif'];

/**
 * 이미지 업로드를 위한 미들웨어
 */
exports.imageUploader = multer({
  storage: multerS3({
    s3: s3, // S3 객체
    bucket: process.env.AWS_S3_BUCKET_NAME, // Bucket 이름
    contentType: multerS3.AUTO_CONTENT_TYPE, // Content-type, 자동으로 찾도록 설정
    key: (req, file, callback) => {
      // 파일명
      const uploadDirectory = req.query.directory ?? ''; // 디렉토리 path 설정을 위해서
      const extension = path.extname(file.originalname); // 파일 이름 얻어오기
      const uuid = createUUID(); // UUID 생성
      // extension 확인을 위한 코드 (확장자 검사용)
      if (!allowedExtensions.includes(extension)) {
        return callback(new Error('지원되지 않는 확장자'));
      }
      callback(null, `${uploadDirectory}/${uuid}_${file.originalname}`);
    },
    acl: 'public-read-write', // 파일 액세스 권한
  }),
  // 이미지 용량 제한 (5MB)
  limits: { fileSize: 5 * 1024 * 1024 },
});
