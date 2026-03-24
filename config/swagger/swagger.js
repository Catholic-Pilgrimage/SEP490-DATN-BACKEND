const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Catholic Pilgrimage Guide App',
      version: '1.0.0',
      description: 'API documentation for Catholic Pilgrimage Guide App',
      contact: {
        name: 'API Support',
        email: 'support@example.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server (Local)'
      },
      {
        url: 'https://api.catholicpilgrimage.id.vn',
        description: 'Production server (VPS with SSL)'
      },
      {
        url: 'http://160.187.229.183:3000',
        description: 'Production server (VPS - Direct IP)'
      },
      {
        url: 'https://sep490-datn-backend.onrender.com',
        description: 'Backup server (Render)'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './config/swagger/apis/*.js',
    './config/swagger/apis/shared/*.js',
    './config/swagger/apis/admin/*.js',
    './config/swagger/apis/manager/*.js',
    './config/swagger/apis/localGuide/*.js',
    './config/swagger/apis/pilgrim/*.js',
    './config/swagger/apis/ai/*.js',
    './config/swagger/schemas/*.js',
    './routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
