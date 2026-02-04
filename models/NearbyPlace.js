const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NearbyPlace = sequelize.define('NearbyPlace', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    site_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'sites',
            key: 'id'
        }
    },
    code: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    category: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
            isIn: [['food', 'lodging', 'medical']]
        }
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: false
    },
    longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: false
    },
    distance_meters: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(15),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'nearby_places',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
        { fields: ['site_id'] },
        { fields: ['created_by'] },
        { fields: ['category'] },
        { fields: ['status'] }
    ]
});

module.exports = NearbyPlace;
