const bcrypt = require('bcryptjs');
const { User, RefreshToken, BlacklistedToken, PasswordReset } = require('../../models');
const JwtUtil = require('../../utils/jwt.util');
const Logger = require('../../utils/logger.util');
const EmailService = require('./emailService');

class AuthService {
    /**
     * Đăng ký tài khoản mới
     * @param {Object} userData - Thông tin người dùng (email, password, full_name, phone, date_of_birth, language)
     * @returns {Object} - Thông tin user và tokens (accessToken, refreshToken)
     */
    static async register(userData) {
        try {
            const { email, password, full_name, phone, date_of_birth, language } = userData;


            const normalizedEmail = email.toLowerCase().trim();


            const existingUser = await User.findOne({ where: { email: normalizedEmail } });
            if (existingUser) {
                throw new Error('Email already registered');
            }


            const password_hash = await bcrypt.hash(password, 10);

            const user = await User.create({
                email: normalizedEmail,
                password_hash,
                full_name,
                phone,
                date_of_birth,
                language: language || 'vi'
            });

            Logger.info(`User registered: ${normalizedEmail}`);

            return {
                user: {
                    id: user.id,
                    email: user.email,
                    full_name: user.full_name,
                    role: user.role
                }
            };
        } catch (error) {
            Logger.error('Register error:', error);
            throw error;
        }
    }

