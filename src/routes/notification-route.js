// notification-route.js
const express = require('express');
const notificationController = require('../controllers/notification-controller');

const notificationRouter = express.Router();

notificationRouter.post(
  '/send-notification',
  notificationController.sendNotificationController
);

notificationRouter.get('/', notificationController.getNotifications);
module.exports = notificationRouter;
