const { Report, User, Post, PostComment, Journal, SiteReview, NearbyPlaceReview } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('./shared/notificationService');

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

    // Generate report code: RPSR240324001 (with retry for concurrency)
    const typeMap = { post: 'PO', comment: 'CM', journal: 'JN', site_review: 'SR', nearby_place_review: 'NR' };
    const typeCode = typeMap[target_type] || 'OT';
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const prefix = `RP${typeCode}${dateStr}`;

    let report;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayCount = await Report.count({
          where: {
            target_type,
            created_at: { [Op.gte]: todayStart }
          }
        });
        const code = `${prefix}${String(todayCount + 1 + attempt).padStart(3, '0')}`;

        report = await Report.create({
          reporter_id: userId,
          target_type,
          target_id,
          reason,
          description,
          code
        });
        break; // success
      } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError' && attempt < 4) {
          continue; // retry with next sequence
        }
        throw err;
      }
    }

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
              as: 'author',
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
              as: 'author',
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
              as: 'author',
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
  async resolveReport(reportId, adminId, { action, note, penalty }) {
    const report = await Report.findByPk(reportId);

    if (!report) {
      throw new Error('Report not found');
    }

    if (report.status !== 'pending') {
      throw new Error('Report has already been processed');
    }

    let targetUser = null;
    let snippet = 'Nội dung bị ẩn';
    const { sequelize } = require('../models');

    // Transaction: report.save + content hide phải atomic
    await sequelize.transaction(async (t) => {
      report.status = action;
      report.resolved_by = adminId;
      report.admin_note = note || null;

      if (action === 'resolved') {
        if (report.target_type === 'post') {
          const post = await Post.findByPk(report.target_id);
          if (post) {
            targetUser = post.user_id;
            snippet = post.content ? post.content.substring(0, 50) + '...' : 'Bài viết hình ảnh';
            if (penalty === 'delete_content') {
              await post.update({ status: 'rejected' }, { transaction: t });
            }
          }
        } else if (report.target_type === 'comment') {
          const comment = await PostComment.findByPk(report.target_id);
          if (comment) {
            targetUser = comment.user_id;
            snippet = comment.content ? comment.content.substring(0, 50) + '...' : 'Bình luận';
            if (penalty === 'delete_content') {
              await comment.update({ status: 'rejected' }, { transaction: t });
            }
          }
        } else if (report.target_type === 'journal') {
          const journal = await Journal.findByPk(report.target_id);
          if (journal) {
            targetUser = journal.user_id;
            snippet = journal.title ? journal.title : 'Nhật ký';
            if (penalty === 'delete_content') {
              await journal.destroy({ transaction: t });
            }
          }
        } else if (report.target_type === 'site_review') {
          const review = await SiteReview.findByPk(report.target_id);
          if (review) {
            targetUser = review.user_id;
            snippet = review.feedback ? review.feedback.substring(0, 50) + '...' : 'Đánh giá';
            await SiteReview.update({ is_active: false }, { where: { id: report.target_id }, transaction: t });
          }
        } else if (report.target_type === 'nearby_place_review') {
          const review = await NearbyPlaceReview.findByPk(report.target_id);
          if (review) {
            targetUser = review.user_id;
            snippet = review.feedback ? review.feedback.substring(0, 50) + '...' : 'Đánh giá';
            await NearbyPlaceReview.update({ is_active: false }, { where: { id: report.target_id }, transaction: t });
          }
        }
      }

      await report.save({ transaction: t });
    });

    // Fire-and-forget notification AFTER commit
    if (action === 'resolved' && targetUser) {
      try {
        const isReview = ['site_review', 'nearby_place_review'].includes(report.target_type);
        const adminNote = note ? ' Ghi chú của Admin: ' + note : '';

        if (isReview) {
          await NotificationService.createNotification('content_deleted', targetUser, {
            snippet: `Đánh giá "${snippet}"`, adminNote
          });
        } else if (penalty === 'delete_content') {
          await NotificationService.createNotification('content_deleted', targetUser, {
            snippet: `"${snippet}"`, adminNote
          });
        } else if (penalty === 'warning') {
          await NotificationService.createNotification('content_warning', targetUser, {
            snippet: `"${snippet}"`, adminNote
          });
        }
      } catch (err) {
        console.error('Notification error (report resolve):', err.message);
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
