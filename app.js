require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger/swagger');
const routes = require('./routes');
// i18n middleware
const i18n = require('./config/i18n.config');
const i18nMiddleware = require('./middlewares/i18n.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
// WebSocket
const { initSocket } = require('./websockets/socket');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

app.use(i18n.init);
app.use(i18nMiddleware);

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['*'];

    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language']
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger Authentication Middleware
const swaggerAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
    return res.status(401).send('Authentication required');
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  if (username === process.env.SWAGGER_USERNAME && password === process.env.SWAGGER_PASSWORD) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
  return res.status(401).send('Invalid credentials');
};

// Swagger Documentation
app.use('/api-docs', swaggerAuth, swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', websocket: 'enabled' });
});

// API Routes
app.use('/api', routes);

// Error handling middleware
app.use(errorMiddleware);

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`WebSocket enabled on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = { app, server };
