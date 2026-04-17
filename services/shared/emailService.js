const { resend, emailConfig } = require('../../config/resend.config');
const Logger = require('../../utils/logger.util');

// Logo URL
const LOGO_URL = 'https://res.cloudinary.com/dij64ko4y/image/upload/v1770366676/unnamed-removebg-preview_zanilk.png';

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
    const logoHtml = LOGO_URL
      ? `<img src="${LOGO_URL}" alt="Catholic Pilgrimage Logo" style="max-width: 70px; height: auto; margin-bottom: 8px;" />`
      : `<div style="font-size: 36px; color: #ffd700;">&#10013;</div>`;

    return `
      <div style="background: linear-gradient(135deg, #4a0e4e 0%, #7b1fa2 100%); padding: 20px; text-align: center;">
        ${logoHtml}
        <h1 style="color: #fff; margin: 5px 0 0 0; font-weight: normal; font-style: italic; font-family: Georgia, 'Segoe UI', serif; font-size: 20px;">Catholic Pilgrimage</h1>
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
   * Send verification approved email (for Pilgrim with site info)
   */
  static async sendVerificationApprovedWithSite(email, userName, requestCode, siteName, siteCode) {
    try {
      Logger.info(`Sending verification approved email with site info to: ${email}`);
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
      
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #4caf50;">
        <h3 style="margin: 0 0 15px 0; color: #2e7d32; text-align: center;">&#9962; Địa điểm của bạn</h3>
        <div style="text-align: center;">
          <p style="margin: 5px 0; color: #333; font-size: 18px; font-weight: bold;">${siteName}</p>
          <p style="margin: 5px 0; color: #666;">Mã: <strong style="color: #7b1fa2;">${siteCode}</strong></p>
          <p style="margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404; font-size: 14px;">
            ⚠️ Địa điểm đang ở chế độ <strong>Draft</strong> (chưa public)
          </p>
        </div>
      </div>
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h4 style="margin: 0 0 15px 0; color: #1976d2;">Các bước tiếp theo:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #555;">
          <li>Đăng nhập vào ứng dụng</li>
          <li>Hoàn thiện thông tin địa điểm (mô tả, lịch sử, hình ảnh)</li>
          <li>Thêm lịch lễ và sự kiện</li>
          <li><strong>Publish địa điểm</strong> để người hành hương có thể thấy</li>
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
   * Send Manager welcome email with credentials (for guest registration - no site yet)
   */
  static async sendManagerWelcomeNoSite(email, fullName, requestCode, password) {
    try {
      Logger.info(`Sending manager welcome email to: ${email}`);
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
      <h2 style="color: #4a0e4e; font-weight: normal;">Chúc mừng ${fullName}!</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Yêu cầu xác minh <strong style="color: #7b1fa2;">${requestCode}</strong> của bạn đã được phê duyệt.
      </p>
      
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #4caf50; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">🎉</div>
        <h3 style="margin: 0; color: #2e7d32;">Bạn đã trở thành Manager!</h3>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Tài khoản <strong>Quản lý địa điểm (Manager)</strong> đã được tạo cho bạn. Dưới đây là thông tin đăng nhập:
      </p>
      
      <div style="background: #f8f6f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; width: 120px;">Email:</td>
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
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h4 style="margin: 0 0 15px 0; color: #1976d2;">Các bước tiếp theo:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #555;">
          <li>Đăng nhập vào ứng dụng</li>
          <li>Đổi mật khẩu trong phần Cài đặt</li>
          <li><strong>Tạo địa điểm của bạn</strong> (Site)</li>
          <li>Hoàn thiện thông tin địa điểm</li>
          <li>Thêm hình ảnh, lịch lễ và sự kiện</li>
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
        subject: 'Chúc mừng! Tài khoản Manager đã được tạo - Catholic Pilgrimage',
        html: htmlContent
      });

      if (error) {
        Logger.error('Send manager welcome email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Manager welcome email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send Manager welcome email with credentials (for guest registration)
   */
  static async sendManagerWelcome(email, fullName, requestCode, password, siteName, siteCode, siteAddress = null) {
    try {
      Logger.info(`Sending manager welcome email to: ${email}`);
      const currentYear = new Date().getFullYear();

      const addressHtml = siteAddress ? `<p style="margin: 5px 0; color: #666; font-size: 14px;">📍 ${siteAddress}</p>` : '';

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
      <h2 style="color: #4a0e4e; font-weight: normal;">Chúc mừng ${fullName}!</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Yêu cầu xác minh <strong style="color: #7b1fa2;">${requestCode}</strong> của bạn đã được phê duyệt.
      </p>
      
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; border: 2px solid #4caf50;">
        <h3 style="margin: 0 0 15px 0; color: #2e7d32; text-align: center;">&#9962; Địa điểm của bạn</h3>
        <div style="text-align: center;">
          <p style="margin: 5px 0; color: #333; font-size: 18px; font-weight: bold;">${siteName}</p>
          <p style="margin: 5px 0; color: #666;">Mã: <strong style="color: #7b1fa2;">${siteCode}</strong></p>
          ${addressHtml}
          <p style="margin: 10px 0; padding: 10px; background: #fff3cd; border-radius: 5px; color: #856404; font-size: 14px;">
            ⚠️ Địa điểm đang ở chế độ <strong>Draft</strong> (chưa public)
          </p>
        </div>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Tài khoản <strong>Quản lý địa điểm (Manager)</strong> đã được tạo cho bạn. Dưới đây là thông tin đăng nhập:
      </p>
      
      <div style="background: #f8f6f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; color: #666; width: 120px;">Email:</td>
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
      
      <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2196f3;">
        <h4 style="margin: 0 0 15px 0; color: #1976d2;">Các bước tiếp theo:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #555;">
          <li>Đăng nhập vào ứng dụng</li>
          <li>Đổi mật khẩu trong phần Cài đặt</li>
          <li>Hoàn thiện thông tin địa điểm (mô tả, lịch sử, hình ảnh)</li>
          <li>Thêm lịch lễ và sự kiện</li>
          <li><strong>Publish địa điểm</strong> để người hành hương có thể thấy</li>
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
        subject: 'Chúc mừng! Tài khoản Manager đã được tạo - Catholic Pilgrimage',
        html: htmlContent
      });

      if (error) {
        Logger.error('Send manager welcome email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Manager welcome email sent to: ${email}`);
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

  /**
   * Send notification to old manager about being replaced
   */
  static async sendManagerReplacedNotification(email, fullName, siteName, newManagerName) {
    try {
      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Thông báo thay đổi quản lý</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Thông báo thay đổi quản lý</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Kính gửi <strong>${fullName}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Chúng tôi xin thông báo rằng bạn không còn là Manager của <strong>${siteName}</strong>.
      </p>
      
      <div style="background: #f8f6f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="color: #666; margin: 0 0 10px 0;"><strong>Manager mới:</strong> ${newManagerName}</p>
        <p style="color: #666; margin: 0;"><strong>Cơ sở:</strong> ${siteName}</p>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Bạn vẫn có thể sử dụng ứng dụng Catholic Pilgrimage với vai trò Pilgrim (Khách hành hương).
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Cảm ơn bạn đã đóng góp trong vai trò Manager. Chúc bạn mọi điều tốt đẹp!
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Chúa là đá tảng và là thành luỹ chở che tôi"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Tv 18:2</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const result = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: `[Catholic Pilgrimage] Thông báo thay đổi quản lý - ${siteName}`,
        html: htmlContent
      });

      Logger.info(`Manager replaced notification sent to ${email}`);
      return result;
    } catch (error) {
      Logger.error('Send manager replaced notification error:', error);
      throw error;
    }
  }

  /**
   * Send notification to new manager about transition approval
   */
  static async sendTransitionApproved(email, fullName, siteName) {
    try {
      const currentYear = new Date().getFullYear();

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Chúc mừng! Bạn đã được phê duyệt</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">🎉 Chúc mừng! Bạn đã được phê duyệt</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Kính gửi <strong>${fullName}</strong>,
      </p>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Yêu cầu của bạn đã được phê duyệt! Bạn hiện là <strong>Manager</strong> của:
      </p>
      
      <div style="background: linear-gradient(135deg, #fef9e7 0%, #fcf3cf 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 2px solid #d4af37;">
        <h3 style="color: #4a0e4e; margin: 0;">⛪ ${siteName}</h3>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        <strong>Những việc cần làm:</strong>
      </p>
      <ul style="color: #333; line-height: 2;">
        <li>Quản lý danh sách Local Guide của địa điểm</li>
        <li>Kiểm tra và duyệt các nội dung đang chờ xử lý</li>
        <li>Cập nhật thông tin cơ sở nếu cần</li>
      </ul>
      
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
        subject: `[Catholic Pilgrimage] Chúc mừng! Bạn đã được phê duyệt làm Manager - ${siteName}`,
        html: htmlContent
      });

      Logger.info(`Transition approved email sent to ${email}`);
      return result;
    } catch (error) {
      Logger.error('Send transition approved email error:', error);
      throw error;
    }
  }

  /**
   * Send group invitation email
   */
  static async sendGroupInvitation(email, inviterName, groupName, token) {
    try {
      Logger.info(`Sending group invitation to: ${email}`);
      const currentYear = new Date().getFullYear();

      // Define separate URLs for the button and the generated QR code (if any)
      // Buttons in emails often block custom schemes like 'pilgrimapp://', so we use a fallback web URL.
      const buttonUrl = `${process.env.FRONTEND_URL || 'https://catholicpilgrimage.id.vn'}/groups/invitations/${token}`;
      const qrUrl = `pilgrimapp://groups/invitations/${token}`;

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Lời mời tham gia nhóm</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Lời mời tham gia nhóm</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        <strong>${inviterName}</strong> đã mời bạn tham gia nhóm:
      </p>
      
      <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #4caf50;">
        <h3 style="color: #2e7d32; margin: 0; font-size: 22px;">${groupName}</h3>
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Nhóm này là nơi để chia sẻ kinh nghiệm hành hương, cầu nguyện và kết nối với cộng đồng Công giáo.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${buttonUrl}" style="display: inline-block; background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          Xem Lời Mời
        </a>
      </div>
      
      <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
        Lời mời này sẽ hết hạn sau 7 ngày.
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Vì ở đâu có hai ba người họp lại nhân danh Thầy, thì Thầy ở giữa họ"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Mt 18:20</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: `Lời mời tham gia nhóm "${groupName}" - Catholic Pilgrimage`,
        html: htmlContent
      });

      if (error) {
        Logger.error('Send group invitation email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Group invitation email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }

  /**
   * Send planner invitation email with QR code
   */
  static async sendPlannerInvitation(email, inviterName, plannerName, token, plannerDetails = {}) {
    try {
      Logger.info(`Sending planner invitation to: ${email}`);
      const currentYear = new Date().getFullYear();
      const QRCode = require('qrcode');
      const { cloudinary } = require('../../config/cloudinary.config');

      // Define separate URLs: one for the email button (HTTPS) and one for the QR code (Deep link)
      const buttonUrl = `${process.env.FRONTEND_URL || 'https://catholicpilgrimage.id.vn'}/planners/invite/${token}`;
      const qrUrl = `pilgrimapp://planners/invite/${token}`;

      // Generate QR code as base64 data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#4a0e4e',
          light: '#ffffff'
        }
      });

      // Upload QR code to Cloudinary for email compatibility (Gmail doesn't support base64 images)
      let qrCodeUrl = qrCodeDataUrl; // fallback to base64 if upload fails
      try {
        const uploadResult = await cloudinary.uploader.upload(qrCodeDataUrl, {
          folder: 'catholic_pilgrimage/qr_codes',
          public_id: `invite_${token}`,
          overwrite: true
        });
        qrCodeUrl = uploadResult.secure_url;
        Logger.info(`QR code uploaded to Cloudinary: ${qrCodeUrl}`);
      } catch (uploadError) {
        Logger.warn(`Failed to upload QR code to Cloudinary, using base64: ${uploadError.message}`);
      }

      // Format planner details
      const { start_date, end_date, number_of_days, number_of_people, transportation } = plannerDetails;

      const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const d = new Date(dateStr);
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      };

      const transportMap = {
        car: '🚗 Ô tô',
        bus: '🚌 Xe buýt',
        motorbike: '🏍️ Xe máy',
        walk: '🚶 Đi bộ',
        train: '🚂 Tàu hỏa',
        plane: '✈️ Máy bay',
        other: '🚐 Khác'
      };
      const transportLabel = transportMap[transportation] || transportation || '—';

      const plannerInfoHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">📅 Ngày đi</td>
            <td style="padding: 8px 12px; color: #333; font-weight: bold; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${formatDate(start_date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">📅 Ngày về</td>
            <td style="padding: 8px 12px; color: #333; font-weight: bold; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${formatDate(end_date)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">🗓️ Số ngày</td>
            <td style="padding: 8px 12px; color: #333; font-weight: bold; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${number_of_days || '—'} ngày</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #666; font-size: 14px; border-bottom: 1px solid #e0e0e0;">👥 Số người</td>
            <td style="padding: 8px 12px; color: #333; font-weight: bold; font-size: 14px; border-bottom: 1px solid #e0e0e0;">${number_of_people || '—'} người</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; color: #666; font-size: 14px;">🚗 Phương tiện</td>
            <td style="padding: 8px 12px; color: #333; font-weight: bold; font-size: 14px;">${transportLabel}</td>
          </tr>
        </table>`;

      const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Lời mời tham gia kế hoạch hành hương</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  <div style="font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
    ${this.getEmailHeader()}
    
    <div style="padding: 30px; background: #fff;">
      <h2 style="color: #4a0e4e; font-weight: normal;">Lời mời tham gia kế hoạch hành hương</h2>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        <strong>${inviterName}</strong> đã mời bạn tham gia kế hoạch hành hương:
      </p>
      
      <div style="background: linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%); padding: 25px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #3f51b5;">
        <h3 style="color: #283593; margin: 0; font-size: 22px;">📋 ${plannerName}</h3>
        <p style="color: #5c6bc0; margin: 10px 0 0 0; font-size: 14px;">Vai trò: <strong>Người xem</strong></p>
        ${plannerInfoHtml}
      </div>
      
      <p style="color: #333; line-height: 1.8; font-size: 16px;">
        Hãy cùng nhau lập kế hoạch hành hương, khám phá các nhà thờ và thánh địa Công giáo.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${buttonUrl}" style="display: inline-block; background: linear-gradient(135deg, #3f51b5 0%, #303f9f 100%); color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          Xem lời mời
        </a>
      </div>

      <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f5f5f5; border-radius: 8px;">
        <p style="color: #666; font-size: 14px; margin: 0 0 10px 0;">Hoặc quét mã QR để xem lời mời:</p>
        <img src="${qrCodeUrl}" alt="QR Code" style="width: 200px; height: 200px; border-radius: 8px;" />
      </div>
      
      <p style="color: #999; font-size: 14px; text-align: center; margin-top: 20px;">
        Lời mời này sẽ hết hạn sau 7 ngày.
      </p>
      
      <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f6f0; border-radius: 8px;">
        <p style="color: #7b1fa2; font-style: italic; margin: 0;">
          "Hãy lên đường, Thầy sai anh em đi"
        </p>
        <p style="color: #999; font-size: 12px; margin: 10px 0 0 0;">- Lc 10:3</p>
      </div>
    </div>
    
    ${this.getEmailFooter(currentYear)}
  </div>
</body>
</html>`;

      const { data, error } = await resend.emails.send({
        from: emailConfig.from,
        to: email,
        subject: `Lời mời tham gia kế hoạch "${plannerName}" - Catholic Pilgrimage`,
        html: htmlContent
      });

      if (error) {
        Logger.error('Send planner invitation email error:', error);
        throw new Error(`Failed to send email: ${error.message}`);
      }

      Logger.info(`Planner invitation email sent to: ${email}`);
      return data;
    } catch (error) {
      Logger.error('Email service error:', error);
      throw error;
    }
  }
}

module.exports = EmailService;
