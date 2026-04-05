const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiCache = sequelize.define('AiCache', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    feature: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'AI feature name, e.g. summarize_reviews, suggest_events, generate_article'
    },
    cache_key: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'MD5 hash of canonical request parameters'
    },
    response_data: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Normalized AI response payload (post output-guard)'
    },
    expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Cache expiry timestamp'
    }
}, {
    tableName: 'ai_caches',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['feature', 'cache_key'],
            name: 'idx_ai_caches_feature_key'
        },
        {
            fields: ['expires_at'],
            name: 'idx_ai_caches_expires'
        }
    ]
});

module.exports = AiCache;
