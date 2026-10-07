const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

router.post('/login', authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/change-password', authMiddleware, authController.changePassword);

module.exports = router;