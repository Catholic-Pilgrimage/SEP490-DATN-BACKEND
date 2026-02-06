const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PostLike = sequelize.define('PostLike', {
    post_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'posts',
            key: 'id'
        }
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'post_likes',
    timestamps: false,
    underscored: true
});

module.exports = PostLike;
