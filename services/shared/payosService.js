const { payosReceive, payosPayout, config } = require('../../config/payos.config');
const Logger = require('../../utils/logger.util');

class PayOSService {
    // ===================== TOPUP (Thu tiền) =====================

    static async createPaymentLink(amount, orderCode, description, returnUrl, cancelUrl) {
        try {
            if (!payosReceive) {
                throw new Error('PayOS RECEIVE is not configured. Please check environment variables.');
            }

            const paymentLink = await payosReceive.paymentRequests.create({
                orderCode,
                amount: Math.round(amount),
                description: description.substring(0, 25),
                returnUrl: returnUrl || config.returnUrl,
                cancelUrl: cancelUrl || config.cancelUrl
            });

            Logger.info(`PayOS payment link created: orderCode=${orderCode}, amount=${amount}`);

            return {
                checkoutUrl: paymentLink.checkoutUrl,
                qrCode: paymentLink.qrCode,
                orderCode: paymentLink.orderCode,
                amount: paymentLink.amount
            };
        } catch (error) {
            Logger.error('PayOS create payment link error:', error);
            throw error;
        }
    }

    static async verifyWebhookData(webhookData) {
        try {
            if (!payosReceive) {
                throw new Error('PayOS RECEIVE is not configured. Please check environment variables.');
            }

            const verifiedData = await payosReceive.webhooks.verify(webhookData);

            Logger.info(`PayOS webhook verified: orderCode=${verifiedData.orderCode}`);

            return {
                success: webhookData?.success === true,
                code: webhookData?.code,
                desc: webhookData?.desc,
                data: verifiedData
            };
        } catch (error) {
            Logger.error('PayOS webhook verification failed:', error);
            throw new Error('Invalid webhook signature');
        }
    }

    static async getPaymentInfo(orderCode) {
        try {
            if (!payosReceive) {
                throw new Error('PayOS RECEIVE is not configured. Please check environment variables.');
            }

            return await payosReceive.paymentRequests.get(Number(orderCode));
        } catch (error) {
            Logger.error('PayOS get payment info error:', error);
            throw error;
        }
    }

    static async cancelPaymentLink(orderCode, reason = 'User cancelled') {
        try {
            if (!payosReceive) {
                throw new Error('PayOS RECEIVE is not configured. Please check environment variables.');
            }

            const result = await payosReceive.paymentRequests.cancel(Number(orderCode), reason);
            Logger.info(`PayOS payment link cancelled: orderCode=${orderCode}`);
            return result;
        } catch (error) {
            Logger.error('PayOS cancel payment link error:', error);
            throw error;
        }
    }

    // ===================== PAYOUT (Chi tiền) =====================

    /**
     * Tạo lệnh chi tiền qua PayOS Payout
     * @param {number} amount - Số tiền chi (VND)
     * @param {string} payoutId - ID unique cho lệnh chi
     * @param {string} accountNumber - Số tài khoản ngân hàng
     * @param {string} accountName - Tên chủ tài khoản
     * @param {string} bankCode - Mã ngân hàng (VCB, TCB, MB, etc.)
     * @param {string} description - Mô tả giao dịch
     */
    static async createPayout(amount, payoutId, accountNumber, accountName, bankCode, description) {
        try {
            if (!payosPayout) {
                throw new Error('PayOS PAYOUT is not configured. Please check environment variables.');
            }

            const body = {
                referenceId: payoutId,
                amount: Math.round(amount),
                description: description.substring(0, 25),
                toBin: bankCode,
                toAccountNumber: accountNumber
            };

            // PayOS Chi cần gọi REST API trực tiếp (SDK chưa hỗ trợ đúng)
            const crypto = require('crypto');
            const idempotencyKey = `${payoutId}_${Date.now()}`;

            // Tạo signature theo PayOS docs:
            // 1. Sort keys alphabetically
            // 2. Values phải encodeURI, null/undefined → ""
            // 3. Join key=value bằng &
            // 4. HMAC SHA256 với checksum key
            const sortedKeys = Object.keys(body).sort();
            const signData = sortedKeys.map(key => {
                const val = body[key] === null || body[key] === undefined ? '' : body[key];
                return `${key}=${encodeURI(val)}`;
            }).join('&');
            const signature = crypto
                .createHmac('sha256', process.env.PAYOS_PAYOUT_CHECKSUM_KEY)
                .update(signData)
                .digest('hex');

            const response = await fetch('https://api-merchant.payos.vn/v1/payouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': process.env.PAYOS_PAYOUT_CLIENT_ID,
                    'x-api-key': process.env.PAYOS_PAYOUT_API_KEY,
                    'x-idempotency-key': idempotencyKey,
                    'x-signature': signature
                },
                body: JSON.stringify(body)
            });

            const result = await response.json();

            if (result.code !== '00') {
                throw new Error(`HTTP ${response.status}, ${result.desc || result.message || JSON.stringify(result)} (code: ${result.code})`);
            }

            Logger.info(`PayOS payout created: payoutId=${payoutId}, amount=${amount}, bank=${bankCode}`);

            return {
                referenceId: result.data?.referenceId || payoutId,
                amount: amount,
                status: result.data?.approvalState || 'PROCESSING'
            };
        } catch (error) {
            Logger.error('PayOS create payout error:', error);
            throw error;
        }
    }

    /**
     * Kiểm tra trạng thái lệnh chi tiền
     */
    static async getPayoutInfo(payoutId) {
        try {
            if (!payosPayout) {
                throw new Error('PayOS PAYOUT is not configured. Please check environment variables.');
            }

            return await payosPayout.payouts.get(payoutId);
        } catch (error) {
            Logger.error('PayOS get payout info error:', error);
            throw error;
        }
    }

    // ===================== UTILITIES =====================

    static generateOrderCode() {
        const timestamp = Date.now() % 100000000;
        const random = Math.floor(Math.random() * 10000);
        return parseInt(`${timestamp}${random.toString().padStart(4, '0')}`, 10);
    }

    static generatePayoutId() {
        return `PAYOUT_${Date.now()}_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }

    static isReceiveEnabled() {
        return config.isReceiveEnabled;
    }

    static isPayoutEnabled() {
        return config.isPayoutEnabled;
    }
}

module.exports = PayOSService;
