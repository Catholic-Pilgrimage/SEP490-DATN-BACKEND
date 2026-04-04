const sequelize = require('../config/database');
const User = require('./User');
const Wallet = require('./Wallet');
const Transaction = require('./Transaction');
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
const PlannerMessage = require('./PlannerMessage');
const UserFavorite = require('./UserFavorite');
const UserCheckin = require('./UserCheckin');
const Notification = require('./Notification');
const UserPushToken = require('./UserPushToken');
const SOSRequest = require('./SOSRequest');
const Post = require('./Post');
const PostLike = require('./PostLike');
const PostComment = require('./PostComment');
const Report = require('./Report');
const OfflineSyncLog = require('./OfflineSyncLog');
const SiteReview = require('./SiteReview');
const NearbyPlaceReview = require('./NearbyPlaceReview');
const SiteReviewReply = require('./SiteReviewReply');
const NearbyPlaceReviewReply = require('./NearbyPlaceReviewReply');
const Friendship = require('./Friendship');

// ===================== WALLETS & TRANSACTIONS =====================

// User - Wallet (One-to-One)
User.hasOne(Wallet, { foreignKey: 'user_id', as: 'wallet' });
Wallet.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Wallet - Transaction (One-to-Many)
Wallet.hasMany(Transaction, { foreignKey: 'wallet_id', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'wallet_id', as: 'wallet' });

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

// SiteMedia - User (reviewed_by for media)
User.hasMany(SiteMedia, { foreignKey: 'reviewed_by', as: 'reviewedMedia' });
SiteMedia.belongsTo(User, { foreignKey: 'reviewed_by', as: 'mediaReviewer' });

// SiteMedia - User (narrative_reviewed_by)
User.hasMany(SiteMedia, { foreignKey: 'narrative_reviewed_by', as: 'reviewedNarratives' });
SiteMedia.belongsTo(User, { foreignKey: 'narrative_reviewed_by', as: 'narrativeReviewer' });

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

// Journal - Planner
Journal.belongsTo(Planner, { foreignKey: 'planner_id', as: 'planner' });
Planner.hasMany(Journal, { foreignKey: 'planner_id', as: 'journals' });

// Journal - PlannerItem
Journal.belongsTo(PlannerItem, { foreignKey: 'planner_item_id', as: 'plannerItem' });
PlannerItem.hasOne(Journal, { foreignKey: 'planner_item_id', as: 'journal' });

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

// Planner - PlannerMessage
Planner.hasMany(PlannerMessage, { foreignKey: 'planner_id', as: 'messages' });
PlannerMessage.belongsTo(Planner, { foreignKey: 'planner_id', as: 'planner' });

// User - PlannerMessage
User.hasMany(PlannerMessage, { foreignKey: 'user_id', as: 'plannerMessages' });
PlannerMessage.belongsTo(User, { foreignKey: 'user_id', as: 'sender' });

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

// ===================== POSTS =====================

// Post - User (author)
User.hasMany(Post, { foreignKey: 'user_id', as: 'posts' });
Post.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

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

// Post - Journal (for shared journals)
Post.belongsTo(Journal, { as: 'sourceJournal', foreignKey: 'journal_id' });
Journal.hasMany(Post, { as: 'sharedPosts', foreignKey: 'journal_id' });

Post.belongsTo(Planner, { as: 'planner', foreignKey: 'planner_id' });
Planner.hasMany(Post, { as: 'posts', foreignKey: 'planner_id' });

// Post - Site (location tagging)
Post.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });
Site.hasMany(Post, { foreignKey: 'site_id', as: 'posts' });

// PostComment - Post
Post.hasMany(PostComment, { foreignKey: 'post_id', as: 'comments' });
PostComment.belongsTo(Post, { foreignKey: 'post_id', as: 'post' });

// PostComment - User (author)
User.hasMany(PostComment, { foreignKey: 'user_id', as: 'postComments' });
PostComment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// PostComment - PostComment (Self-referencing for replies)
PostComment.hasMany(PostComment, { foreignKey: 'parent_id', as: 'replies' });
PostComment.belongsTo(PostComment, { foreignKey: 'parent_id', as: 'parent' });

