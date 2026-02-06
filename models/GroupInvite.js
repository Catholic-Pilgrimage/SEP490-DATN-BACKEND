const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const crypto = require('crypto');

const GroupInvite = sequelize.define('GroupInvite', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    group_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'groups',
            key: 'id'
        }
    },
    inviter_id: {
        type: DataTypes.UUID,
        allowNull: false,
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
        unique: true,
        defaultValue: () => crypto.randomBytes(32).toString('hex')
    },
    role: {
        type: DataTypes.ENUM('admin', 'member'),
        defaultValue: 'member'
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'expired'),
        defaultValue: 'pending'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'group_invites',
    timestamps: false,
    createdAt: 'created_at',
    updatedAt: false
});

module.exports = GroupInvite;
