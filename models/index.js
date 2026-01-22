const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const BlacklistedToken = require('./BlacklistedToken');
const PasswordReset = require('./PasswordReset');
const Site = require('./Site');
const SiteMedia = require('./SiteMedia');
const MassSchedule = require('./MassSchedule');
const VerificationRequest = require('./VerificationRequest');
const Journal = require('./Journal');
const Planner = require('./Planner');
const PlannerItem = require('./PlannerItem');



// User - RefreshToken
User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// User - Site (creator)
User.hasMany(Site, { foreignKey: 'created_by', as: 'createdSites' });
Site.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

//User - Site (for Manager/Local Guide)
User.belongsTo(Site, { foreignKey: 'site_id', as: 'assignedSite' });
Site.hasMany(User, { foreignKey: 'site_id', as: 'siteStaff' }); // managers & guides

// Site - SiteMedia
Site.hasMany(SiteMedia, { foreignKey: 'site_id', as: 'media' });
SiteMedia.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// SiteMedia - User (created_by)
User.hasMany(SiteMedia, { foreignKey: 'created_by', as: 'createdMedia' });
SiteMedia.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

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

// Journal - User (author)
User.hasMany(Journal, { foreignKey: 'user_id', as: 'journals' });
Journal.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Journal - Site
Site.hasMany(Journal, { foreignKey: 'site_id', as: 'journals' });
Journal.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// Planner - User (owner)
User.hasMany(Planner, { foreignKey: 'user_id', as: 'planners' });
Planner.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// Planner - PlannerItem
Planner.hasMany(PlannerItem, { foreignKey: 'planner_id', as: 'items' });
PlannerItem.belongsTo(Planner, { foreignKey: 'planner_id', as: 'planner' });

// PlannerItem - Site
Site.hasMany(PlannerItem, { foreignKey: 'site_id', as: 'plannerItems' });
PlannerItem.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });


const db = {
  sequelize,
  User,
  RefreshToken,
  BlacklistedToken,
  PasswordReset,
  Site,
  SiteMedia,
  MassSchedule,
  VerificationRequest,
  Journal,
  Planner,
  PlannerItem
};

module.exports = db;
