const { sequelize, Report, User, Post, PostComment, Journal, SiteReview, NearbyPlaceReview } = require('../models');
const { Op } = require('sequelize');
const NotificationService = require('./shared/notificationService');
const appConfig = require('../config/app.config');

const REPORT_TYPE_CODE_MAP = {
  post: 'PO',
  comment: 'CM',
  journal: 'JN',
  site_review: 'SR',
  nearby_place_review: 'NR'
};

const reportCodeDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: appConfig.timezone,
  year: '2-digit',
  month: '2-digit',
  day: '2-digit'
});

const acquireTransactionLock = async (lockKey, transaction) => {
  await sequelize.query('SELECT pg_advisory_xact_lock(hashtext(:lockKey))', {
    replacements: { lockKey },
    transaction
  });
};

const formatLocalDateYYMMDD = (date = new Date()) => {
  const dateParts = reportCodeDateFormatter.formatToParts(date).reduce((parts, part) => {
    if (part.type !== 'literal') {
      parts[part.type] = part.value;
    }
    return parts;
  }, {});

  return `${dateParts.year}${dateParts.month}${dateParts.day}`;
};

const generateNextReportCode = async (targetType, transaction, now = new Date()) => {
  const typeCode = REPORT_TYPE_CODE_MAP[targetType] || 'OT';
  const prefix = `RP${typeCode}${formatLocalDateYYMMDD(now)}`;
  await acquireTransactionLock(`report_code:${prefix}`, transaction);

  const latestReport = await Report.findOne({
    where: {
      code: { [Op.like]: `${prefix}%` }
    },
    order: [['code', 'DESC']],
    transaction
  });

  let nextSequence = 1;
  if (latestReport?.code) {
    const lastSequence = parseInt(latestReport.code.slice(prefix.length), 10);
    if (!Number.isNaN(lastSequence)) {
      nextSequence = lastSequence + 1;
    }
  }

  return `${prefix}${String(nextSequence).padStart(3, '0')}`;
};

const parseIsActiveFilter = (value) => {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return undefined;
  }

  if (value === true || value === 'true') {
    return true;
  }

  if (value === false || value === 'false') {
    return false;
  }

  return undefined;
};

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
          const error = new Error('Post not found');
          error.statusCode = 404;
          throw error;
        }
        // Không cho tố cáo bài viết của chính mình
        if (target.user_id === userId) {
          const error = new Error('Cannot report your own post');
          error.statusCode = 400;
          throw error;
        }
        break;

      case 'comment':
        target = await PostComment.findByPk(target_id);
        if (!target) {
          const error = new Error('Comment not found');
          error.statusCode = 404;
          throw error;
        }
        if (target.user_id === userId) {
          const error = new Error('Cannot report your own comment');
          error.statusCode = 400;
          throw error;
        }
        break;

      case 'journal':
        target = await Journal.findByPk(target_id);
        if (!target) {
          const error = new Error('Journal not found');
          error.statusCode = 404;
          throw error;
        }
        // Chỉ cho tố cáo journal public
        if (target.privacy !== 'public') {
          const error = new Error('Can only report public journals');
          error.statusCode = 400;
          throw error;
        }
        if (target.user_id === userId) {
          const error = new Error('Cannot report your own journal');
          error.statusCode = 400;
          throw error;
        }
        break;

      case 'site_review':
        target = await SiteReview.findByPk(target_id);
        if (!target) {
          const error = new Error('Site review not found');
          error.statusCode = 404;
          throw error;
        }
        if (target.user_id === userId) {
          const error = new Error('Cannot report your own review');
          error.statusCode = 400;
          throw error;
        }
        break;

      case 'nearby_place_review':
        target = await NearbyPlaceReview.findByPk(target_id);
        if (!target) {
          const error = new Error('Nearby place review not found');
          error.statusCode = 404;
          throw error;
        }
        if (target.user_id === userId) {
          const error = new Error('Cannot report your own review');
          error.statusCode = 400;
          throw error;
        }
        break;

      default:
        const error = new Error('Invalid target type');
        error.statusCode = 400;
        throw error;
    }

    // Kiểm tra xem đã tố cáo chưa
    return sequelize.transaction(async (transaction) => {
      await acquireTransactionLock(`report:${userId}:${target_type}:${target_id}`, transaction);

      const existingReport = await Report.findOne({
        where: {
          reporter_id: userId,
          target_type,
          target_id,
          status: 'pending',
          is_active: true
        },
        transaction
      });

      if (existingReport) {
        const error = new Error('You have already reported this content');
        error.statusCode = 409;
        throw error;
      }

      const code = await generateNextReportCode(target_type, transaction);

      return Report.create({
        reporter_id: userId,
        target_type,
        target_id,
        reason,
        description,
        code
      }, {
        transaction
      });
    });
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
  async getMyReports(userId, { page = 1, limit = 20, is_active } = {}) {
    const offset = (page - 1) * limit;
    const where = {
      reporter_id: userId
    };
    const activeFilter = parseIsActiveFilter(is_active);

    if (activeFilter !== undefined) {
      where.is_active = activeFilter;
    }

    const { count, rows } = await Report.findAndCountAll({
      where,
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

    if (action === 'reject' && (!note || String(note).trim().length === 0)) {
      const error = new Error('Admin note is required for report rejection');
      error.statusCode = 400;
      throw error;
    }

    let targetUser = null;
    let snippet = 'Nội dung bị ẩn';

    // Transaction: report.save + content hide phải atomic
    await sequelize.transaction(async (t) => {
      report.status = action;
      report.resolved_by = adminId;
      report.admin_note = note || null;

      if (action === 'resolved') {
        if (report.target_type === 'post') {
          if (!note || String(note).trim().length === 0) {
            const error = new Error('Admin note is required for post report resolution');
            error.statusCode = 400;
            throw error;
          }
          const post = await Post.findByPk(report.target_id);
          if (post) {
            targetUser = post.user_id;
            snippet = post.content ? post.content.substring(0, 50) + '...' : 'Bài viết hình ảnh';
            await post.update({ is_active: false }, { transaction: t });
          }
        } else if (report.target_type === 'comment') {
          const comment = await PostComment.findByPk(report.target_id);
          if (comment) {
            targetUser = comment.user_id;
            snippet = comment.content ? comment.content.substring(0, 50) + '...' : 'Bình luận';
            await comment.update({ status: 'rejected' }, { transaction: t });
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
        } else if (report.target_type === 'comment') {
          await NotificationService.createNotification('content_deleted', targetUser, {
            snippet: `"${snippet}"`, adminNote
          });
        } else if (report.target_type === 'post') {
          await NotificationService.createNotification('content_deleted', targetUser, {
            snippet: `"${snippet}"`, adminNote
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

    if (!report.is_active || report.status === 'cancelled') {
      return report;
    }

    if (report.status !== 'pending') {
      throw new Error('Cannot delete processed reports');
    }

    await report.update({
      status: 'cancelled',
      is_active: false
    });
    return report;
  }
};

module.exports = reportService;
