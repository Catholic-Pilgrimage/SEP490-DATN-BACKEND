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
const Journal = require('./Journal');
const Planner = require('./Planner');
const PlannerItem = require('./PlannerItem');
const PlannerInvite = require('./PlannerInvite');
const PlannerMember = require('./PlannerMember');
const UserFavorite = require('./UserFavorite');
const UserCheckin = require('./UserCheckin');
const Notification = require('./Notification');
const UserPushToken = require('./UserPushToken');
const SOSRequest = require('./SOSRequest');
const Group = require('./Group');
const GroupMember = require('./GroupMember');
const GroupInvite = require('./GroupInvite');
const GroupJoinRequest = require('./GroupJoinRequest');
const Post = require('./Post');
const PostLike = require('./PostLike');
const PostComment = require('./PostComment');
const Report = require('./Report');



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


// User - Journal
User.hasMany(Journal, { foreignKey: 'user_id', as: 'journals' });
Journal.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Journal - Site (optional association)
Journal.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Site.hasMany(Journal, { foreignKey: 'site_id', as: 'journals' });

// User - Planner
User.hasMany(Planner, { foreignKey: 'user_id', as: 'planners' });
Planner.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });

// Planner - PlannerItem
Planner.hasMany(PlannerItem, { foreignKey: 'planner_id', as: 'items' });
PlannerItem.belongsTo(Planner, { foreignKey: 'planner_id', as: 'planner' });

// Planner - PlannerInvite
Planner.hasMany(PlannerInvite, { foreignKey: 'planner_id', as: 'invites' });
PlannerInvite.belongsTo(Planner, { foreignKey: 'planner_id', as: 'planner' });

// User - PlannerInvite
User.hasMany(PlannerInvite, { foreignKey: 'inviter_id', as: 'sentPlannerInvites' });
PlannerInvite.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });

// Planner - User (Members) - Many-to-Many through PlannerMember
Planner.belongsToMany(User, {
  through: PlannerMember,
  foreignKey: 'planner_id',
  otherKey: 'user_id',
  as: 'members'
});
User.belongsToMany(Planner, {
  through: PlannerMember,
  foreignKey: 'user_id',
  otherKey: 'planner_id',
  as: 'joinedPlanners'
});

// PlannerItem - Site
PlannerItem.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Site.hasMany(PlannerItem, { foreignKey: 'site_id', as: 'plannerItems' });

// User - Site (Favorites) - Many-to-Many through UserFavorite
User.belongsToMany(Site, {
  through: UserFavorite,
  foreignKey: 'user_id',
  otherKey: 'site_id',
  as: 'favoriteSites'
});
Site.belongsToMany(User, {
  through: UserFavorite,
  foreignKey: 'site_id',
  otherKey: 'user_id',
  as: 'favoritedBy'
});

// User - UserCheckin
User.hasMany(UserCheckin, { foreignKey: 'user_id', as: 'checkins' });
UserCheckin.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// PlannerItem - UserCheckin
PlannerItem.hasMany(UserCheckin, { foreignKey: 'planner_item_id', as: 'checkins' });
UserCheckin.belongsTo(PlannerItem, { foreignKey: 'planner_item_id', as: 'plannerItem' });

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

// NearbyPlace - User (created_by)
User.hasMany(NearbyPlace, { foreignKey: 'created_by', as: 'createdPlaces' });
NearbyPlace.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// NearbyPlace - User (reviewed_by)
NearbyPlace.belongsTo(User, { foreignKey: 'reviewed_by', as: 'reviewer' });

// ===================== NOTIFICATIONS =====================

// Notification - User (receiver)
User.hasMany(Notification, { foreignKey: 'receiver_id', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'receiver_id', as: 'receiver' });

// UserPushToken - User
User.hasMany(UserPushToken, { foreignKey: 'user_id', as: 'pushTokens' });
UserPushToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ===================== SOS REQUESTS =====================

// SOSRequest - User (pilgrim who sent)
User.hasMany(SOSRequest, { foreignKey: 'user_id', as: 'sosRequests' });
SOSRequest.belongsTo(User, { foreignKey: 'user_id', as: 'pilgrim' });

// SOSRequest - Site
Site.hasMany(SOSRequest, { foreignKey: 'site_id', as: 'sosRequests' });
SOSRequest.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// SOSRequest - User (assigned LocalGuide)
SOSRequest.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignedGuide' });

// ===================== GROUPS =====================

// Group - User (creator)
User.hasMany(Group, { foreignKey: 'created_by', as: 'createdGroups' });
Group.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// Group - User (members) - Many-to-Many through GroupMember
Group.belongsToMany(User, {
  through: GroupMember,
  foreignKey: 'group_id',
  otherKey: 'user_id',
  as: 'members'
});
User.belongsToMany(Group, {
  through: GroupMember,
  foreignKey: 'user_id',
  otherKey: 'group_id',
  as: 'groups'
});

// GroupInvite - Group
Group.hasMany(GroupInvite, { foreignKey: 'group_id', as: 'invites' });
GroupInvite.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// GroupInvite - User (inviter)
User.hasMany(GroupInvite, { foreignKey: 'inviter_id', as: 'sentGroupInvites' });
GroupInvite.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });

// GroupJoinRequest - Group
Group.hasMany(GroupJoinRequest, { foreignKey: 'group_id', as: 'joinRequests' });
GroupJoinRequest.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// GroupJoinRequest - User (requester)
User.hasMany(GroupJoinRequest, { foreignKey: 'user_id', as: 'joinRequests' });
GroupJoinRequest.belongsTo(User, { foreignKey: 'user_id', as: 'requester' });

// ===================== POSTS =====================

// Post - User (author)
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Post - Group
Group.hasMany(Post, { foreignKey: 'group_id', as: 'posts' });
Post.belongsTo(Group, { foreignKey: 'group_id', as: 'group' });

// Post - User (likes) - Many-to-Many through PostLike
Post.belongsToMany(User, {
  through: PostLike,
  foreignKey: 'post_id',
  otherKey: 'user_id',
  as: 'likedBy'
});
User.belongsToMany(Post, {
  through: PostLike,
  foreignKey: 'user_id',
  otherKey: 'post_id',
  as: 'likedPosts'
});

// PostComment - Post
Post.hasMany(PostComment, { foreignKey: 'post_id', as: 'comments' });
PostComment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

// PostComment - User (author)
User.hasMany(PostComment, { foreignKey: 'user_id', as: 'postComments' });
PostComment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// Report - User (reporter)
User.hasMany(Report, { foreignKey: 'reporter_id', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// Report - User (resolver)
User.hasMany(Report, { foreignKey: 'resolved_by', as: 'resolvedReports' });
Report.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });


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
  GuideShift,
  GuideShiftSubmission,
  VerificationRequest,
  Journal,
  Planner,
  PlannerItem,
  PlannerInvite,
  PlannerMember,
  UserFavorite,
  UserCheckin,
  NearbyPlace,
  Notification,
  UserPushToken,
  SOSRequest,
  Group,
  GroupMember,
  GroupInvite,
  GroupJoinRequest,
  Post,
  PostLike,
  PostComment,
  Report
};

module.exports = db;
