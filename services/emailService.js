const { resend, emailConfig } = require('../config/resend.config');
const Logger = require('../utils/logger.util');

// Vietnamese text with diacritics
const VI = {
  title: 'Xác thực tài khoản của bạn',
  body: 'Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP bên dưới:',
  otpLabel: 'Mã OTP của bạn:',
  expiry: 'Mã này sẽ hết hạn sau 10 phút.',
  ignore: 'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
  blessing: 'Chúa là mục tử chăn dắt tôi, tôi chẳng thiếu thốn gì',
  footer: 'Đây là email tự động, vui lòng không trả lời.'
};

class EmailService {
  /**
   * Email template header - Catholic style
   */
  static getEmailHeader() {
    return `
      <div style="background: linear-gradient(135deg, #4a0e4e 0%, #7b1fa2 100%); padding: 30px; text-align: center;">
        <div style="font-size: 48px; color: #ffd700;">&#10013;</div>
        <h1 style="color: #fff; margin: 10px 0 0 0; font-weight: normal; font-style: italic; font-family: Georgia, 'Segoe UI', serif;">Catholic Pilgrimage</h1>
      </div>
    `;
  }

  /**
   * Email template footer - Catholic style
   */
  static getEmailFooter(year) {
    const currentYear = year || new Date().getFullYear();
    return `
      <div style="background: #4a0e4e; padding: 20px; text-align: center;">
        <p style="color: #d4af37; margin: 0; font-size: 14px;">&#10013; Catholic Pilgrimage ${currentYear} &#10013;</p>
        <p style="color: #ccc; font-size: 11px; margin: 10px 0 0 0;">
          ${VI.footer}
        </p>
      </div>
    `;
  }

  /**
   * Send OTP email
   */
  static async sendOTP(email, otp) {
    try {
      Logger.info(`Attempting to send OTP to: ${email}`);

      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">${VI.title}</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        ${VI.body}
      </p>
      
      <div style="background: linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%); padding: 30px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px dashed #d4af37;">
        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">${VI.otpLabel}</p>
        <h1 style="color: #4a0e4e; letter-spacing: 8px; margin: 0; font-size: 36px;">${otp}</h1>
      </div>
      
      <p style="color: #c0392b; font-weight: bold;">
        &#9201; ${VI.expiry}
      </p>
      
      <p style="color: #555; line-height: 1.8;">
        ${VI.ignore}
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "${VI.blessing}"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Tv 23:1</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: 'Mã xác thực OTP - Catholic Pilgrimage',
        html: htmlContent
      });

      if (error) {
        Logger.error('Resend API error:', error);
        throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`);
      }

      Logger.info(`OTP sent successfully to: ${email}, ID: ${data?.id}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send verification approved email
   */
  static async sendVerificationApproved(email, userName, requestCode) {
    try {
      Logger.info(`Sending verification approved email to: ${email}`);
      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Chúc mừng ${userName}!</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Yêu cầu xác minh <strong style="color: #7b1fa2;">${requestCode}</strong> của bạn đã được phê duyệt.
        Bạn đã trở thành <strong>Quản lý địa điểm (Manager)</strong>.
      </p>
      
      <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4caf50;">
        <h4 style="margin: 0 0 15px 0; color: #2e7d32;">Các bước tiếp theo:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #555;">
          <li>Đăng nhập vào ứng dụng</li>
          <li>Tạo và hoàn thiện thông tin địa điểm</li>
          <li>Thêm hình ảnh và lịch lễ</li>
          <li>Mời Hướng dẫn viên (Local Guide) hỗ trợ</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Xin Chúa chúc lành và gìn giữ bạn"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Ds 6:24</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: 'Chúc mừng! Yêu cầu xác minh đã được phê duyệt - Catholic Pilgrimage',
        html: htmlContent
      });

      if (error) {
        Logger.error('Send verification approved email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Verification approved email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send verification rejected email
   */
  static async sendVerificationRejected(email, userName, requestCode, rejectionReason) {
    try {
      Logger.info(`Sending verification rejected email to: ${email}`);
      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Kính chào ${userName},</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Chúng tôi xin thông báo về yêu cầu xác minh <strong style="color: #7b1fa2;">${requestCode}</strong> của bạn.
      </p>
      
      <div style="background: #fef5f5; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #c0392b;">
        <h4 style="margin: 0 0 15px 0; color: #c0392b;">Lý do chưa được phê duyệt:</h4>
        <p style="margin: 0; color: #555; line-height: 1.8;">${rejectionReason}</p>
      </div>
      
      <p style="color: #555; line-height: 1.8;">
        Xin đừng nản lòng. Bạn có thể bổ sung thông tin và gửi lại yêu cầu.
        Nếu cần hỗ trợ, vui lòng liên hệ với chúng tôi.
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Đừng sợ, vì Ta ở với ngươi"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Is 41:10</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: 'Thông báo về yêu cầu xác minh - Catholic Pilgrimage',
        html: htmlContent
      });

      if (error) {
        Logger.error('Send verification rejected email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Verification rejected email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send Local Guide credentials email
   */
  static async sendLocalGuideCredentials(email, fullName, password, siteName) {
    try {
      Logger.info(`Sending credentials to Local Guide: ${email}`);

      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Thông tin tài khoản Local Guide</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Chào mừng đến với Catholic Pilgrimage!</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Xin chào <strong>${fullName}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Bạn đã được thêm làm <strong>Hướng dẫn viên địa phương (Local Guide)</strong> cho địa điểm:
      </p>
      
      <div style="background: linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #d4af37;">
        <p style="color: #4a0e4e; font-size: 18px; font-weight: bold; margin: 0;">&#9962; ${siteName}</p>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Dưới đây là thông tin đăng nhập của bạn:
      </p>
      
      <div style="background: #f8f6f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; width: 100px;">Email:</td>
            <td style="padding: 10px 0; color: #333; font-weight: bold;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; color: #666;">Mật khẩu:</td>
            <td style="padding: 10px 0; color: #4a0e4e; font-weight: bold; font-size: 18px; letter-spacing: 2px;">${password}</td>
          </tr>
        </table>
      </div>
      
      <p style="color: #c0392b; font-weight: bold;">
        &#9888; Vui lòng đổi mật khẩu ngay sau khi đăng nhập lần đầu!
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Hãy đi khắp tứ phương thiên hạ, loan báo Tin Mừng cho mọi loài thụ tạo"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Mc 16:15</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const result = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: `[Catholic Pilgrimage] Thông tin tài khoản Local Guide - ${siteName}`,
        html: htmlContent
      });

      Logger.info(`Local Guide credentials email sent successfully to ${email}`);
      return result;
    } catch (error) {
      Logger.error('Send Local Guide credentials email error:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
