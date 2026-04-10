const { MAX_3D_MODEL_FILE_SIZE_MB } = require('../config/supabase.config');

const isUploadBadRequest = (err) => {
  if (!err || typeof err.message !== 'string') {
    return false;
  }

  return [
    /invalid .* format/i,
    /invalid upload field/i,
    /must use the `.+` field/i,
    /unexpected field/i,
    /file format .+ not allowed/i
  ].some((pattern) => pattern.test(err.message));
};

const errorMiddleware = (err, req, res, next) => {
  console.error('Error:', err);

  if (err?.name === 'MulterError' && err.code === 'LIMIT_FILE_SIZE') {
    err.message = `File too large. Maximum allowed size is ${MAX_3D_MODEL_FILE_SIZE_MB}MB.`;
  }

  const statusCode =
    err.statusCode ||
    err.status ||
    err.http_code ||
    (err.name === 'MulterError' ? 400 : undefined) ||
    (isUploadBadRequest(err) ? 400 : 500);
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};

module.exports = errorMiddleware;
