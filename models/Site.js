const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Site = sequelize.define('Site', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(20),
        unique: true,
        allowNull: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    history: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    province: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    district: {
        type: DataTypes.STRING(100),
        allowNull: true
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
    region: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['Bac', 'Trung', 'Nam']]
        }
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['church', 'shrine', 'monastery', 'center', 'other']]
        }
    },
    patron_saint: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    cover_image: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    opening_hours: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    contact_info: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'sites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Site;
