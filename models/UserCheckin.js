const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserCheckin = sequelize.define('UserCheckin', {
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
    planner_item_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'planner_items',
            key: 'id'
        }
    },
    latitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true
    },
    longitude: {
        type: DataTypes.DECIMAL(9, 6),
        allowNull: true
    },
    distance_meters: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    is_valid: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    status: {
        type: DataTypes.ENUM('checked_in', 'skipped', 'missed'),
        defaultValue: 'checked_in'
    },
    checkin_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'user_checkins',
    timestamps: false,
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'planner_item_id']
        }
    ]
});

module.exports = UserCheckin;
