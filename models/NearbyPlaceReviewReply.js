const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NearbyPlaceReviewReply = sequelize.define('NearbyPlaceReviewReply', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    review_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'nearby_place_reviews',
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
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Reply content cannot be empty'
            }
        }
    }
}, {
    tableName: 'nearby_place_review_replies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = NearbyPlaceReviewReply;
