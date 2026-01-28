const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserPushToken = sequelize.define('UserPushToken', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    expo_token: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    device_id: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    platform: {
        type: DataTypes.STRING(50),
        allowNull: true,
        validate: {
            isIn: [['ios', 'android', 'web']]
        }
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'revoked', 'expired']]
        }
    },
    last_used_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'user_push_tokens',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = UserPushToken;
