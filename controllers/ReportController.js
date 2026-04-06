const reportService = require('../services/reportService');
const ResponseUtil = require('../utils/response.util');

const ReportController = {
  /**
   * Tạo báo cáo mới
   */
  async createReport(req, res, next) {
    try {
      const userId = req.user.id;
      const reportData = req.body;

      const report = await reportService.createReport(userId, reportData);

      return ResponseUtil.success(res, report, req.__('report.created'), 201);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy danh sách reports (Admin only)
   */
  async getReports(req, res, next) {
    try {
      const { status, target_type, page, limit } = req.query;

      const result = await reportService.getReports({
        status,
        target_type,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
      });

      return ResponseUtil.success(res, result, req.__('report.list_retrieved'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy reports của user hiện tại
   */
  async getMyReports(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit, is_active } = req.query;

      const result = await reportService.getMyReports(userId, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        is_active
      });

      return ResponseUtil.success(res, result, req.__('report.my_reports_retrieved'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Lấy chi tiết report
   */
  async getReportById(req, res, next) {
    try {
      const { id } = req.params;

      const report = await reportService.getReportById(id);

      return ResponseUtil.success(res, report, req.__('report.retrieved'));
    } catch (error) {
      next(error);
    }
  },

  /**
   * Xử lý report (Admin only)
   */
  async resolveReport(req, res, next) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { action, note, penalty } = req.body;

      const report = await reportService.resolveReport(id, adminId, { action, note, penalty });

      const message = action === 'reject' ? req.__('admin.reject_report_success') : req.__('admin.resolve_report_success');
      return ResponseUtil.success(res, report, message);
    } catch (error) {
      next(error);
    }
  },

  /**
   * Xóa report của mình
   */
  async deleteMyReport(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await reportService.deleteMyReport(id, userId);

      return ResponseUtil.success(res, null, req.__('report.deleted'));
    } catch (error) {
      next(error);
    }
  }
};

module.exports = ReportController;
