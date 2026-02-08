const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlannerMember = sequelize.define('PlannerMember', {
    planner_id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        references: {
            model: 'planners',
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
    role: {
        type: DataTypes.STRING(20),
        defaultValue: 'viewer',
        validate: {
            isIn: [['viewer']]
        }
    },
    joined_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'planner_members',
    timestamps: false
});

module.exports = PlannerMember;
