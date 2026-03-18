const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const OfflineSyncLog = sequelize.define('OfflineSyncLog', {
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
    client_action_id: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
    },
    action_type: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'synced',
        validate: {
            isIn: [['synced', 'failed', 'skipped']]
        }
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    synced_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'offline_sync_logs',
    timestamps: false
});

module.exports = OfflineSyncLog;
