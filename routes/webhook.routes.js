const express = require('express');
const router = express.Router();
const { handleVbeeCallback } = require('../controllers/webhook/vbeeWebhookController');

/**
 * POST /api/webhooks/vbee?mediaId=<uuid>
 * VBee TTS callback - no auth required (called by VBee server)
 */
router.post('/vbee', handleVbeeCallback);

module.exports = router;
