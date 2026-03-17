const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    wallet_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'wallets',
            key: 'id'
        }
    },
    amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
    },
    type: {
        type: DataTypes.STRING(30),
        allowNull: false,
        validate: {
            isIn: [[
                'topup',              // Nạp tiền vào ví (qua PayOS)
                'withdraw',           // Rút tiền khỏi ví (admin chuyển tay)
                'escrow_lock',        // Đóng băng tiền cọc khi tạo/join planner
                'escrow_refund',      // Hoàn trả cọc (khi planner completed hoặc bị kick)
                'penalty_applied',    // Tiền phạt bị trừ khỏi locked_balance của người tự rời
                'penalty_received',   // Tiền phạt ghi nhận cho Owner (PENDING cho đến khi verify)
                'penalty_refunded'    // Hoàn trả tiền phạt nếu plan ma (cancel penalty)
            ]]
        }
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'completed', 'failed', 'cancelled']]
        }
    },
    reference_type: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Loại entity liên quan: planner, planner_member, payos_order'
    },
    reference_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'ID của entity liên quan'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    proof_image_url: {
        type: DataTypes.STRING(1000),
        allowNull: true,
        comment: 'URL ảnh bill chuyển khoản của Admin (dùng cho withdraw)'
    },
    bank_info: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Thông tin ngân hàng người nhận (STK, tên NH) - dùng cho withdraw'
    }
}, {
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Transaction;
