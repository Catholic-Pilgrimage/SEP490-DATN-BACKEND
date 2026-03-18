const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const reportValidator = require('../validators/report.validator');
const authenticate = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validation.middleware');

router.post('/',
  authenticate,
  reportValidator.createReport,
  validate,
  ReportController.createReport
);

router.get('/',
  authenticate,
  authorize('admin'),
  reportValidator.getReports,
  validate,
  ReportController.getReports
);

router.get('/my-reports',
  authenticate,
  reportValidator.getMyReports,
  validate,
  ReportController.getMyReports
);

router.get('/:id',
  authenticate,
  reportValidator.reportId,
  validate,
  ReportController.getReportById
);

router.patch('/:id/resolve',
  authenticate,
  authorize('admin'),
  reportValidator.resolveReport,
  validate,
  ReportController.resolveReport
);

router.delete('/:id',
  authenticate,
  reportValidator.reportId,
  validate,
  ReportController.deleteMyReport
);

module.exports = router;
