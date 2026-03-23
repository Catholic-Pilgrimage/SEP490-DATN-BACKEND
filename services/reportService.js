const { Report, User, Post, PostComment, Journal, SiteReview, NearbyPlaceReview } = require('../models');
const { Op } = require('sequelize');

const reportService = {
  /**
   * Tạo báo cáo mới
   */
  async createReport(userId, { target_type, target_id, reason, description }) {
    // Kiểm tra target có tồn tại không
    let target;
    switch (target_type) {
      case 'post':
        target = await Post.findByPk(target_id);
        if (!target) {
          throw new Error('Post not found');
        }
        // Không cho tố cáo bài viết của chính mình
        if (target.user_id === userId) {
          throw new Error('Cannot report your own post');
        }
        break;

      case 'comment':
        target = await PostComment.findByPk(target_id);
        if (!target) {
          throw new Error('Comment not found');
        }
        if (target.user_id === userId) {
          throw new Error('Cannot report your own comment');
        }
        break;

      case 'journal':
        target = await Journal.findByPk(target_id);
        if (!target) {
          throw new Error('Journal not found');
        }
        // Chỉ cho tố cáo journal public
        if (target.privacy !== 'public') {
          throw new Error('Can only report public journals');
        }
        if (target.user_id === userId) {
          throw new Error('Cannot report your own journal');
        }
        break;

      case 'site_review':
        target = await SiteReview.findByPk(target_id);
        if (!target) {
          throw new Error('Site review not found');
        }
        if (target.user_id === userId) {
          throw new Error('Cannot report your own review');
        }
        break;

      case 'nearby_place_review':
        target = await NearbyPlaceReview.findByPk(target_id);
        if (!target) {
          throw new Error('Nearby place review not found');
        }
        if (target.user_id === userId) {
          throw new Error('Cannot report your own review');
        }
        break;

      default:
        throw new Error('Invalid target type');
    }

    // Kiểm tra xem đã tố cáo chưa
    const existingReport = await Report.findOne({
      where: {
        reporter_id: userId,
        target_type,
        target_id,
        status: 'pending'
      }
    });

    if (existingReport) {
      throw new Error('You have already reported this content');
    }

    // Tạo report
    const report = await Report.create({
      reporter_id: userId,
      target_type,
      target_id,
      reason,
      description
    });

    return report;
  },

  /**
   * Lấy danh sách reports (Admin only)
   */
  async getReports({ status, target_type, page = 1, limit = 20 }) {
    const where = {};

    if (status) {
      where.status = status;
    }

    if (target_type) {
      where.target_type = target_type;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Report.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'full_name', 'email', 'avatar_url']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      reports: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_items: count,
        limit
      }
    };
  },

  /**
   * Lấy reports của user hiện tại
   */
  async getMyReports(userId, { page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await Report.findAndCountAll({
      where: {
        reporter_id: userId
      },
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    return {
      reports: rows,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(count / limit),
        total_items: count,
        limit
      }
    };
  },

  /**
   * Lấy chi tiết report
   */
  async getReportById(reportId) {
    const report = await Report.findByPk(reportId, {
      include: [
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'full_name', 'email', 'avatar_url']
        },
        {
          model: User,
          as: 'resolver',
          attributes: ['id', 'full_name', 'email']
        }
      ]
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Load target content
    let targetContent = null;
    switch (report.target_type) {
      case 'post':
        targetContent = await Post.findByPk(report.target_id, {
          include: [
            {
              model: User,
              attributes: ['id', 'full_name', 'email', 'avatar_url']
            }
          ]
        });
        break;

      case 'comment':
        targetContent = await PostComment.findByPk(report.target_id, {
          include: [
            {
              model: User,
              attributes: ['id', 'full_name', 'email', 'avatar_url']
            }
          ]
        });
        break;

      case 'journal':
        targetContent = await Journal.findByPk(report.target_id, {
          include: [
            {
              model: User,
              attributes: ['id', 'full_name', 'email', 'avatar_url']
            }
          ]
        });
        break;

      case 'site_review':
        targetContent = await SiteReview.findByPk(report.target_id, {
          include: [
            {
              model: User,
              as: 'reviewer',
              attributes: ['id', 'full_name', 'email', 'avatar_url']
            }
          ]
        });
        break;

      case 'nearby_place_review':
        targetContent = await NearbyPlaceReview.findByPk(report.target_id, {
          include: [
            {
              model: User,
              as: 'reviewer',
              attributes: ['id', 'full_name', 'email', 'avatar_url']
            }
          ]
        });
        break;
    }

    return {
      ...report.toJSON(),
      target_content: targetContent
    };
  },

  /**
   * Xử lý report (Admin only)
   */
  async resolveReport(reportId, adminId, { action, note }) {
    const report = await Report.findByPk(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'pending') {
      throw new Error('Report has already been processed');
    }

    // Cập nhật status
    report.status = action;
    report.resolved_by = adminId;
    report.description = note ? `${report.description}\n\nAdmin note: ${note}` : report.description;

    await report.save();

    // Auto-hide review when resolved
    if (action === 'resolved') {
      if (report.target_type === 'site_review') {
        await SiteReview.update({ is_active: false }, { where: { id: report.target_id } });
      } else if (report.target_type === 'nearby_place_review') {
        await NearbyPlaceReview.update({ is_active: false }, { where: { id: report.target_id } });
      }
    }

    return report;
  },

  /**
   * Xóa report của mình (trước khi admin xử lý)
   */
  async deleteMyReport(reportId, userId) {
    const report = await Report.findByPk(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.reporter_id !== userId) {
      throw new Error('You can only delete your own reports');
    }

    if (report.status !== 'pending') {
      throw new Error('Cannot delete processed reports');
    }

    await report.destroy();
  }
};

module.exports = reportService;
