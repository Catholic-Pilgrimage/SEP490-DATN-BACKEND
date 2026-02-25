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
        description: 'Development server'
      },
      {
        url: 'https://sep490-datn-backend.onrender.com',
        description: 'Production server (Render)'
      },
      {
        url: 'https://www.catholicpilgrimage.id.vn',
        description: 'Production server (Custom Domain)'
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
    './config/swagger/schemas/*.js',
    './routes/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
