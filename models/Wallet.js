const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Wallet = sequelize.define('Wallet', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    balance: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        },
        comment: 'Số dư khả dụng - có thể dùng để đặt cọc hoặc rút tiền'
    },
    locked_balance: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: 0,
        allowNull: false,
        validate: {
            min: 0
        },
        comment: 'Số dư bị đóng băng trong escrow (đang giữ cọc cho các Planner)'
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'locked']]
        }
    }
}, {
    tableName: 'wallets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Wallet;
