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
        allowNull: true,
        comment: 'Ngày bắt đầu chuyến đi'
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        comment: 'Ngày kết thúc chuyến đi'
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
    deposit_amount: {
        type: DataTypes.DECIMAL(15, 2),
        defaultValue: null,
        allowNull: true,
        comment: 'Số tiền cọc mỗi thành viên phải đóng (null = không yêu cầu cọc)'
    },
    penalty_percentage: {
        type: DataTypes.INTEGER,
        defaultValue: null,
        allowNull: true,
        validate: {
            min: 0,
            max: 100
        },
        comment: 'Phần trăm phạt khi tự rời nhóm (null = không phạt, 0-100)'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'planning',
        validate: {
            isIn: [['planning', 'locked', 'ongoing', 'completed', 'cancelled']]
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
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
    },
    lock_duration_hours: {
        type: DataTypes.INTEGER,
        defaultValue: 24,
        allowNull: false,
        comment: 'Fallback giờ khóa chỉnh sửa khi chưa đặt edit_lock_at'
    },
    edit_lock_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Thời điểm bắt đầu khóa chỉnh sửa kế hoạch'
    },
    is_locked: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false
    }
}, {
    tableName: 'planners',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Planner;
