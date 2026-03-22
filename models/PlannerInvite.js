const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlannerInvite = sequelize.define('PlannerInvite', {
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
    inviter_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    token: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true
    },

    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'awaiting_payment', 'rejected', 'expired', 'accepted']]
        }
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'planner_invites',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = PlannerInvite;
