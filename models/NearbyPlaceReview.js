const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NearbyPlaceReview = sequelize.define('NearbyPlaceReview', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    nearby_place_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'nearby_places',
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
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'nearby_place_reviews',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = NearbyPlaceReview;
