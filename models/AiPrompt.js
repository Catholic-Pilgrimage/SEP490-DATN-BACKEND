const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiPrompt = sequelize.define('AiPrompt', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    prompt_key: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Unique key identifying the AI prompt, e.g. route, article, review_summary'
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Human-readable description of what this prompt does'
    },
    instruction_text: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'The business instruction text that admin can edit'
    },
    version: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Auto-incremented on each update, used for cache invalidation'
    },
    updated_by: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'ID of the admin who last updated this prompt'
    }
}, {
    tableName: 'ai_prompts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['prompt_key'],
            name: 'idx_ai_prompts_key'
        }
    ]
});

module.exports = AiPrompt;
