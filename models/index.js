const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const BlacklistedToken = require('./BlacklistedToken');
const PasswordReset = require('./PasswordReset');
const Site = require('./Site');
const SiteMedia = require('./SiteMedia');
const MassSchedule = require('./MassSchedule');
const VerificationRequest = require('./VerificationRequest');

// ============================================
// ASSOCIATIONS
// ============================================

// User - RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Site (creator)
User.hasMany(Site, { foreignKey: 'created_by', as: 'createdSites' });
Site.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// NEW: User - Site (for Manager/Local Guide)
// Manager/Local Guide belongs to one Site
User.belongsTo(Site, { foreignKey: 'site_id', as: 'assignedSite' });
Site.hasMany(User, { foreignKey: 'site_id', as: 'siteStaff' }); // managers & guides

// Site - SiteMedia
Site.hasMany(SiteMedia, { foreignKey: 'site_id', as: 'media' });
SiteMedia.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// Site - MassSchedule
Site.hasMany(MassSchedule, { foreignKey: 'site_id', as: 'massSchedules' });
MassSchedule.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// MassSchedule - User (created_by)
User.hasMany(MassSchedule, { foreignKey: 'created_by', as: 'createdSchedules' });
MassSchedule.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// VerificationRequest - User (applicant)
User.hasMany(VerificationRequest, { foreignKey: 'user_id', as: 'verificationRequests' });
VerificationRequest.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });

// VerificationRequest - User (reviewer)
VerificationRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// ============================================
// EXPORT
// ============================================
const db = {
  sequelize,
  User,
  RefreshToken,
  BlacklistedToken,
  PasswordReset,
  Site,
  SiteMedia,
  MassSchedule,
  VerificationRequest
};

module.exports = db;
