const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SOSRequest = sequelize.define('SOSRequest', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(15),
        unique: true,
        allowNull: true
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
    site_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'sites',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        validate: {
            min: -90,
            max: 90
        }
    },
    longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true,
        validate: {
            min: -180,
            max: 180
        }
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    contact_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'accepted', 'resolved', 'cancelled']]
        }
    },
    assigned_to: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    resolved_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'sos_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SOSRequest;
