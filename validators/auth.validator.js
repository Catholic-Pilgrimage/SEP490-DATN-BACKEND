const { body } = require('express-validator');

class AuthValidator {
  // Validate đăng ký
  static register = [
    body('email')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),

    body('password')
      .isLength({ min: 8 }).withMessage('Mật khẩu phải có ít nhất 8 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'),

    body('full_name')
      .notEmpty().withMessage('Họ tên không được để trống')
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
      .trim(),

    body('phone')
      .optional()
      .matches(/^(0|\+84)[0-9]{9,10}$/).withMessage('Số điện thoại không hợp lệ'),

    body('date_of_birth')
      .optional()
      .isDate().withMessage('Ngày sinh không hợp lệ')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (birthDate > today) {
          throw new Error('Ngày sinh không được ở tương lai');
        }
        if (age < 6) {
          throw new Error('Bạn phải từ 6 tuổi trở lên');
        }
        if (age > 120) {
          throw new Error('Ngày sinh không hợp lệ');
        }
        return true;
      }),

    body('language')
      .optional()
      .isIn(['vi', 'en']).withMessage('Ngôn ngữ chỉ có thể là vi hoặc en')
  ];

  // Validate đăng nhập
  static login = [
    body('email')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),

    body('password')
      .notEmpty().withMessage('Mật khẩu không được để trống')
  ];

  // Validate update profile
  static updateProfile = [
    body('full_name')
      .optional()
      .isLength({ min: 2, max: 100 }).withMessage('Họ tên phải từ 2-100 ký tự')
      .trim(),

    body('phone')
      .optional()
      .matches(/^(0|\+84)[0-9]{9,10}$/).withMessage('Số điện thoại không hợp lệ'),

    body('date_of_birth')
      .optional()
      .isDate().withMessage('Ngày sinh không hợp lệ')
      .custom((value) => {
        const birthDate = new Date(value);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        if (birthDate > today) {
          throw new Error('Ngày sinh không được ở tương lai');
        }
        if (age < 6) {
          throw new Error('Bạn phải từ 6 tuổi trở lên');
        }
        if (age > 120) {
          throw new Error('Ngày sinh không hợp lệ');
        }
        return true;
      }),

    body('language')
      .optional()
      .isIn(['vi', 'en']).withMessage('Ngôn ngữ chỉ có thể là vi hoặc en')
  ];

  // Validate change password
  static changePassword = [
    body('current_password')
      .notEmpty().withMessage('Mật khẩu hiện tại không được để trống'),

    body('new_password')
      .isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt')
      .custom((value, { req }) => {
        if (value === req.body.current_password) {
          throw new Error('Mật khẩu mới phải khác mật khẩu hiện tại');
        }
        return true;
      }),

    body('confirm_password')
      .notEmpty().withMessage('Xác nhận mật khẩu không được để trống')
      .custom((value, { req }) => {
        if (value !== req.body.new_password) {
          throw new Error('Xác nhận mật khẩu không khớp');
        }
        return true;
      })
  ];

  // Validate forgot password
  static forgotPassword = [
    body('email')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail()
  ];

  // Validate verify OTP
  static verifyOtp = [
    body('email')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),

    body('otp')
      .isLength({ min: 6, max: 6 }).withMessage('OTP phải có 6 số')
      .isNumeric().withMessage('OTP chỉ chứa số')
  ];

  // Validate reset password
  static resetPassword = [
    body('email')
      .isEmail().withMessage('Email không hợp lệ')
      .normalizeEmail(),

    body('otp')
      .isLength({ min: 6, max: 6 }).withMessage('OTP phải có 6 số')
      .isNumeric().withMessage('OTP chỉ chứa số'),

    body('new_password')
      .isLength({ min: 8 }).withMessage('Mật khẩu mới phải có ít nhất 8 ký tự')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt'),

    body('confirm_password')
      .notEmpty().withMessage('Xác nhận mật khẩu không được để trống')
      .custom((value, { req }) => {
        if (value !== req.body.new_password) {
          throw new Error('Xác nhận mật khẩu không khớp');
        }
        return true;
      })
  ];
}

module.exports = AuthValidator;
