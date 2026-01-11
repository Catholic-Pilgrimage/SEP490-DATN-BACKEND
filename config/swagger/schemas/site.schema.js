/**
 * @swagger
 * components:
 *   schemas:
 *     CreateSiteRequest:
 *       type: object
 *       required:
 *         - name
 *         - region
 *         - type
 *       properties:
 *         name:
 *           type: string
 *           example: "Nhà thờ Đức Bà Sài Gòn"
 *           description: "Tên địa điểm (2-255 ký tự)"
 *         description:
 *           type: string
 *           example: "Nhà thờ chính tòa của Tổng Giáo phận Sài Gòn"
 *         history:
 *           type: string
 *           example: "Được xây dựng từ năm 1863-1880..."
 *         address:
 *           type: string
 *           example: "01 Công xã Paris, Bến Nghé, Quận 1"
 *         province:
 *           type: string
 *           example: "Hồ Chí Minh"
 *         district:
 *           type: string
 *           example: "Quận 1"
 *         latitude:
 *           type: number
 *           format: float
 *           example: 10.779738
 *           description: "Vĩ độ (-90 đến 90)"
 *         longitude:
 *           type: number
 *           format: float
 *           example: 106.699092
 *           description: "Kinh độ (-180 đến 180)"
 *         region:
 *           type: string
 *           enum: [Bac, Trung, Nam]
 *           example: "Nam"
 *           description: "Vùng miền"
 *         type:
 *           type: string
 *           enum: [church, shrine, monastery, center, other]
 *           example: "church"
 *           description: "Loại địa điểm"
 *         patron_saint:
 *           type: string
 *           example: "Đức Mẹ Vô Nhiễm Nguyên Tội"
 *           description: "Thánh bổn mạng"
 *         cover_image:
 *           type: string
 *           format: uri
 *           example: "https://example.com/image.jpg"
 *         opening_hours:
 *           type: object
 *           example:
 *             monday: "05:00-18:00"
 *             tuesday: "05:00-18:00"
 *             sunday: "05:00-20:00"
 *         contact_info:
 *           type: object
 *           example:
 *             phone: "028-3822-0477"
 *             email: "contact@example.com"
 *             website: "https://example.com"
 *
 *     SiteResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Tạo địa điểm thành công"
 *         data:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             code:
 *               type: string
 *               example: "CHNAM001"
 *               description: "Mã địa điểm (auto-generated)"
 *             name:
 *               type: string
 *             description:
 *               type: string
 *             history:
 *               type: string
 *             address:
 *               type: string
 *             province:
 *               type: string
 *             district:
 *               type: string
 *             latitude:
 *               type: number
 *             longitude:
 *               type: number
 *             region:
 *               type: string
 *             type:
 *               type: string
 *             patron_saint:
 *               type: string
 *             cover_image:
 *               type: string
 *             opening_hours:
 *               type: object
 *             contact_info:
 *               type: object
 *             status:
 *               type: string
 *               example: "approved"
 *             is_active:
 *               type: boolean
 *             created_by:
 *               type: string
 *               format: uuid
 *             created_at:
 *               type: string
 *               format: date-time
 *             updated_at:
 *               type: string
 *               format: date-time
 */

module.exports = {};
