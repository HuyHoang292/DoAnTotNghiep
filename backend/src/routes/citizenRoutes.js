const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/roleMiddleware');
const citizenController = require('../controllers/citizenController');

router.use(authMiddleware, requireRoles('CITIZEN'));
router.get('/dashboard', citizenController.getDashboard);
router.get('/driver-licenses', citizenController.listDriverLicenses);
router.post('/vehicles/:id/approve', citizenController.approveVehicle);
router.post('/vehicles/:id/request-revision', citizenController.requestRevision);
router.post('/vehicles/:id/reject', citizenController.rejectVehicle);

module.exports = router;
