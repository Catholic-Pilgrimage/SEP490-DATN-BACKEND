const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    receiver_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
            isIn: [[
                'local_guide_created',
                'local_guide_disabled',
                'shift_assigned',
                'shift_rejected',
                'site_update_submitted',
                'site_approved',
                'site_rejected',
                'site_hidden',
                'media_approved',
                'media_rejected',
                'event_approved',
                'event_rejected',
                'schedule_approved',
                'schedule_rejected',
                'nearby_place_approved',
                'nearby_place_rejected',
                'sos_created',
                'sos_assigned',
                'sos_resolved',
                'planner_invite',
                'planner_joined',
                'favorite_site_update',
                // Admin notifications
                'verification_submitted',
                'site_registration_submitted',
                // Manager notifications (content submitted by LocalGuide)
                'media_submitted',
                'event_submitted',
                'schedule_submitted',
                'nearby_place_submitted',
                'shift_submitted'
            ]]
        }
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    data: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'notifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = Notification;
