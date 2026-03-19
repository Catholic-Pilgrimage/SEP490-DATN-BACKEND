const { PayOS } = require('@payos/node');
const Logger = require('../utils/logger.util');

// Validate required environment variables for RECEIVE (Topup)
const receiveEnvVars = ['PAYOS_RECEIVE_CLIENT_ID', 'PAYOS_RECEIVE_API_KEY', 'PAYOS_RECEIVE_CHECKSUM_KEY'];
const missingReceiveVars = receiveEnvVars.filter(varName => !process.env[varName]);

// Validate required environment variables for PAYOUT (Withdraw)
const payoutEnvVars = ['PAYOS_PAYOUT_CLIENT_ID', 'PAYOS_PAYOUT_API_KEY', 'PAYOS_PAYOUT_CHECKSUM_KEY'];
const missingPayoutVars = payoutEnvVars.filter(varName => !process.env[varName]);

if (missingReceiveVars.length > 0) {
    Logger.warn(`PayOS RECEIVE configuration incomplete. Missing: ${missingReceiveVars.join(', ')}`);
    Logger.warn('PayOS topup features will be disabled.');
}

if (missingPayoutVars.length > 0) {
    Logger.warn(`PayOS PAYOUT configuration incomplete. Missing: ${missingPayoutVars.join(', ')}`);
    Logger.warn('PayOS withdrawal features will be disabled.');
}

// Initialize PayOS instances
let payosReceive = null;
let payosPayout = null;

try {
    if (missingReceiveVars.length === 0) {
        payosReceive = new PayOS({
            clientId: process.env.PAYOS_RECEIVE_CLIENT_ID,
            apiKey: process.env.PAYOS_RECEIVE_API_KEY,
            checksumKey: process.env.PAYOS_RECEIVE_CHECKSUM_KEY
        });
        Logger.info('PayOS RECEIVE (Topup) initialized successfully');
    }
} catch (error) {
    Logger.error('Failed to initialize PayOS RECEIVE:', error);
}

try {
    if (missingPayoutVars.length === 0) {
        payosPayout = new PayOS({
            clientId: process.env.PAYOS_PAYOUT_CLIENT_ID,
            apiKey: process.env.PAYOS_PAYOUT_API_KEY,
            checksumKey: process.env.PAYOS_PAYOUT_CHECKSUM_KEY
        });
        Logger.info('PayOS PAYOUT (Withdraw) initialized successfully');
    }
} catch (error) {
    Logger.error('Failed to initialize PayOS PAYOUT:', error);
}

// Export PayOS instances and configuration
module.exports = {
    payosReceive,
    payosPayout,
    config: {
        returnUrl: process.env.PAYOS_RETURN_URL || 'https://your-app.com/payment/success',
        cancelUrl: process.env.PAYOS_CANCEL_URL || 'https://your-app.com/payment/cancel',
        isReceiveEnabled: !!payosReceive,
        isPayoutEnabled: !!payosPayout
    }
};
