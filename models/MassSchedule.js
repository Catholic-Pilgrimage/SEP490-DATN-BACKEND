const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MassSchedule = sequelize.define('MassSchedule', {
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
        },
        onDelete: 'CASCADE'
    },
    day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 0,
            max: 6
        }
    },
    time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    language: {
        type: DataTypes.STRING(50),
        defaultValue: 'Tiếng Việt'
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // NEW: Added for Manager approval
    status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'approved'
    },
    created_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'mass_schedules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = MassSchedule;