// Report - User (reporter)
User.hasMany(Report, { foreignKey: 'reporter_id', as: 'reports' });
Report.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

// Report - User (resolver)
User.hasMany(Report, { foreignKey: 'resolved_by', as: 'resolvedReports' });
Report.belongsTo(User, { foreignKey: 'resolved_by', as: 'resolver' });

// ===================== OFFLINE SYNC LOGS =====================

// OfflineSyncLog - User
User.hasMany(OfflineSyncLog, { foreignKey: 'user_id', as: 'offlineSyncLogs' });
OfflineSyncLog.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ===================== SITE REVIEWS =====================

// SiteReview - Site
Site.hasMany(SiteReview, { foreignKey: 'site_id', as: 'reviews' });
SiteReview.belongsTo(Site, { foreignKey: 'site_id', as: 'site' });

// SiteReview - User
User.hasMany(SiteReview, { foreignKey: 'user_id', as: 'siteReviews' });
SiteReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

// SiteReview - UserCheckin
UserCheckin.hasMany(SiteReview, { foreignKey: 'checkin_id', as: 'reviews' });
SiteReview.belongsTo(UserCheckin, { foreignKey: 'checkin_id', as: 'checkin' });

// SiteReview - SiteReviewReply (1-to-1 for MVP)
SiteReview.hasOne(SiteReviewReply, { foreignKey: 'review_id', as: 'reply' });
SiteReviewReply.belongsTo(SiteReview, { foreignKey: 'review_id', as: 'review' });

// SiteReviewReply - User
User.hasMany(SiteReviewReply, { foreignKey: 'user_id', as: 'siteReviewReplies' });
SiteReviewReply.belongsTo(User, { foreignKey: 'user_id', as: 'replier' });

// ===================== NEARBY PLACE REVIEWS =====================

// NearbyPlaceReview - NearbyPlace
NearbyPlace.hasMany(NearbyPlaceReview, { foreignKey: 'nearby_place_id', as: 'reviews' });
NearbyPlaceReview.belongsTo(NearbyPlace, { foreignKey: 'nearby_place_id', as: 'nearbyPlace' });

// NearbyPlaceReview - User
User.hasMany(NearbyPlaceReview, { foreignKey: 'user_id', as: 'nearbyPlaceReviews' });
NearbyPlaceReview.belongsTo(User, { foreignKey: 'user_id', as: 'reviewer' });

// NearbyPlaceReview - NearbyPlaceReviewReply (1-to-1 for MVP)
NearbyPlaceReview.hasOne(NearbyPlaceReviewReply, { foreignKey: 'review_id', as: 'reply' });
NearbyPlaceReviewReply.belongsTo(NearbyPlaceReview, { foreignKey: 'review_id', as: 'review' });

// NearbyPlaceReviewReply - User
User.hasMany(NearbyPlaceReviewReply, { foreignKey: 'user_id', as: 'nearbyPlaceReviewReplies' });
NearbyPlaceReviewReply.belongsTo(User, { foreignKey: 'user_id', as: 'replier' });

// ===================== FRIENDSHIPS =====================

// Friendship - User (requester)
User.hasMany(Friendship, { foreignKey: 'requester_id', as: 'sentFriendRequests' });
Friendship.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

// Friendship - User (addressee)
User.hasMany(Friendship, { foreignKey: 'addressee_id', as: 'receivedFriendRequests' });
Friendship.belongsTo(User, { foreignKey: 'addressee_id', as: 'addressee' });


const db = {
  sequelize,
  User,
  Wallet,
  Transaction,
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
  PlannerMessage,
  UserFavorite,
  UserCheckin,
  NearbyPlace,
  Notification,
  UserPushToken,
  SOSRequest,
  Post,
  PostLike,
  PostComment,
  Report,
  OfflineSyncLog,
  SiteReview,
  NearbyPlaceReview,
  SiteReviewReply,
  NearbyPlaceReviewReply,
  Friendship
};

module.exports = db;
