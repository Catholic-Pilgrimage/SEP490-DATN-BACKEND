const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VerificationRequest = sequelize.define('VerificationRequest', {
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
        }
    },
    code: {
        type: DataTypes.STRING(10),
        unique: true,
        allowNull: true 
    },

    site_name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    site_address: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    site_province: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    site_type: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isIn: [['church', 'shrine', 'monastery', 'center', 'other']]
        }
    },
    site_region: {
        type: DataTypes.STRING(10),
        allowNull: true,
        validate: {
            isIn: [['Bac', 'Trung', 'Nam']]
        }
    },


    certificate_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    introduction: {
        type: DataTypes.TEXT,
        allowNull: true
    },


    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    reviewed_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'verification_requests',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = VerificationRequest;
