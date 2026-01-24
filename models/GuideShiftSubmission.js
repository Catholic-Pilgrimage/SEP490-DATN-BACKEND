const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuideShiftSubmission = sequelize.define('GuideShiftSubmission', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    guide_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
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
    code: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true
    },
    week_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    submission_type: {
        type: DataTypes.STRING(20),
        defaultValue: 'new',
        validate: {
            isIn: [['new', 'update']]
        }
    },
    change_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    previous_submission_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'guide_shift_submissions',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING(15),
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'rejected']]
        }
    },
    total_shifts: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    approved_by: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'guide_shift_submissions',
    timestamps: true,
    underscored: true,
    indexes: [
        { fields: ['guide_id'] },
        { fields: ['site_id'] },
        { fields: ['status'] },
        { fields: ['week_start_date'] }
    ]
});

module.exports = GuideShiftSubmission;
