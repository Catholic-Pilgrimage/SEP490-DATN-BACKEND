/**
 * @swagger
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - full_name
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           example: "123456"
 *         full_name:
 *           type: string
 *           example: "Nguyen Van A"
 *         phone:
 *           type: string
 *           example: "0123456789"
 *         date_of_birth:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *
 *     LoginRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: user@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: "123456"
 *
 *     UpdateProfileRequest:
 *       type: object
 *       properties:
 *         full_name:
 *           type: string
 *           example: "Nguyen Van B"
 *         phone:
 *           type: string
 *           example: "0987654321"
 *         date_of_birth:
 *           type: string
 *           format: date
 *           example: "1995-05-15"
 *         language:
 *           type: string
 *           enum: [vi, en]
 *           example: "en"
 *
 *     ChangePasswordRequest:
 *       type: object
 *       required:
 *         - current_password
 *         - new_password
 *         - confirm_password
 *       properties:
 *         current_password:
 *           type: string
 *           format: password
 *           example: "OldPass123@"
 *         new_password:
 *           type: string
 *           format: password
 *           example: "NewPass123@"
 *           description: "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt"
 *         confirm_password:
 *           type: string
 *           format: password
 *           example: "NewPass123@"
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *
 *     VerifyOtpRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           example: "123456"
 *           description: "Mã OTP 6 số nhận qua email"
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required:
 *         - email
 *         - otp
 *         - new_password
 *         - confirm_password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: "user@example.com"
 *         otp:
 *           type: string
 *           example: "123456"
 *           description: "Mã OTP 6 số nhận qua email"
 *         new_password:
 *           type: string
 *           format: password
 *           example: "NewPass123@"
 *           description: "Tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt"
 *         confirm_password:
 *           type: string
 *           format: password
 *           example: "NewPass123@"
 *
 *     RefreshTokenRequest:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *     LogoutRequest:
 *       type: object
 *       description: Không cần body, chỉ cần Bearer token trong header
 *
 *     UserResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         email:
 *           type: string
 *         full_name:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, pilgrim, local_guide]
 *         avatar_url:
 *           type: string
 *
 *     UserProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *         full_name:
 *           type: string
 *           example: "Nguyen Van A"
 *         avatar_url:
 *           type: string
 *           example: "https://example.com/avatar.jpg"
 *         phone:
 *           type: string
 *           example: "0123456789"
 *         date_of_birth:
 *           type: string
 *           format: date
 *           example: "1990-01-01"
 *         role:
 *           type: string
 *           enum: [admin, pilgrim, local_guide]
 *           example: "pilgrim"
 *         status:
 *           type: string
 *           enum: [active, banned]
 *           example: "active"
 *         language:
 *           type: string
 *           enum: [vi, en]
 *           example: "vi"
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     RegisterResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "User registered successfully"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserResponse'
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               $ref: '#/components/schemas/UserResponse'
 *             accessToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Login successful"
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             refreshToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *     RefreshTokenResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Token refreshed successfully"
 *         data:
 *           type: object
 *           properties:
 *             accessToken:
 *               type: string
 *               example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Invalid email or password"
 *             details:
 *               type: array
 *               items:
 *                 type: object
 */
