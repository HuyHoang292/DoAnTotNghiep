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

router.get('/citizens', officerController.listCitizens);
router.post('/citizens', officerController.createCitizen);
router.patch('/citizens/:id', officerController.updateCitizen);

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

module.exports = router;
