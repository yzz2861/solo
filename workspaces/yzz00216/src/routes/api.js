const express = require('express');
const router = express.Router();
const detectionController = require('../controllers/detectionController');
const reviewController = require('../controllers/reviewController');

router.post('/detect/single', detectionController.detectSingle);
router.post('/detect/batch', detectionController.detectBatch);

router.get('/result/:id', detectionController.getResult);
router.get('/batch/:batchId', detectionController.getBatch);

router.get('/batch/:batchId/download', detectionController.downloadResult);
router.get('/batch/:batchId/badrows/download', detectionController.downloadBadRows);

router.post('/result/:resultId/review', reviewController.submitForReview);
router.post('/review/:reviewId/process', reviewController.processReview);
router.get('/review/:reviewId', reviewController.getReview);
router.get('/reviews/pending', reviewController.listPendingReviews);

module.exports = router;
