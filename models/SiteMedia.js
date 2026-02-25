const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteMedia = sequelize.define('SiteMedia', {
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
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    url: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['image', 'video', 'model_3d']]
        }
    },
    caption: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    status: {
        type: DataTypes.STRING, // 'pending', 'approved', 'rejected'
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    rejection_reason: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    }
}, {
    tableName: 'site_media',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SiteMedia;
