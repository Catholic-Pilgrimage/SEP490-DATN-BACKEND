const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Planner = sequelize.define('Planner', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    number_of_people: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
    },
    transportation: {
        type: DataTypes.STRING(100),
        allowNull: true,
        validate: {
            isIn: [['motorbike', 'car', 'bus']]
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'planning',
        validate: {
            isIn: [['planning', 'ongoing', 'completed']]
        }
    },
    started_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    share_token: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    qr_code_url: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    }
}, {
    tableName: 'planners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Planner;
