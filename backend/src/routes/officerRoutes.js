const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/roleMiddleware');
const officerController = require('../controllers/officerController');
const violationController = require('../controllers/violationController');

router.use(authMiddleware, requireRoles('OFFICER', 'ADMIN'));
router.get('/dashboard', officerController.getDashboard);
router.get('/plates', officerController.lookupPlate);
router.post('/scan-plate', officerController.scanPlate);
router.post('/plate-images', officerController.uploadPlateImage);
router.patch('/cameras/:id/video', officerController.updateCameraVideo);
router.patch('/cameras/:id/red-light-config', officerController.updateCameraRedLightConfig);
router.post('/cameras/:id/monitoring', officerController.startCameraMonitoring);
router.delete('/cameras/:id/monitoring', officerController.stopCameraMonitoring);
router.get('/cameras/:id/monitoring', officerController.getCameraMonitoring);
router.get('/cameras/:id/live-frame', officerController.getCameraLiveFrame);

router.get('/citizens', officerController.listCitizens);
router.post('/citizens', officerController.createCitizen);
router.get('/citizens/:id/login-history', officerController.getCitizenLoginHistory);
router.patch('/citizens/:id', officerController.updateCitizen);
router.get('/citizens/:id/driver-licenses', officerController.listCitizenDriverLicenses);
router.post('/citizens/:id/driver-licenses', officerController.createDriverLicense);
router.patch('/driver-licenses/:id', officerController.updateDriverLicense);
router.delete('/driver-licenses/:id', officerController.deleteDriverLicense);

router.get('/vehicles', officerController.listVehicles);
router.post('/vehicles', officerController.createVehicle);
router.patch('/vehicles/:id', officerController.updateVehicle);
router.post('/vehicles/:id/transfer', officerController.transferVehicle);

// Violations routes
router.get('/violations/queue', violationController.getAIQueue); // Must be before /:id
router.get('/violations', violationController.listViolations);
router.post('/violations', violationController.createOfficerViolation);
router.get('/violations/:id', violationController.getViolationDetail);
router.post('/violations/:id/verify', violationController.verifyViolation);
router.post('/violations/:id/reject', violationController.rejectViolation);
router.patch('/violations/:id/plate', violationController.updatePlate);
router.post('/violations/:id/invoice', violationController.createInvoice);
router.post('/invoices/:id/cancel', violationController.cancelInvoice);

module.exports = router;
