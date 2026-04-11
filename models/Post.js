const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Post = sequelize.define('Post', {
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
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            notEmpty: {
                msg: 'Post content cannot be empty'
            }
        }
    },
    title: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    image_urls: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: []
    },
    audio_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    video_url: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    likes_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('draft', 'published', 'pending', 'approved', 'rejected'),
        defaultValue: 'published'
    },
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    journal_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'journals',
            key: 'id'
        }
    },
    site_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'sites',
            key: 'id'
        }
    },
    planner_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
            model: 'planners',
            key: 'id'
        }
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'posts',
    timestamps: false,
    underscored: true
});

module.exports = Post;