    /**
     * Đăng nhập vào hệ thống
     * @param {string} email - Email người dùng
     * @param {string} password - Mật khẩu
     * @returns {Object} - Tokens (accessToken, refreshToken)
     */
    static async login(email, password) {
        try {

            const normalizedEmail = email.toLowerCase().trim();


            const user = await User.findOne({ where: { email: normalizedEmail } });
            if (!user) {
                throw new Error('Invalid email or password');
            }


            if (user.status === 'banned') {
                throw new Error('Account is banned');
            }


            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }


            const accessToken = JwtUtil.generateAccessToken(user.id);
            const refreshToken = JwtUtil.generateRefreshToken(user.id);


            const tokenHash = JwtUtil.hashToken(refreshToken);
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            await RefreshToken.create({
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: expiresAt
            });

            Logger.info(`User logged in: ${email}`);

            return {
                accessToken,
                refreshToken
            };
        } catch (error) {
            Logger.error('Login error:', error);
            throw error;
        }
    }

    /**
     * Làm mới access token bằng refresh token
     * @param {string} refreshToken - Refresh token
     * @returns {Object} - Access token mới
     */
    static async refreshToken(refreshToken) {
        try {

            const decoded = JwtUtil.verifyToken(refreshToken);
            if (!decoded) {
                throw new Error('Invalid refresh token');
            }


            if (decoded.type !== 'refresh') {
                throw new Error('Invalid token type');
            }


            const tokenHash = JwtUtil.hashToken(refreshToken);
            const storedToken = await RefreshToken.findOne({
                where: { token_hash: tokenHash, user_id: decoded.userId }
            });

            if (!storedToken) {
                throw new Error('Refresh token not found');
            }


            if (new Date() > storedToken.expires_at) {
                await storedToken.destroy();
                throw new Error('Refresh token expired');
            }


            const newAccessToken = JwtUtil.generateAccessToken(decoded.userId);

            return { accessToken: newAccessToken };
        } catch (error) {
            Logger.error('Refresh token error:', error);
            throw error;
        }
    }

    /**
     * Lấy thông tin profile của user đang đăng nhập
     * @param {string} userId - ID của user
     * @returns {Object} - Thông tin user
     */
    static async getProfile(userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: { exclude: ['password_hash'] }
            });

            if (!user) {
                throw new Error('User not found');
            }

            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                phone: user.phone,
                date_of_birth: user.date_of_birth,
                role: user.role,
                status: user.status,
                language: user.language,
                created_at: user.created_at,
                updated_at: user.updated_at
            };
        } catch (error) {
            Logger.error('Get profile error:', error);
            throw error;
        }
    }

    /**
     * Cập nhật thông tin profile
     * @param {string} userId - ID của user
     * @param {Object} updateData - Dữ liệu cần cập nhật (full_name, phone, date_of_birth, avatar_url, language)
     * @returns {Object} - Thông tin user đã cập nhật
     */
    static async updateProfile(userId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Chỉ cho phép update các field này
            const allowedFields = ['full_name', 'phone', 'date_of_birth', 'avatar_url', 'language'];
            const dataToUpdate = {};

            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    dataToUpdate[field] = updateData[field];
                }
            });

            await user.update(dataToUpdate);

            Logger.info(`Profile updated: ${userId}`);

            return {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                avatar_url: user.avatar_url,
                phone: user.phone,
                date_of_birth: user.date_of_birth,
                role: user.role,
                status: user.status,
                language: user.language,
                created_at: user.created_at,
                updated_at: user.updated_at
            };
        } catch (error) {
            Logger.error('Update profile error:', error);
            throw error;
        }
    }

    /**
     * Đổi mật khẩu
     * @param {string} userId - ID của user
     * @param {string} currentPassword - Mật khẩu hiện tại
     * @param {string} newPassword - Mật khẩu mới
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                throw new Error('User not found');
            }

          
            const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Current password is incorrect');
            }

          
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

          
            await user.update({ password_hash: newPasswordHash });

           
            await RefreshToken.destroy({ where: { user_id: userId } });

            Logger.info(`Password changed: ${userId}`);
        } catch (error) {
            Logger.error('Change password error:', error);
            throw error;
        }
    }

    /**
     * Gửi OTP để reset mật khẩu
     * @param {string} email - Email người dùng
     */
    static async forgotPassword(email) {
        try {
            const normalizedEmail = email.toLowerCase().trim();

            const user = await User.findOne({ where: { email: normalizedEmail } });
            if (!user) {
                throw new Error('Email not found');
            }

          
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

            await PasswordReset.create({
                user_id: user.id,
                email: normalizedEmail,
                otp,
                expires_at: expiresAt
            });

            await EmailService.sendOTP(normalizedEmail, otp);

            Logger.info(`Password reset OTP sent to: ${normalizedEmail}`);
        } catch (error) {
            Logger.error('Forgot password error:', error);
            throw error;
        }
    }

    /**
     * Verify OTP và reset mật khẩu
     * @param {string} email - Email người dùng
     * @param {string} otp - Mã OTP
     * @param {string} newPassword - Mật khẩu mới
     */
    static async resetPassword(email, otp, newPassword) {
        try {
            const normalizedEmail = email.toLowerCase().trim();

            // Find user first
            const user = await User.findOne({ where: { email: normalizedEmail } });
            if (!user) {
                throw new Error('User not found');
            }

            // Find OTP record by user_id
            const resetRecord = await PasswordReset.findOne({
                where: {
                    user_id: user.id,
                    otp,
                    is_used: false
                },
                order: [['created_at', 'DESC']]
            });

            if (!resetRecord) {
                throw new Error('Invalid OTP');
            }

      
            if (new Date() > resetRecord.expires_at) {
                throw new Error('OTP has expired');
            }

          
            const newPasswordHash = await bcrypt.hash(newPassword, 10);

          
            await user.update({ password_hash: newPasswordHash });

        
            await resetRecord.update({ is_used: true });

            await RefreshToken.destroy({ where: { user_id: user.id } });

            Logger.info(`Password reset successful: ${normalizedEmail}`);
        } catch (error) {
            Logger.error('Reset password error:', error);
            throw error;
        }
    }

    /**
     * Đăng xuất - Xóa tất cả refresh tokens và blacklist access token
     * @param {string} accessToken - Access token cần blacklist
     * @param {string} userId - ID của user
     */
    static async logout(accessToken, userId) {
        try {
            // Xóa tất cả refresh tokens của user
            await RefreshToken.destroy({ where: { user_id: userId } });

            // Blacklist access token
            if (accessToken) {
                const decoded = JwtUtil.verifyToken(accessToken);
                if (decoded) {
                    const expiresAt = new Date(decoded.exp * 1000); // JWT exp is in seconds
                    await BlacklistedToken.create({
                        token: accessToken,
                        expires_at: expiresAt
                    });
                }
            }

            Logger.info(`User logged out: ${userId}`);
        } catch (error) {
            Logger.error('Logout error:', error);
            throw error;
        }
    }
}

module.exports = AuthService;
