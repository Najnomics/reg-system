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
            // Increased timeout settings for Railway/Gmail
            connectionTimeout: 120000,
            socketTimeout: 120000,
            greetingTimeout: 60000,
            // Additional Gmail-specific settings
            pool: true,
            maxConnections: 1,
            maxMessages: 100,
          });
        } else {
          // Generic SMTP configuration
          // Check if it's Namecheap Private Email for optimized settings
          const isNamecheap = process.env.SMTP_HOST && (
            process.env.SMTP_HOST.includes('privateemail.com') ||
            process.env.SMTP_HOST.includes('homecomming26.com')
          );
          
          this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASS,
            },
            // Optimized timeout settings
            connectionTimeout: isNamecheap ? 15000 : 30000, // 15s for Namecheap, 30s for others
            socketTimeout: isNamecheap ? 15000 : 30000,
            greetingTimeout: isNamecheap ? 10000 : 30000,
            // Connection pooling for better performance
            pool: true,
            maxConnections: isNamecheap ? 5 : 1, // Namecheap allows more concurrent connections
            maxMessages: isNamecheap ? 100 : 3, // Send more messages per connection
            rateDelta: isNamecheap ? 1000 : 1000, // Rate limit: 1 message per second
            rateLimit: isNamecheap ? 50 : 5, // Max 50 messages per rateDelta for Namecheap
          });
        }
        this.isConfigured = true;
        console.log(`✅ Email service initialized with SMTP (${process.env.SMTP_HOST})`);
        this.initializeFallback();
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
   * Second mailbox used only after the primary account rejects a send for its daily cap.
   */
  initializeFallback() {
    this.fallbackTransporter = null;
    this.usingFallback = false;
    const user = (process.env.SMTP_FALLBACK_USER || '').trim();
    const pass = (process.env.SMTP_FALLBACK_PASS || '').replace(/\s+/g, '');
    if (!user || !pass) return;

    this.fallbackFrom = user;
    this.fallbackTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
      connectionTimeout: 30000,
      socketTimeout: 30000,
      greetingTimeout: 30000,
      pool: true,
      maxConnections: 1,
      maxMessages: 100,
    });
    console.log('✅ Fallback mailbox configured');
  }

  isDailySendCap(error) {
    const text = `${error && error.message ? error.message : ''} ${error && error.response ? error.response : ''}`.toLowerCase();
    return text.includes('5.4.5')
      || text.includes('daily user sending')
      || text.includes('daily sending')
      || text.includes('sending limit')
      || text.includes('limit for sending')
      || text.includes('quota exceeded');
  }

  withFallbackFrom(mailOptions) {
    const displayName = process.env.FROM_NAME || process.env.CHURCH_NAME || 'Grace Edge Ministries';
    return {
      ...mailOptions,
      from: `"${displayName}" <${this.fallbackFrom}>`,
    };
  }

  async deliver(mailOptions) {
    if (this.usingFallback) {
      if (!this.fallbackTransporter) throw new Error('Primary mailbox is over its daily sending cap and no fallback mailbox is configured');
      return this.fallbackTransporter.sendMail(this.withFallbackFrom(mailOptions));
    }

    try {
      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      if (!this.isDailySendCap(error) || !this.fallbackTransporter) throw error;
      console.warn('Primary mailbox hit its daily sending cap. Switching to the fallback mailbox.');
      this.usingFallback = true;
      return this.fallbackTransporter.sendMail(this.withFallbackFrom(mailOptions));
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
  async sendPin(member, event = null) {
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

    const memberEvent = await this.resolveMemberEvent(member, event);
    if (memberEvent && !memberEvent.hasChariots) {
      return this.sendEventPin(member, memberEvent);
    }

    try {
      const churchName = process.env.CHURCH_NAME || 'Your Church';
      const churchEmail = process.env.FROM_EMAIL || 'noreply@yourchurch.com';
      const churchDisplayName = process.env.FROM_NAME || churchName;
      const emailData = await this.buildPinEmailData(member);

      const htmlContent = this.generatePinEmailTemplate(emailData, churchName);
      const textContent = this.generatePinEmailText(emailData, churchName);

      const mailOptions = {
        from: `"${churchDisplayName}" <${churchEmail}>`,
        to: member.email,
        subject: `Your ${churchName} Attendance PIN`,
        html: htmlContent,
        text: textContent,
      };

      const isNewTemplate = htmlContent.includes('HomeComing Conference 2026');
      console.log(`📧 [EMAIL v2.0] Attempting to send PIN email to ${member.email}...`);
      console.log(`   Template check: ${isNewTemplate ? '✅ NEW TEMPLATE' : '❌ OLD TEMPLATE'}`);
      console.log(`   Template version: ${isNewTemplate ? 'HomeComing 2026' : 'Legacy'}`);
      console.log(`   Chariot: ${emailData.chariotName || 'Not assigned'}`);
      console.log(`   Role: ${emailData.roleLabel || 'Member'}`);
      
      if (!isNewTemplate) {
        console.error('⚠️ WARNING: Old email template is being used! Expected "HomeComing Conference 2026" template.');
      }
      console.log(`   From: ${mailOptions.from}`);
      console.log(`   SMTP Host: ${process.env.SMTP_HOST || 'N/A'}`);
      console.log(`   SMTP Port: ${process.env.SMTP_PORT || 'N/A'}`);
      console.log(`   SMTP User: ${process.env.SMTP_USER ? '***set***' : 'MISSING'}`);
      
      // Verify connection before sending (with timeout) - skip in production to avoid delays
      if (process.env.NODE_ENV === 'development') {
        try {
          const verifyPromise = this.transporter.verify();
          const verifyTimeout = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('SMTP verification timeout')), 10000);
          });
          await Promise.race([verifyPromise, verifyTimeout]);
          console.log('✅ SMTP connection verified');
        } catch (verifyError) {
          console.error('❌ SMTP verification failed:', verifyError.message);
          console.warn('⚠️ Continuing with email send despite verification failure...');
        }
      }
      
      const result = await this.deliver(mailOptions);
      
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
      
      // Provide specific error guidance for different SMTP providers
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
        } else if (error.code === 'ECONNECTION' || error.message?.includes('connection') || error.code === 'ETIMEDOUT') {
          console.error('📧 Gmail Connection Error:');
          console.error('   Railway IP addresses may be blocked by Gmail.');
          console.error('   Consider using SendGrid or a hosting email service instead.');
        }
      } else if (process.env.SMTP_HOST && (
        process.env.SMTP_HOST.includes('privateemail.com') ||
        process.env.SMTP_HOST.includes('homecomming26.com')
      )) {
        // Namecheap Private Email error guidance
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION' || error.message?.includes('timeout') || error.message?.includes('Connection timeout')) {
          console.error('📧 Namecheap SMTP Connection Timeout:');
          console.error('   Railway may not be able to reach Namecheap SMTP on port 587.');
          console.error('   Try these solutions:');
          console.error('   1. Switch to port 465 with SSL:');
          console.error('      SMTP_PORT=465');
          console.error('      SMTP_SECURE=true');
          console.error('   2. Try alternative SMTP host:');
          console.error('      SMTP_HOST=smtp.privateemail.com');
          console.error('   3. Check Railway logs for firewall/network restrictions');
          console.error('   4. Verify Namecheap email account is active and credentials are correct');
        } else if (error.code === 'EAUTH' || error.message?.includes('authentication')) {
          console.error('📧 Namecheap Authentication Error:');
          console.error('   Verify your email and password are correct.');
          console.error('   Email: grace_edge@homecomming26.com');
          console.error('   Check Namecheap email account settings.');
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

  async buildPinEmailData(member) {
    let fullMember = member;

    if (!member.chariotLeader && !member.chariotAssistants && !member.chariotMembers) {
      fullMember = await prisma.member.findUnique({
        where: { id: member.id },
        select: {
          id: true,
          name: true,
          email: true,
          pin: true,
          chariotLeader: {
            select: { id: true, name: true },
          },
          chariotAssistants: {
            select: {
              chariot: {
                select: {
                  id: true,
                  name: true,
                  leader: { select: { name: true, email: true } },
                },
              },
            },
          },
          chariotMembers: {
            select: {
              chariot: {
                select: {
                  id: true,
                  name: true,
                  leader: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      });
    }

    const chariotLeaderPassword = process.env.CHARIOT_LEADER_PASSWORD || 'blessingikpia';
    const chariotAssistantPassword = process.env.CHARIOT_ASSISTANT_PASSWORD || 'food123';
    const rawPortalUrl = process.env.FRONTEND_URL || 'https://reg-system-mu.vercel.app/';
    const portalUrl = rawPortalUrl.startsWith('http')
      ? (rawPortalUrl.endsWith('/') ? rawPortalUrl : `${rawPortalUrl}/`)
      : 'https://reg-system-mu.vercel.app/';

    let chariotName = 'Not assigned';
    let roleLabel = 'Member';
    let leaderName = '';
    let leaderEmail = '';
    let loginPassword = '';
    let showLogin = false;

    if (fullMember?.chariotLeader?.length) {
      roleLabel = 'Leader';
      chariotName = fullMember.chariotLeader[0].name;
      leaderName = fullMember.name;
      leaderEmail = fullMember.email;
      loginPassword = chariotLeaderPassword;
      showLogin = true;
    } else if (fullMember?.chariotAssistants?.length) {
      roleLabel = 'Assistant';
      const chariot = fullMember.chariotAssistants[0].chariot;
      chariotName = chariot?.name || chariotName;
      leaderName = chariot?.leader?.name || '';
      leaderEmail = chariot?.leader?.email || '';
      loginPassword = chariotAssistantPassword;
      showLogin = true;
    } else if (fullMember?.chariotMembers?.length) {
      roleLabel = 'Member';
      const chariot = fullMember.chariotMembers[0].chariot;
      chariotName = chariot?.name || chariotName;
      leaderName = chariot?.leader?.name || '';
      leaderEmail = chariot?.leader?.email || '';
    }

    return {
      ...fullMember,
      chariotName,
      roleLabel,
      leaderName,
      leaderEmail,
      portalUrl,
      loginPassword,
      showLogin,
    };
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
                <p>HomeComing Conference 2026</p>
                <!-- Template Version: v2.0 - HomeComing 2026 -->
            </div>

            <p>Dear ${member.name},</p>
            <p>Welcome home.</p>
            <p>Thank you for successfully registering for HomeComing Conference 2026. We are honoured to have you join us for this sacred gathering themed “Territorial Commanders.”</p>
            <p>HomeComing Conference is a prayer retreat and camping experience, set apart for alignment, spiritual responsibility, and territorial authority. Over these days, we will pray, wait on God, receive divine instructions, and take our place as commanders in the territories God has entrusted to us.</p>

            <hr />

            <h3>📌 Your Personal Assignment &amp; Check-In Information</h3>
            <p>${
              member.roleLabel === 'Leader'
                ? `You are the leader of <strong>${member.chariotName}</strong>.`
                : member.roleLabel === 'Assistant'
                  ? `You are the assistant of <strong>${member.chariotName}</strong>.`
                  : `For the duration of the conference, you will be in <strong>${member.chariotName}</strong>, and your chariot leader will be <strong>${member.leaderName || 'Not assigned'}</strong>.`
            }</p>
            ${member.leaderEmail ? `<p>You may contact your chariot leader directly via <strong>${member.leaderEmail}</strong> for guidance or coordination before and during the conference.</p>` : ''}
            <p>If you have any serious medical complications, please also contact your chariot leader so that adequate preparations can be made.</p>
            <p>Also, kindly take note of your personal check-in number (PIN):</p>

            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${member.pin}</div>
            </div>

            <p><strong>Role in chariot:</strong> ${member.roleLabel}</p>
            <p><strong>Chariot:</strong> ${member.chariotName}</p>

            ${member.showLogin ? `
              <div class="instructions">
                <h3>🔐 Your Login Details</h3>
                <p><strong>Platform:</strong> <a href="${member.portalUrl}">${member.portalUrl}</a></p>
                <p><strong>Email:</strong> ${member.email}</p>
                <p><strong>Password:</strong> ${member.loginPassword}</p>
              </div>
            ` : ''}

            <hr />

            <h3>📲 How Registration Will Work at the Venue</h3>
            <ul>
              <li>At the venue, there will be a barcode/QR code at the registration point.</li>
              <li>You will scan the barcode using your phone.</li>
              <li>You will then be prompted to enter your 4-digit check-in PIN.</li>
              <li>Once confirmed, your attendance for that session will be recorded.</li>
            </ul>
            <p><strong>⚠️ Your PIN is compulsory for every session.</strong></p>

            <h3>🗓️ Meeting Date &amp; Venue</h3>
            <p><strong>Date:</strong> 28th January – 1st February 2026<br />
            <strong>Venue:</strong> Balm of Gilead City</p>

            <h3>🚌 Movement &amp; Departure Information</h3>
            <p>All participants will move together to the venue from our church location.</p>
            <p><strong>Departure Point:</strong> 25, Igbineweka Street, Off Ekosodin Road, Ugbowo, Benin City.</p>
            <p><strong>Arrival Time:</strong> 7:30 AM<br />
            <strong>Departure Time:</strong> 8:00 AM (sharp)</p>
            <p>Please ensure you arrive early and fully prepared, as the movement will be prompt.</p>

            <h3>🏕️ What to Come With (Camping Essentials)</h3>
            <ul>
              <li>Your Bible, notebook, and writing materials</li>
              <li>Personal clothing for the duration of the camp</li>
              <li>Bedding materials (bedsheet, blanket, pillow, etc.)</li>
              <li>Personal toiletries, a bucket</li>
              <li>Any personal medications</li>
              <li>A ready and yielded heart</li>
            </ul>

            <h3>🌾 Seed &amp; Offering</h3>
            <p>Please come prepared with a landmark seed/offering, as the Lord leads you. These moments of sacrifice are spiritual statements, and we trust God for divine encounters and instructions as we give.
            Remember, I will not give to the Lord what will cost me nothing!</p>

            <p>We strongly encourage you to arrive prayerful, punctual, and expectant. God is intentional about this gathering, and we believe HomeComing Conference 2026 will mark you deeply, change your life, and make you a better minister of God's power and word.</p>
            <p>Once again — welcome home, Territorial Commander. We look forward to receiving you.</p>

            <p>Warm regards,<br />
            HomeComing Conference 2026 Team<br />
            ${churchName}</p>

            <div class="footer">
                <p>This email was sent to ${member.email}</p>
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
Dear ${member.name},

Welcome home.

Thank you for successfully registering for HomeComing Conference 2026. We are honoured to have you join us for this sacred gathering themed "Territorial Commanders."

HomeComing Conference is a prayer retreat and camping experience, set apart for alignment, spiritual responsibility, and territorial authority. Over these days, we will pray, wait on God, receive divine instructions, and take our place as commanders in the territories God has entrusted to us.

---

Your Personal Assignment & Check-In Information
${
  member.roleLabel === 'Leader'
    ? `You are the leader of ${member.chariotName}.`
    : member.roleLabel === 'Assistant'
      ? `You are the assistant of ${member.chariotName}.`
      : `Chariot: ${member.chariotName}
Chariot Leader: ${member.leaderName || 'Not assigned'}
Chariot Leader Email: ${member.leaderEmail || 'Not assigned'}`
}
Role in Chariot: ${member.roleLabel}

Your 4-digit check-in PIN: ${member.pin}

${member.showLogin ? `Login Details:
Platform: ${member.portalUrl}
Email: ${member.email}
Password: ${member.loginPassword}
` : ''}

---

How Registration Will Work at the Venue:
- Scan the QR code at the registration point.
- Enter your 4-digit PIN.
- Attendance for that session will be recorded.

Your PIN is compulsory for every session.

Meeting Date & Venue:
Date: 28th January – 1st February 2026
Venue: Balm of Gilead City

Movement & Departure Information:
Departure Point: 25, Igbineweka Street, Off Ekosodin Road, Ugbowo, Benin City.
Arrival Time: 7:30 AM
Departure Time: 8:00 AM (sharp)

What to Come With (Camping Essentials):
- Your Bible, notebook, and writing materials
- Personal clothing for the duration of the camp
- Bedding materials (bedsheet, blanket, pillow, etc.)
- Personal toiletries, a bucket
- Any personal medications
- A ready and yielded heart

Seed & Offering:
Please come prepared with a landmark seed/offering, as the Lord leads you.
Remember, I will not give to the Lord what will cost me nothing!

Once again — welcome home, Territorial Commander.
Warm regards,
HomeComing Conference 2026 Team
${churchName}

---
This email was sent to ${member.email}
    `;
  }

  async resolveMemberEvent(member, event) {
    if (event) return event;
    try {
      if (member.event) return member.event;
      const record = await prisma.member.findUnique({
        where: { id: member.id },
        select: { event: true },
      });
      return record?.event || null;
    } catch (error) {
      console.error('Failed to resolve member event for PIN email:', error.message);
      return null;
    }
  }

  /**
   * PIN email for events without chariots (Homecoming keeps its own template above).
   */
  async sendEventPin(member, event) {
    const churchName = process.env.CHURCH_NAME || 'Your Church';
    const churchEmail = process.env.FROM_EMAIL || 'noreply@yourchurch.com';
    const churchDisplayName = process.env.FROM_NAME || churchName;

    try {
      const emailData = await this.buildEventPinEmailData(member, event);
      const mailOptions = {
        from: `"${churchDisplayName}" <${churchEmail}>`,
        to: member.email,
        subject: event.slug === 'word-conference'
          ? 'Your Word Conference 2026 Attendance PIN'
          : `Your ${event.name} Attendance PIN`,
        html: this.generateEventPinEmailTemplate(emailData, churchName),
        text: this.generateEventPinEmailText(emailData, churchName),
      };

      console.log(`📧 Sending ${event.name} PIN email to ${member.email}...`);
      const result = await this.deliver(mailOptions);

      try {
        await this.logEmail(member.id, 'pin', mailOptions.subject, 'sent');
      } catch (logError) {
        console.error('Failed to log email success:', logError);
      }

      console.log(`✅ PIN email sent successfully to ${member.email}`, { messageId: result.messageId });
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error(`❌ Error sending ${event.name} PIN email to ${member.email}:`, error.message);
      try {
        await this.logEmail(member.id, 'pin', `Your ${event.name} Attendance PIN`, 'failed', error.message || 'Unknown error');
      } catch (logError) {
        console.error('Failed to log email error:', logError);
      }
      throw error;
    }
  }

  authenticatedFrom() {
    const churchName = process.env.CHURCH_NAME || 'Grace Edge Ministries';
    const displayName = process.env.FROM_NAME || churchName;
    const mailbox = (process.env.SMTP_USER || process.env.FROM_EMAIL || '').replace(/^"+|"+$/g, '').trim();
    return { churchName, displayName, mailbox };
  }

  async sendWordConferenceBooklet(member, bookletPath) {
    const { churchName, displayName, mailbox } = this.authenticatedFrom();
    const subject = 'Word Conference 2026 Booklet';
    const mailOptions = {
      from: `"${displayName}" <${mailbox}>`,
      replyTo: mailbox,
      sender: mailbox,
      envelope: { from: mailbox, to: member.email },
      to: member.email,
      subject,
      text: this.generateWordConferenceBookletText(member, churchName),
      html: this.generateWordConferenceBookletTemplate(member, churchName),
      attachments: [{
        filename: 'WC 2026 Booklet.pdf',
        path: bookletPath,
        contentType: 'application/pdf',
        contentDisposition: 'attachment',
      }],
      headers: {
        'X-Mailer': 'Grace Edge Ministries',
      },
    };

    console.log('Sending Word Conference booklet email...');
    const result = await this.deliver(mailOptions);
    try {
      await this.logEmail(member.id, 'bulk', subject, 'sent');
    } catch (logError) {
      console.error('Failed to log booklet email success:', logError);
    }
    console.log('Booklet email accepted', { messageId: result.messageId });
    return { success: true, messageId: result.messageId };
  }

  generateWordConferenceBookletTemplate(member, churchName) {
    const esc = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Word Conference 2026 Booklet</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
            .header { text-align: center; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
            .church-name { color: #3B82F6; font-size: 24px; font-weight: bold; margin: 0; }
            .note { background-color: #EFF6FF; border-left: 4px solid #3B82F6; padding: 15px; margin: 20px 0; }
            .note h3 { color: #1E40AF; margin-top: 0; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1 class="church-name">${esc(churchName)}</h1>
                <p>Word Conference 2026</p>
            </div>
            <p>Dear ${esc(member.name)},</p>
            <p>Thank you for being with us at Word Conference 2026, themed <strong>&ldquo;The Chariots and the Horse Men.&rdquo;</strong></p>
            <p>Please find attached the Word Conference 2026 Booklet. Kindly keep it with you through the remaining sessions.</p>
            <div class="note">
                <h3>Attached</h3>
                <p><strong>WC 2026 Booklet.pdf</strong></p>
                <p>Open the attached PDF on your phone or computer. If you cannot see it, look in the attachments section of this email.</p>
            </div>
            <h3>Meeting Date and Venue</h3>
            <p>
              <strong>Date:</strong> 30th, 31st October and 1st November 2026<br />
              <strong>Friday:</strong> The meeting starts at 12 PM. Registration (check-in) starts at 8 AM and ends at 12 PM.<br />
              <strong>Saturday and Sunday:</strong> 8 AM<br />
              <strong>Venue:</strong> The Cave, 7 Ohunwu Street, By Osunpec Junction, Off Benin-Lagos Expressway, Ishior, Benin City.
            </p>
            <p><strong>Enquiries:</strong> +234 902 335 0524</p>
            <p>We look forward to sitting with you under the Word. It is from here to the uttermost.</p>
            <p>Warm regards,<br />
            Word Conference 2026 Team<br />
            ${esc(churchName)}</p>
            <div class="footer">
                <p>This email was sent to ${esc(member.email)}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateWordConferenceBookletText(member, churchName) {
    return `Dear ${member.name},

Thank you for being with us at Word Conference 2026, themed "The Chariots and the Horse Men."

Please find attached the Word Conference 2026 Booklet. Kindly keep it with you through the remaining sessions.

Attached: WC 2026 Booklet.pdf
Open the attached PDF on your phone or computer. If you cannot see it, look in the attachments section of this email.

Meeting Date and Venue
Date: 30th, 31st October and 1st November 2026
Friday: The meeting starts at 12 PM. Registration (check-in) starts at 8 AM and ends at 12 PM.
Saturday and Sunday: 8 AM
Venue: The Cave, 7 Ohunwu Street, By Osunpec Junction, Off Benin-Lagos Expressway, Ishior, Benin City.
Enquiries: +234 902 335 0524

We look forward to sitting with you under the Word. It is from here to the uttermost.

Warm regards,
Word Conference 2026 Team
${churchName}
`;
  }

  async buildEventPinEmailData(member, event) {
    const record = await prisma.member.findUnique({
      where: { id: member.id },
      select: {
        id: true,
        name: true,
        email: true,
        pin: true,
        chapelRole: true,
        chapel: { select: { name: true } },
      },
    });
    const fullMember = record || member;

    const roleLabels = {
      INVITEE: 'Invitee',
      MEMBER: 'Member',
      WORKER: 'Worker',
      CHAPEL_LEADER: 'Chapel Leader',
      SUB_LEADER: 'Sub-leader',
    };
    const rawPortalUrl = process.env.FRONTEND_URL || 'https://reg-system-mu.vercel.app/';
    const portalUrl = rawPortalUrl.startsWith('http')
      ? (rawPortalUrl.endsWith('/') ? rawPortalUrl : `${rawPortalUrl}/`)
      : 'https://reg-system-mu.vercel.app/';
    const chapelLeaderPassword = process.env.CHAPEL_LEADER_PASSWORD || '';
    const isChapelLeader = ['CHAPEL_LEADER', 'SUB_LEADER'].includes(fullMember.chapelRole) && fullMember.chapel;

    const formatDate = (value) =>
      value
        ? new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
    const start = formatDate(event.startDate);
    const end = formatDate(event.endDate);
    const dateLabel = start && end && start !== end ? `${start} – ${end}` : start || end;

    return {
      ...fullMember,
      eventName: event.name,
      eventDescription: event.description || '',
      venue: event.venue || '',
      dateLabel,
      chapelName: fullMember.chapel?.name || '',
      roleLabel: roleLabels[fullMember.chapelRole] || '',
      portalUrl,
      showLogin: Boolean(isChapelLeader && chapelLeaderPassword),
      loginPassword: chapelLeaderPassword,
    };
  }

  generateWordConferencePinEmailTemplate(member, churchName) {
    const esc = (value) => String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[ch]));
    const isInvitee = member.chapelRole === 'INVITEE' || member.roleLabel === 'Invitee';
    const chapelSentence = !member.chapelName
      ? 'You are not assigned to a chapel yet. An administrator can assign one before the conference.'
      : isInvitee
        ? `You were invited by <strong>Chapel of ${esc(member.chapelName)}</strong>.`
        : `You are a member of <strong>Chapel of ${esc(member.chapelName)}</strong>, and your role is <strong>${esc(member.roleLabel || 'Invitee')}</strong>.`;
    const chapelLine = member.chapelName
      ? `<p><strong>Chapel:</strong> Chapel of ${esc(member.chapelName)}</p>`
      : '<p><strong>Chapel:</strong> Unassigned</p>';
    const roleLine = member.roleLabel ? `<p><strong>Role:</strong> ${esc(member.roleLabel)}</p>` : '';
    const loginBlock = member.showLogin ? `
            <div class="instructions">
                <h3>🔐 Your Login Details</h3>
                <p>You are a <strong>${esc(member.roleLabel)}</strong> of <strong>Chapel of ${esc(member.chapelName)}</strong>.</p>
                <p><strong>Platform:</strong> <a href="${esc(member.portalUrl)}">${esc(member.portalUrl)}</a></p>
                <p><strong>Email:</strong> ${esc(member.email)}</p>
                <p><strong>Password:</strong> ${esc(member.loginPassword)}</p>
            </div>
    ` : '';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Word Conference 2026 Attendance PIN</title>
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
                <h1 class="church-name">${esc(churchName)}</h1>
                <p>Word Conference 2026</p>
            </div>

            <p>Dear ${esc(member.name)},</p>
            <p>Thank you for successfully registering for Word Conference 2026. We are honoured to have you join us for this gathering themed <strong>“The Chariots and the Horse Men.”</strong></p>
            <p>Over these days we will sit under the Word, take our place, and go from here to the uttermost.</p>

            <hr />

            <h3>📌 Your Chapel &amp; Check-In Information</h3>
            <p>${chapelSentence}</p>
            <p>Kindly take note of your personal check-in number (PIN):</p>

            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${esc(member.pin)}</div>
            </div>

            ${chapelLine}
            ${roleLine}
            ${loginBlock}

            <hr />

            <h3>📲 How Registration Will Work at the Venue</h3>
            <ul>
              <li>There will be no barcode at the venue.</li>
              <li>The registration team will ask you for your 4-digit check-in PIN.</li>
              <li>Give them your PIN, and they will check you in.</li>
              <li>Once confirmed, your attendance for that session will be recorded.</li>
            </ul>
            <p><strong>⚠️ Your PIN is compulsory for every session. Please have it ready.</strong></p>

            <h3>🗓️ Meeting Date &amp; Venue</h3>
            <p>
              <strong>Date:</strong> 30th, 31st October &amp; 1st November 2026<br />
              <strong>Friday:</strong> The meeting starts at 12 PM. Registration (check-in) starts at 8 AM and ends at 12 PM. Please come on time, and arrive before 12 PM.<br />
              <strong>Saturday &amp; Sunday:</strong> 8 AM<br />
              <strong>Venue:</strong> The Cave, 7 Ohunwu Street, By Osunpec Junction, Off Benin-Lagos Expressway, Ishior, Benin City.
            </p>
            <p><strong>Enquiries:</strong> +234 902 335 0524</p>

            <p>We look forward to receiving you. It is from here to the uttermost.</p>
            <p>Warm regards,<br />
            Word Conference 2026 Team<br />
            ${esc(churchName)}</p>

            <div class="footer">
                <p>This email was sent to ${esc(member.email)}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateEventPinEmailTemplate(member, churchName) {
    if (member.eventName === 'Word Conference') {
      return this.generateWordConferencePinEmailTemplate(member, churchName);
    }
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
                <p>${member.eventName}</p>
            </div>

            <p>Dear ${member.name},</p>
            <p>Thank you for registering for ${member.eventName}. We are glad to have you with us.</p>
            ${member.eventDescription ? `<p>${member.eventDescription}</p>` : ''}

            <p>Please keep your personal check-in number (PIN):</p>
            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${member.pin}</div>
            </div>

            ${member.chapelName ? `<p><strong>Chapel:</strong> ${member.chapelName}</p>` : ''}
            ${member.roleLabel ? `<p><strong>Role:</strong> ${member.roleLabel}</p>` : ''}

            ${member.showLogin ? `
              <div class="instructions">
                <h3>🔐 Your Chapel Leader Login</h3>
                <p><strong>Platform:</strong> <a href="${member.portalUrl}">${member.portalUrl}</a></p>
                <p><strong>Email:</strong> ${member.email}</p>
                <p><strong>Password:</strong> ${member.loginPassword}</p>
              </div>
            ` : ''}

            <h3>📲 How Check-In Works</h3>
            <ul>
              <li>Scan the QR code at the registration point with your phone.</li>
              <li>Enter your 4-digit PIN.</li>
              <li>Your attendance for that session will be recorded.</li>
            </ul>
            <p><strong>⚠️ Your PIN is required for every session.</strong></p>

            ${member.dateLabel || member.venue ? `
              <h3>🗓️ Date &amp; Venue</h3>
              <p>
                ${member.dateLabel ? `<strong>Date:</strong> ${member.dateLabel}<br />` : ''}
                ${member.venue ? `<strong>Venue:</strong> ${member.venue}` : ''}
              </p>
            ` : ''}

            <p>Warm regards,<br />
            ${member.eventName} Team<br />
            ${churchName}</p>

            <div class="footer">
                <p>This email was sent to ${member.email}</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  generateEventPinEmailText(member, churchName) {
    if (member.eventName === 'Word Conference') {
      const chapel = member.chapelName ? `Chapel of ${member.chapelName}` : 'Unassigned';
      const isInvitee = member.chapelRole === 'INVITEE' || member.roleLabel === 'Invitee';
      const chapelSentence = !member.chapelName
        ? 'You are not assigned to a chapel yet. An administrator can assign one before the conference.'
        : isInvitee
          ? `You were invited by Chapel of ${member.chapelName}.`
          : `You are a member of Chapel of ${member.chapelName}, and your role is ${member.roleLabel || 'Invitee'}.`;
      const login = member.showLogin ? `
Your Login Details
You are a ${member.roleLabel} of Chapel of ${member.chapelName}.
Platform: ${member.portalUrl}
Email: ${member.email}
Password: ${member.loginPassword}
` : '';
      return `
Dear ${member.name},

Thank you for successfully registering for Word Conference 2026. We are honoured to have you join us for this gathering themed "The Chariots and the Horse Men."

Over these days we will sit under the Word, take our place, and go from here to the uttermost.

Your Chapel & Check-In Information
${chapelSentence}
Chapel: ${chapel}
Role: ${member.roleLabel || ''}
Your 4-digit check-in PIN: ${member.pin}
${login}
How Registration Will Work at the Venue:
- There will be no barcode at the venue.
- The registration team will ask you for your 4-digit check-in PIN.
- Give them your PIN, and they will check you in.
- Once confirmed, your attendance for that session will be recorded.

Your PIN is compulsory for every session. Please have it ready.

Meeting Date & Venue:
Date: 30th, 31st October & 1st November 2026
Friday: The meeting starts at 12 PM. Registration (check-in) starts at 8 AM and ends at 12 PM. Please come on time, and arrive before 12 PM.
Saturday & Sunday: 8 AM
Venue: The Cave, 7 Ohunwu Street, By Osunpec Junction, Off Benin-Lagos Expressway, Ishior, Benin City.
Enquiries: +234 902 335 0524

We look forward to receiving you. It is from here to the uttermost.

Warm regards,
Word Conference 2026 Team
${churchName}
`;
    }
    return `
Dear ${member.name},

Thank you for registering for ${member.eventName}. We are glad to have you with us.
${member.eventDescription ? `\n${member.eventDescription}\n` : ''}
Your 4-digit check-in PIN: ${member.pin}
${member.chapelName ? `Chapel: ${member.chapelName}\n` : ''}${member.roleLabel ? `Role: ${member.roleLabel}\n` : ''}
${member.showLogin ? `Chapel Leader Login:
Platform: ${member.portalUrl}
Email: ${member.email}
Password: ${member.loginPassword}
` : ''}
How Check-In Works:
- Scan the QR code at the registration point.
- Enter your 4-digit PIN.
- Your attendance for that session will be recorded.

Your PIN is required for every session.
${member.dateLabel ? `\nDate: ${member.dateLabel}` : ''}${member.venue ? `\nVenue: ${member.venue}` : ''}

Warm regards,
${member.eventName} Team
${churchName}

---
This email was sent to ${member.email}
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

      const result = await this.deliver(mailOptions);
      
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
   * Log email attempt to database (optional - only if emailLog model exists)
   */
  async logEmail(memberId, type, subject, status, errorMsg = null) {
    try {
      // Check if emailLog model exists before trying to log
      if (prisma.emailLog && typeof prisma.emailLog.create === 'function') {
        await prisma.emailLog.create({
          data: {
            memberId,
            type,
            subject,
            status,
            errorMsg,
          },
        });
      }
      // Silently skip if model doesn't exist (not critical for functionality)
    } catch (error) {
      // Don't log errors for email logging failures - it's not critical
      // console.error('Error logging email:', error);
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

        const result = await this.deliver(mailOptions);
        
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