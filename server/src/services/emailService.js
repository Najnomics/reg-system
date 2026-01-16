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
        // Use SendGrid SMTP
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          secure: false,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        this.isConfigured = true;
        console.log('✅ Email service initialized with SendGrid SMTP');
      } else if (process.env.SMTP_HOST) {
        // Use custom SMTP (Gmail or other SMTP server)
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
          console.error('❌ SMTP configuration incomplete. SMTP_USER and SMTP_PASS are required.');
          console.error('Current SMTP config:', {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            user: process.env.SMTP_USER ? '***set***' : 'MISSING',
            pass: process.env.SMTP_PASS ? '***set***' : 'MISSING',
          });
          this.isConfigured = false;
          return;
        }
        
        // Gmail-specific configuration
        if (process.env.SMTP_HOST.includes('gmail.com')) {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            // Add connection timeout settings
            connectionTimeout: 10000, // 10 seconds
            socketTimeout: 10000, // 10 seconds
            greetingTimeout: 10000, // 10 seconds
          });
        } else {
          // Generic SMTP configuration
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            // Add connection timeout settings
            connectionTimeout: 10000, // 10 seconds
            socketTimeout: 10000, // 10 seconds
            greetingTimeout: 10000, // 10 seconds
          });
        }
        this.isConfigured = true;
        console.log(`✅ Email service initialized with SMTP (${process.env.SMTP_HOST})`);
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
      
      this.transporter = nodemailer.createTransport({
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
    // Check if email service is properly configured
    if (!this.isConfigured || !this.transporter) {
      const errorMsg = 'Email service not configured. Please configure SENDGRID_API_KEY or SMTP settings in .env file.';
      console.error('❌ Email service error:', errorMsg);
      console.error('Current config:', {
        hasSendGridKey: !!process.env.SENDGRID_API_KEY,
        hasSmtpHost: !!process.env.SMTP_HOST,
        smtpHost: process.env.SMTP_HOST || 'not set',
        smtpUser: process.env.SMTP_USER ? '***set***' : 'MISSING',
        smtpPass: process.env.SMTP_PASS ? '***set***' : 'MISSING',
        nodeEnv: process.env.NODE_ENV,
        isConfigured: this.isConfigured,
        hasTransporter: !!this.transporter,
      });
      
      // Provide helpful Gmail-specific error message
      if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail.com')) {
        const gmailError = 'Gmail SMTP requires an App Password. Regular Gmail password will not work. Please:\n1. Enable 2-Step Verification on your Google account\n2. Generate an App Password at https://myaccount.google.com/apppasswords\n3. Use the App Password as SMTP_PASS in your .env file';
        console.error('📧 Gmail Configuration Help:', gmailError);
      }
      
      try {
        await this.logEmail(member.id, 'pin', 'Your Church Attendance PIN', 'failed', errorMsg);
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
      
      throw new Error(errorMsg);
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

      console.log(`Attempting to send PIN email to ${member.email}...`);
      const result = await this.transporter.sendMail(mailOptions);
      
      // Log successful email
      try {
        await this.logEmail(member.id, 'pin', mailOptions.subject, 'sent');
      } catch (logError) {
        console.error('Failed to log email success:', logError);
      }
      
      console.log(`✅ PIN email sent successfully to ${member.email}`, { messageId: result.messageId });
      
      // Log preview URL for development
      if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
        const previewUrl = nodemailer.getTestMessageUrl(result);
        if (previewUrl) {
          console.log('📧 Preview URL: %s', previewUrl);
        }
      }

      return { success: true, messageId: result.messageId };

    } catch (error) {
      console.error(`❌ Error sending PIN email to ${member.email}:`, error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command,
        stack: error.stack,
      });
      
      // Provide specific Gmail error guidance
      if (process.env.SMTP_HOST && process.env.SMTP_HOST.includes('gmail.com')) {
        if (error.code === 'EAUTH' || error.message?.includes('authentication') || error.message?.includes('Invalid login')) {
          console.error('📧 Gmail Authentication Error:');
          console.error('   Gmail requires an App Password, not your regular password.');
          console.error('   Steps to fix:');
          console.error('   1. Go to https://myaccount.google.com/security');
          console.error('   2. Enable 2-Step Verification');
          console.error('   3. Go to https://myaccount.google.com/apppasswords');
          console.error('   4. Generate an App Password for "Mail"');
          console.error('   5. Use that 16-character password as SMTP_PASS in your .env file');
        } else if (error.code === 'ECONNECTION' || error.message?.includes('connection')) {
          console.error('📧 Gmail Connection Error:');
          console.error('   Check your internet connection and firewall settings.');
          console.error('   Gmail SMTP requires port 587 to be open.');
        }
      }
      
      // Log failed email
      try {
        await this.logEmail(member.id, 'pin', 'Your Church Attendance PIN', 'failed', error.message || 'Unknown error');
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
      
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
            
            <p>Welcome to ${churchName}! You have been registered in our attendance system. Here is your personal 4-digit PIN for checking in to church services and events:</p>
            
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
                    <li>Enter your 4-digit PIN: <strong>${member.pin}</strong></li>
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
4. Enter your 4-digit PIN: ${member.pin}
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