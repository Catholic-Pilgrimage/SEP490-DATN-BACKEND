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
    event_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'events',
            key: 'id'
        }
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 1
            // Note: Removed validate { min: 1 } because reorder uses negative values temporarily
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'planned',
        field: 'planner_item_status',
        validate: {
            isIn: [
                ['planned', 'in_progress', 'visited', 'skipped']
            ]
        }
    },
    note: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // Enhanced planning features
    nearby_amenity_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: true,
        defaultValue: []
    },
    estimated_time: {
        type: DataTypes.TIME,
        allowNull: true
    },
    rest_duration: {
        type: DataTypes.STRING, // PostgreSQL INTERVAL stored as string (e.g., '1 hour', '30 minutes')
        allowNull: true
    },
    travel_time_minutes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Travel time from previous site in minutes'
    }
}, {
    tableName: 'planner_items',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PlannerItem;