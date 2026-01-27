const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserFavorite = sequelize.define('UserFavorite', {
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    site_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'sites',
            key: 'id'
        },
        onDelete: 'CASCADE'
    }
}, {
    tableName: 'user_favorites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = UserFavorite;
