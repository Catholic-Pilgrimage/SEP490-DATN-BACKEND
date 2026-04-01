const AuthService = require('../../services/shared/authService');
const ResponseUtil = require('../../utils/response.util');
const { validationResult } = require('express-validator');
const { formatValidationErrors } = require('../../utils/validation.util');

// Register a new user
exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const result = await AuthService.register(req.body);
    return ResponseUtil.created(res, result, req.__('auth.register_success'));
  } catch (error) {
    if (error.message === 'Email already registered') {
      return ResponseUtil.badRequest(res, req.__('auth.email_already_registered'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { email, password } = req.body;
    const result = await AuthService.login(email, password);


    const { User } = require('../../models');
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (user && user.language) {
      req.setLocale(user.language);
    }

    return ResponseUtil.success(res, result, req.__('auth.login_success'));
  } catch (error) {

    const { User } = require('../../models');
    const user = await User.findOne({ where: { email: req.body.email?.toLowerCase().trim() } });
    if (user && user.language) {
      req.setLocale(user.language);
    }

    if (error.message === 'Invalid email or password') {
      return ResponseUtil.unauthorized(res, req.__('auth.invalid_credentials'));
    }
    if (error.message === 'Account is banned') {
      return ResponseUtil.forbidden(res, req.__('auth.account_banned'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Login user via Google (Firebase)
exports.loginWithGoogle = async (req, res) => {
  try {
    const { firebaseIdToken } = req.body;
    if (!firebaseIdToken) {
      return ResponseUtil.badRequest(res, req.__('validation.failed'), [{ field: 'firebaseIdToken', message: 'firebaseIdToken is required' }]);
    }

    const result = await AuthService.loginWithGoogle(firebaseIdToken);

    if (result.user && result.user.language) {
      req.setLocale(result.user.language);
    }

    return ResponseUtil.success(res, result, req.__('auth.login_success'));
  } catch (error) {
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired' || error.message.includes('Decoding Firebase ID token failed')) {
      return ResponseUtil.unauthorized(res, req.__('auth.invalid_credentials'));
    }
    if (error.message === 'Account is banned') {
      return ResponseUtil.forbidden(res, req.__('auth.account_banned'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return ResponseUtil.badRequest(res, req.__('auth.refresh_token_required'));
    }

    const result = await AuthService.refreshToken(refreshToken);
    return ResponseUtil.success(res, result, req.__('auth.token_refreshed'));
  } catch (error) {
    if (error.message === 'Invalid refresh token') {
      return ResponseUtil.unauthorized(res, req.__('auth.invalid_refresh_token'));
    }
    if (error.message === 'Refresh token not found') {
      return ResponseUtil.unauthorized(res, req.__('auth.refresh_token_not_found'));
    }
    if (error.message === 'Refresh token expired') {
      return ResponseUtil.unauthorized(res, req.__('auth.refresh_token_expired'));
    }
    return ResponseUtil.unauthorized(res, req.__('error.server_error'));
  }
};

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const result = await AuthService.getProfile(req.user.id);
    return ResponseUtil.success(res, result, req.__('auth.get_profile_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Update  profile
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const updateData = req.body;

    // Nếu có upload avatar
    if (req.file) {
      updateData.avatar_url = req.file.path;
    }

    const result = await AuthService.updateProfile(req.user.id, updateData);
    return ResponseUtil.success(res, result, req.__('auth.profile_updated'));
  } catch (error) {
    if (error.message === 'Invalid date of birth') {
      return ResponseUtil.badRequest(res, req.__('validation.date_of_birth_invalid'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { current_password, new_password } = req.body;

    await AuthService.changePassword(req.user.id, current_password, new_password);
    return ResponseUtil.success(res, null, req.__('auth.password_changed'));
  } catch (error) {
    if (error.message === 'Current password is incorrect') {
      return ResponseUtil.unauthorized(res, req.__('auth.current_password_incorrect'));
    }
    if (error.message === 'Current password is required') {
      return ResponseUtil.badRequest(res, req.__('auth.current_password_required'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Forgot password - Send OTP
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { email } = req.body;
    await AuthService.forgotPassword(email);
    return ResponseUtil.success(res, null, req.__('auth.otp_sent'));
  } catch (error) {
    if (error.message === 'Email not found') {
      return ResponseUtil.notFound(res, req.__('auth.email_not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Reset password with OTP
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { email, otp, new_password } = req.body;
    await AuthService.resetPassword(email, otp, new_password);
    return ResponseUtil.success(res, null, req.__('auth.password_reset_success'));
  } catch (error) {
    if (error.message === 'Invalid OTP') {
      return ResponseUtil.badRequest(res, req.__('auth.invalid_otp'));
    }
    if (error.message === 'OTP has expired') {
      return ResponseUtil.badRequest(res, req.__('auth.otp_expired'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Verify OTP only (without resetting password)
exports.verifyOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = formatValidationErrors(errors.array());
      return ResponseUtil.badRequest(res, req.__('validation.failed'), formattedErrors);
    }

    const { email, otp } = req.body;
    const result = await AuthService.verifyOtp(email, otp);
    return ResponseUtil.success(res, result, req.__('auth.otp_verified'));
  } catch (error) {
    if (error.message === 'Invalid OTP') {
      return ResponseUtil.badRequest(res, req.__('auth.invalid_otp'));
    }
    if (error.message === 'OTP has expired') {
      return ResponseUtil.badRequest(res, req.__('auth.otp_expired'));
    }
    if (error.message === 'User not found') {
      return ResponseUtil.notFound(res, req.__('auth.user_not_found'));
    }
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];

    await AuthService.logout(accessToken, req.user.id);
    return ResponseUtil.success(res, null, req.__('auth.logout_success'));
  } catch (error) {
    return ResponseUtil.error(res, req.__('error.server_error'));
  }
};
