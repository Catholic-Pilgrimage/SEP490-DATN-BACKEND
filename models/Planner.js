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
    number_of_days: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        validate: {
            min: 1
        }
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
            isIn: [['motorbike', 'car', 'bus', 'train', 'plane']]
        }
    },
    budget_level: {
        type: DataTypes.STRING,
        defaultValue: 'standard',
        validate: {
            isIn: [['budget', 'standard', 'luxury']]
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'planning',
        validate: {
            isIn: [['planning', 'ongoing', 'completed']]
        }
    },
    is_public: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    share_token: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    share_role: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        validate: {
            isIn: {
                args: [['viewer', 'editor', null]],
                msg: 'share_role must be viewer, editor, or null'
            }
        }
    }
}, {
    tableName: 'planners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Planner;
