const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SiteReviewReply = sequelize.define('SiteReviewReply', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    review_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'site_reviews',
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
    tableName: 'site_review_replies',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = SiteReviewReply;
