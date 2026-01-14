const { body } = require('express-validator');

class SiteValidator {
  // Validate create site
  static createSite = [
    body('name')
      .notEmpty().withMessage('Tên địa điểm không được để trống')
      .isLength({ min: 2, max: 255 }).withMessage('Tên địa điểm phải từ 2-255 ký tự')
      .trim(),

    body('description')
      .optional()
      .isString().withMessage('Mô tả phải là chuỗi')
      .trim(),

    body('history')
      .optional()
      .isString().withMessage('Lịch sử phải là chuỗi')
      .trim(),

    body('address')
      .optional()
      .isString().withMessage('Địa chỉ phải là chuỗi')
      .trim(),

    body('province')
      .optional()
      .isLength({ max: 100 }).withMessage('Tên tỉnh/thành không quá 100 ký tự')
      .trim(),

    body('district')
      .optional()
      .isLength({ max: 100 }).withMessage('Tên quận/huyện không quá 100 ký tự')
      .trim(),

    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),

    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),

    body('region')
      .notEmpty().withMessage('Vùng miền không được để trống')
      .isIn(['Bac', 'Trung', 'Nam']).withMessage('Vùng miền phải là Bac, Trung hoặc Nam'),

    body('type')
      .notEmpty().withMessage('Loại địa điểm không được để trống')
      .isIn(['church', 'shrine', 'monastery', 'center', 'other'])
      .withMessage('Loại địa điểm phải là church, shrine, monastery, center hoặc other'),

    body('patron_saint')
      .optional()
      .isLength({ max: 255 }).withMessage('Tên thánh bổn mạng không quá 255 ký tự')
      .trim(),

    body('opening_hours')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return true;
          } catch (e) {
            throw new Error('Giờ mở cửa phải là JSON hợp lệ');
          }
        }
        return true;
      }),

    body('contact_info')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return true;
          } catch (e) {
            throw new Error('Thông tin liên hệ phải là JSON hợp lệ');
          }
        }
        return true;
      })
  ];

  // Validate update site (all fields optional for partial update)
  static updateSite = [
    body('name')
      .optional()
      .isLength({ min: 2, max: 255 }).withMessage('Tên địa điểm phải từ 2-255 ký tự')
      .trim(),

    body('description')
      .optional()
      .isString().withMessage('Mô tả phải là chuỗi')
      .trim(),

    body('history')
      .optional()
      .isString().withMessage('Lịch sử phải là chuỗi')
      .trim(),

    body('address')
      .optional()
      .isString().withMessage('Địa chỉ phải là chuỗi')
      .trim(),

    body('province')
      .optional()
      .isLength({ max: 100 }).withMessage('Tên tỉnh/thành không quá 100 ký tự')
      .trim(),

    body('district')
      .optional()
      .isLength({ max: 100 }).withMessage('Tên quận/huyện không quá 100 ký tự')
      .trim(),

    body('latitude')
      .optional()
      .isFloat({ min: -90, max: 90 }).withMessage('Vĩ độ phải từ -90 đến 90'),

    body('longitude')
      .optional()
      .isFloat({ min: -180, max: 180 }).withMessage('Kinh độ phải từ -180 đến 180'),

    body('region')
      .optional()
      .isIn(['Bac', 'Trung', 'Nam']).withMessage('Vùng miền phải là Bac, Trung hoặc Nam'),

    body('type')
      .optional()
      .isIn(['church', 'shrine', 'monastery', 'center', 'other'])
      .withMessage('Loại địa điểm phải là church, shrine, monastery, center hoặc other'),

    body('patron_saint')
      .optional()
      .isLength({ max: 255 }).withMessage('Tên thánh bổn mạng không quá 255 ký tự')
      .trim(),

    body('opening_hours')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return true;
          } catch (e) {
            throw new Error('Giờ mở cửa phải là JSON hợp lệ');
          }
        }
        return true;
      }),

    body('contact_info')
      .optional()
      .custom((value) => {
        if (typeof value === 'string') {
          try {
            JSON.parse(value);
            return true;
          } catch (e) {
            throw new Error('Thông tin liên hệ phải là JSON hợp lệ');
          }
        }
        return true;
      })
  ];
}

module.exports = SiteValidator;
