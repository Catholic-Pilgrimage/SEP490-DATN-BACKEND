const sequelize = require('../config/database');
const User = require('./User');
const RefreshToken = require('./RefreshToken');
const BlacklistedToken = require('./BlacklistedToken');
const PasswordReset = require('./PasswordReset');
const Site = require('./Site');
const SiteMedia = require('./SiteMedia');
const MassSchedule = require('./MassSchedule');
const Event = require('./Event');
const GuideShiftSubmission = require('./GuideShiftSubmission');
const GuideShift = require('./GuideShift');
const VerificationRequest = require('./VerificationRequest');
const NearbyPlace = require('./NearbyPlace');



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

// Site - Event
Site.hasMany(Event, { foreignKey: 'site_id', as: 'events' });
Event.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// Event - User (created_by)
User.hasMany(Event, { foreignKey: 'created_by', as: 'createdEvents' });
Event.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// VerificationRequest - User (applicant)
User.hasMany(VerificationRequest, { foreignKey: 'user_id', as: 'verificationRequests' });
VerificationRequest.belongsTo(User, { foreignKey: 'user_id', as: 'applicant' });

// VerificationRequest - User (reviewer)
VerificationRequest.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// ===================== GUIDE SHIFT SUBMISSIONS =====================

// GuideShiftSubmission - User (Guide)
User.hasMany(GuideShiftSubmission, { foreignKey: 'guide_id', as: 'shiftSubmissions' });
GuideShiftSubmission.belongsTo(User, { foreignKey: 'guide_id', as: 'guide' });

// GuideShiftSubmission - Site
Site.hasMany(GuideShiftSubmission, { foreignKey: 'site_id', as: 'shiftSubmissions' });
GuideShiftSubmission.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// GuideShiftSubmission - User (approved_by)
GuideShiftSubmission.belongsTo(User, { foreignKey: 'approved_by', as: 'approver' });

// GuideShiftSubmission - Self reference (previous submission)
GuideShiftSubmission.belongsTo(GuideShiftSubmission, { foreignKey: 'previous_submission_id', as: 'previousSubmission' });

// GuideShiftSubmission - GuideShift
GuideShiftSubmission.hasMany(GuideShift, { foreignKey: 'submission_id', as: 'shifts' });
GuideShift.belongsTo(GuideShiftSubmission, { foreignKey: 'submission_id', as: 'submission' });

// ===================== NEARBY PLACES =====================

// NearbyPlace - Site
Site.hasMany(NearbyPlace, { foreignKey: 'site_id', as: 'nearbyPlaces' });
NearbyPlace.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// NearbyPlace - User (proposed_by)
User.hasMany(NearbyPlace, { foreignKey: 'proposed_by', as: 'proposedPlaces' });
NearbyPlace.belongsTo(User, { foreignKey: 'proposed_by', as: 'proposer' });

// NearbyPlace - User (reviewed_by)
NearbyPlace.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });


const db = {
  sequelize,
  User,
  RefreshToken,
  BlacklistedToken,
  PasswordReset,
  Site,
  SiteMedia,
  MassSchedule,
  Event,
  VerificationRequest,
  GuideShiftSubmission,
  GuideShift,
  NearbyPlace
};

module.exports = db;
