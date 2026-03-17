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
    deposit_status: {
        type: DataTypes.STRING(20),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'paid', 'refunded', 'penalized']]
        },
        comment: 'pending: chưa đóng, paid: đã đóng cọc (escrow), refunded: đã hoàn, penalized: đã bị phạt'
    },
    join_status: {
        type: DataTypes.STRING(20),
        defaultValue: 'joined',
        validate: {
            isIn: [['joined', 'dropped_out', 'kicked']]
        },
        comment: 'joined: đang tham gia, dropped_out: tự rời (bị phạt), kicked: bị đuổi (hoàn 100%)'
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
