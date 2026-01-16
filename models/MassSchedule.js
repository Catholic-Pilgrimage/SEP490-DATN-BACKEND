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
    code: {
        type: DataTypes.STRING(15),
        allowNull: false,
        unique: true
    },
    days_of_week: {
        type: DataTypes.ARRAY(DataTypes.INTEGER),
        allowNull: false,
        defaultValue: [],
        validate: {
            isValidDays(value) {
                if (!Array.isArray(value)) {
                    throw new Error('days_of_week must be an array');
                }
                for (const day of value) {
                    if (day < 0 || day > 6) {
                        throw new Error('Each day must be between 0 and 6');
                    }
                }
            }
        }
    },
    time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    note: {
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
        },
        onDelete: 'SET NULL'
    }
}, {
    tableName: 'mass_schedules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = MassSchedule;
