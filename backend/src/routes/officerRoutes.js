const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const requireRoles = require('../middlewares/roleMiddleware');
const officerController = require('../controllers/officerController');

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

module.exports = router;
