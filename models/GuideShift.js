const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GuideShift = sequelize.define('GuideShift', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    submission_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'guide_shift_submissions',
            key: 'id'
        }
    },
    day_of_week: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
            min: 0,
            max: 6
        },
        comment: '0: Sunday, 1: Monday, ..., 6: Saturday'
    },
    start_time: {
        type: DataTypes.TIME,
        allowNull: false
    },
    end_time: {
        type: DataTypes.TIME,
        allowNull: false
    }
}, {
    tableName: 'guide_shifts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['submission_id'] },
        { fields: ['day_of_week'] }
    ]
});

module.exports = GuideShift;
