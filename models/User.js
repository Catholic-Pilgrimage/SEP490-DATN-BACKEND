const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true

        }
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    avatar_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    date_of_birth: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'pilgrim',
        validate: {
            isIn: [['admin', 'pilgrim', 'local_guide', 'manager']]
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'banned']]
        }
    },
    language: {
        type: DataTypes.STRING,
        defaultValue: 'vi',
        validate: {
            isIn: [['vi', 'en']]
        }
    },

    site_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'sites',
            key: 'id'
        },
        onDelete: 'SET NULL'
    },

    // === Local Guide Inheritance Tracking ===
    inherited_from: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        },
        comment: 'Previous manager who created/managed this Local Guide'
    },
    inherited_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When this Local Guide was inherited by current manager'
    },

    verified_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = User;
