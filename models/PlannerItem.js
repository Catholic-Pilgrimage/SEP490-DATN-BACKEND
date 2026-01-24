const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlannerItem = sequelize.define('PlannerItem', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    planner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'planners',
            key: 'id'
        }
    },
    site_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'sites',
            key: 'id'
        }
    },
    day_number: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'planner_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PlannerItem;
