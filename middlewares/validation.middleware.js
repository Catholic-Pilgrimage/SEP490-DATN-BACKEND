const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const message = req.__ ? req.__('validation.failed') : 'Validation failed';
    return res.status(400).json({
      success: false,
      error: {
        message,
        details: errors.array()
      }
    });
  }

  next();
};

module.exports = validate;
