const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteReview = sequelize.define('SiteReview', {
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
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    checkin_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'user_checkins',
            key: 'id'
        }
    },
    rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 1,
            max: 5
        }
    },
    feedback: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_urls: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
    },
    verified_visit: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'site_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SiteReview;
