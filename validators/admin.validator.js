const { body, param, query } = require('express-validator');

class AdminValidator {
  // Validate get users query params
  static getUsers = [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Trang phải là số nguyên dương'),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Giới hạn phải từ 1 đến 100'),

    query('role')
      .optional()
      .isIn(['admin', 'pilgrim', 'local_guide', 'manager']).withMessage('Role phải là admin, pilgrim, local_guide hoặc manager'),

    query('status')
      .optional()
      .isIn(['active', 'banned']).withMessage('Status phải là active hoặc banned'),

    query('search')
      .optional()
      .isString().withMessage('Từ khóa tìm kiếm phải là chuỗi')
      .trim()
  ];

  // Validate user ID param
  static validateUserId = [
    param('id')
      .isUUID().withMessage('ID người dùng không hợp lệ')
  ];

  // Validate update user status
  static updateUserStatus = [
    param('id')
      .isUUID().withMessage('ID người dùng không hợp lệ'),

    body('status')
      .notEmpty().withMessage('Status không được để trống')
      .isIn(['active', 'banned']).withMessage('Status phải là active hoặc banned')
  ];

  // Validate update user
  static updateUser = [
    param('id')
      .isUUID().withMessage('ID người dùng không hợp lệ'),

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
          throw new Error('Người dùng phải từ 6 tuổi trở lên');
        }
        if (age > 120) {
          throw new Error('Ngày sinh không hợp lệ');
        }
        return true;
      }),

    body('role')
      .optional()
      .isIn(['pilgrim', 'local_guide', 'manager']).withMessage('Role phải là pilgrim, local_guide hoặc manager (không thể đặt admin)'),

    body('site_id')
      .optional()
      .isUUID().withMessage('Site ID phải là UUID hợp lệ')
  ];
}

module.exports = AdminValidator;
