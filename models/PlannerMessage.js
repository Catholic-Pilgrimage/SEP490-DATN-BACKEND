const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlannerMessage = sequelize.define('PlannerMessage', {
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
    user_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    message_type: {
        type: DataTypes.STRING(20),
        defaultValue: 'text',
        validate: {
            isIn: [['text', 'image', 'system']]
        }
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'planner_messages',
    timestamps: false
});

module.exports = PlannerMessage;
