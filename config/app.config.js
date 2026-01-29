module.exports = {
  port: process.env.PORT,
  env: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  timezone: process.env.TZ || 'Asia/Ho_Chi_Minh',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d'
  }
};
