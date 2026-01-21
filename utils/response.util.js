class ResponseUtil {
  static success(res, data, message = 'Success', statusCode = 200) {
    const response = {
      success: true,
      message
    };

    // Chỉ thêm data nếu không null/undefined
    if (data !== null && data !== undefined) {
      response.data = data;
    }

    return res.status(statusCode).json(response);
  }

  static error(res, message = 'Error', statusCode = 500, errors = null) {
    return res.status(statusCode).json({
      success: false,
      error: {
        message,
        ...(errors && { details: errors })
      }
    });
  }

  static created(res, data, message = 'Created successfully') {
    return this.success(res, data, message, 201);
  }

  static notFound(res, message = 'Resource not found') {
    return this.error(res, message, 404);
  }

  static unauthorized(res, message = 'Unauthorized') {
    return this.error(res, message, 401);
  }

  static forbidden(res, message = 'Forbidden') {
    return this.error(res, message, 403);
  }

  static badRequest(res, message = 'Bad request', errors = null) {
    return this.error(res, message, 400, errors);
  }

  static conflict(res, message = 'Conflict', errors = null) {
    return this.error(res, message, 409, errors);
  }
}

module.exports = ResponseUtil;
