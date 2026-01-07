const nodemailer = require('nodemailer');
const prisma = require('../config/database');

/**
 * Email service for sending PIN notifications and other emails
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter based on environment configuration
   */
  initializeTransporter() {
    try {
      if (process.env.SENDGRID_API_KEY) {
        // Use SendGrid
        this.transporter = nodemailer.createTransporter({
          service: 'SendGrid',
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        this.isConfigured = true;
        console.log('Email service initialized with SendGrid');
      } else if (process.env.SMTP_HOST) {
        // Use custom SMTP
        this.transporter = nodemailer.createTransporter({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        this.isConfigured = true;
        console.log('Email service initialized with SMTP');
      } else if (process.env.NODE_ENV === 'development') {
        // Use Ethereal for development testing
        this.createTestAccount();
      } else {
        console.warn('No email service configured. Email notifications will be disabled.');
      }
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.isConfigured = false;
    }
  }

  /**
   * Create test account for development
   */
  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      this.isConfigured = true;
      console.log('Email service initialized with test account:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
    }
  }

  /**
   * Send PIN email to member
   */
  async sendPin(member) {
    if (!this.isConfigured) {
      console.warn('Email service not configured. PIN email not sent.');
      return this.logEmail(member.id, 'pin', 'Your Church Attendance PIN', 'failed', 'Email service not configured');
    }

    try {
      const churchName = process.env.CHURCH_NAME || 'Your Church';
      const churchEmail = process.env.FROM_EMAIL || 'noreply@yourchurch.com';
      const churchDisplayName = process.env.FROM_NAME || churchName;

      const mailOptions = {
        from: `"${churchDisplayName}" <${churchEmail}>`,
        to: member.email,
        subject: `Your ${churchName} Attendance PIN`,
        html: this.generatePinEmailTemplate(member, churchName),
        text: this.generatePinEmailText(member, churchName),
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log successful email
      await this.logEmail(member.id, 'pin', mailOptions.subject, 'sent');
      
      console.log(`PIN email sent to ${member.email}`, { messageId: result.messageId });
      
      // Log preview URL for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(result));
      }

      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Error sending PIN email:', error);
      
      // Log failed email
      await this.logEmail(member.id, 'pin', 'Your Church Attendance PIN', 'failed', error.message);
      
      throw error;
    }
  }

  /**
   * Generate PIN email HTML template
   */
  generatePinEmailTemplate(member, churchName) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Attendance PIN</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
            .church-name { color: #3B82F6; font-size: 24px; font-weight: bold; margin: 0; }
            .pin-box { background-color: #F3F4F6; border: 2px dashed #6B7280; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
            .pin-number { font-size: 32px; font-weight: bold; color: #1F2937; letter-spacing: 8px; margin: 10px 0; }
            .pin-label { font-size: 14px; color: #6B7280; text-transform: uppercase; margin-bottom: 5px; }
            .instructions { background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
            .instructions h3 { color: #1E40AF; margin-top: 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="church-name">${churchName}</h1>
                <p>Welcome to our Attendance System</p>
            </div>
            
            <h2>Hello ${member.name},</h2>
            
            <p>Welcome to ${churchName}! You have been registered in our attendance system. Here is your personal 5-digit PIN for checking in to church services and events:</p>
            
            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${member.pin}</div>
            </div>
            
            <div class="instructions">
                <h3>How to use your PIN:</h3>
                <ol>
                    <li>Look for the QR code at the entrance of church services or events</li>
                    <li>Scan the QR code with your smartphone camera</li>
                    <li>Answer the location verification question</li>
                    <li>Enter your 5-digit PIN: <strong>${member.pin}</strong></li>
                    <li>You're checked in!</li>
                </ol>
            </div>
            
            <p><strong>Important:</strong> Please keep this PIN secure and don't share it with others. You'll need it every time you attend church services or events.</p>
            
            <p>If you have any questions about using the attendance system, please contact our church office.</p>
            
            <p>God bless,<br>
            The ${churchName} Team</p>
            
            <div class="footer">
                <p>This email was sent to ${member.email}</p>
                <p>If you received this email by mistake, please contact us immediately.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  /**
   * Generate PIN email plain text version
   */
  generatePinEmailText(member, churchName) {
    return `
Hello ${member.name},

Welcome to ${churchName}! You have been registered in our attendance system.

Your Personal PIN: ${member.pin}

How to use your PIN:
1. Look for the QR code at the entrance of church services or events
2. Scan the QR code with your smartphone camera
3. Answer the location verification question
4. Enter your 5-digit PIN: ${member.pin}
5. You're checked in!

Important: Please keep this PIN secure and don't share it with others.

If you have any questions, please contact our church office.

God bless,
The ${churchName} Team

---
This email was sent to ${member.email}
If you received this email by mistake, please contact us immediately.
    `;
  }

  /**
   * Send reminder email for upcoming session
   */
  async sendSessionReminder(member, session) {
    if (!this.isConfigured) {
      console.warn('Email service not configured. Reminder email not sent.');
      return;
    }

    try {
      const churchName = process.env.CHURCH_NAME || 'Your Church';
      const churchEmail = process.env.FROM_EMAIL || 'noreply@yourchurch.com';
      const churchDisplayName = process.env.FROM_NAME || churchName;

      const sessionDate = new Date(session.startTime).toLocaleDateString();
      const sessionTime = new Date(session.startTime).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const mailOptions = {
        from: `"${churchDisplayName}" <${churchEmail}>`,
        to: member.email,
        subject: `Reminder: ${session.theme} - ${sessionDate}`,
        html: `
          <h2>Upcoming Event Reminder</h2>
          <p>Dear ${member.name},</p>
          <p>This is a reminder about the upcoming church event:</p>
          <h3>${session.theme}</h3>
          <p><strong>Date:</strong> ${sessionDate}<br>
          <strong>Time:</strong> ${sessionTime}</p>
          <p>Don't forget to bring your PIN: <strong>${member.pin}</strong></p>
          <p>See you there!</p>
          <p>The ${churchName} Team</p>
        `,
        text: `
Upcoming Event Reminder

Dear ${member.name},

This is a reminder about the upcoming church event:

${session.theme}
Date: ${sessionDate}
Time: ${sessionTime}

Don't forget to bring your PIN: ${member.pin}

See you there!

The ${churchName} Team
        `,
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      // Log successful email
      await this.logEmail(member.id, 'reminder', mailOptions.subject, 'sent');
      
      console.log(`Reminder email sent to ${member.email}`);
      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error('Error sending reminder email:', error);
      await this.logEmail(member.id, 'reminder', 'Event Reminder', 'failed', error.message);
      throw error;
    }
  }

  /**
   * Log email attempt to database
   */
  async logEmail(memberId, type, subject, status, errorMsg = null) {
    try {
      await prisma.emailLog.create({
        data: {
          memberId,
          type,
          subject,
          status,
          errorMsg,
        },
      });
    } catch (error) {
      console.error('Error logging email:', error);
    }
  }

  /**
   * Test email configuration
   */
  async testConfiguration() {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    try {
      await this.transporter.verify();
      console.log('Email configuration test passed');
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      throw error;
    }
  }

  /**
   * Send bulk emails to multiple members
   */
  async sendBulkEmails(members, subject, htmlContent, textContent) {
    if (!this.isConfigured) {
      throw new Error('Email service not configured');
    }

    const results = [];
    const churchEmail = process.env.FROM_EMAIL || 'noreply@yourchurch.com';
    const churchDisplayName = process.env.FROM_NAME || 'Your Church';

    for (const member of members) {
      try {
        const mailOptions = {
          from: `"${churchDisplayName}" <${churchEmail}>`,
          to: member.email,
          subject: subject.replace('{{name}}', member.name),
          html: htmlContent.replace(/{{name}}/g, member.name).replace(/{{pin}}/g, member.pin),
          text: textContent.replace(/{{name}}/g, member.name).replace(/{{pin}}/g, member.pin),
        };

        const result = await this.transporter.sendMail(mailOptions);
        
        await this.logEmail(member.id, 'bulk', subject, 'sent');
        
        results.push({
          memberId: member.id,
          email: member.email,
          success: true,
          messageId: result.messageId,
        });

      } catch (error) {
        await this.logEmail(member.id, 'bulk', subject, 'failed', error.message);
        
        results.push({
          memberId: member.id,
          email: member.email,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }
}

// Export singleton instance
module.exports = new EmailService();