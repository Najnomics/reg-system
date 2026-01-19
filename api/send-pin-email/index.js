const nodemailer = require('nodemailer');

/**
 * Vercel Serverless Function for sending PIN emails to members
 * This is a specialized endpoint for PIN emails with pre-formatted templates
 * 
 * POST /api/send-pin-email
 * Body: {
 *   memberId: string (optional, for logging)
 *   memberName: string
 *   memberEmail: string
 *   memberPin: string (4-digit PIN)
 * }
 */
module.exports = async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported' 
    });
  }

  try {
    const { memberId, memberName, memberEmail, memberPin } = req.body;

    // Validate required fields
    if (!memberName || !memberEmail || !memberPin) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'memberName, memberEmail, and memberPin are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(memberEmail)) {
      return res.status(400).json({
        error: 'Invalid email address',
        message: 'Please provide a valid email address',
      });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(memberPin)) {
      return res.status(400).json({
        error: 'Invalid PIN format',
        message: 'PIN must be exactly 4 digits',
      });
    }

    // Get email configuration from environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL || smtpUser;
    const fromName = process.env.FROM_NAME || 'Grace Edge Ministries';
    const churchName = process.env.CHURCH_NAME || 'Grace Edge Ministries';

    // Check if email service is configured
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('❌ Email service not configured. Missing SMTP credentials.');
      return res.status(500).json({
        error: 'Email service not configured',
        message: 'SMTP credentials are missing. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in Vercel environment variables.',
      });
    }

    // Create transporter
    let transporter;
    
    if (smtpHost.includes('gmail.com')) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 30000,
        socketTimeout: 30000,
        greetingTimeout: 30000,
      });
    } else {
      const isNamecheap = smtpHost.includes('privateemail.com') || smtpHost.includes('homecomming26.com');
      
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: isNamecheap ? 15000 : 30000,
        socketTimeout: isNamecheap ? 15000 : 30000,
        greetingTimeout: isNamecheap ? 10000 : 30000,
        pool: true,
        maxConnections: isNamecheap ? 5 : 1,
        maxMessages: isNamecheap ? 100 : 3,
      });
    }

    // Generate PIN email HTML template
    const htmlTemplate = `
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
            
            <h2>Hello ${memberName},</h2>
            
            <p>Welcome to ${churchName}! You have been registered in our attendance system. Here is your personal 4-digit PIN for checking in to church services and events:</p>
            
            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${memberPin}</div>
            </div>
            
            <div class="instructions">
                <h3>How to use your PIN:</h3>
                <ol>
                    <li>Look for the QR code at the entrance of church services or events</li>
                    <li>Scan the QR code with your smartphone camera</li>
                    <li>Answer the location verification question</li>
                    <li>Enter your 4-digit PIN: <strong>${memberPin}</strong></li>
                    <li>You're checked in!</li>
                </ol>
            </div>
            
            <p><strong>Important:</strong> Please keep this PIN secure and don't share it with others. You'll need it every time you attend church services or events.</p>
            
            <p>If you have any questions about using the attendance system, please contact our church office.</p>
            
            <p>God bless,<br>
            The ${churchName} Team</p>
            
            <div class="footer">
                <p>This email was sent to ${memberEmail}</p>
                <p>If you received this email by mistake, please contact us immediately.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Generate plain text version
    const textTemplate = `
Welcome to ${churchName}!

Hello ${memberName},

You have been registered in our attendance system. Here is your personal 4-digit PIN:

PIN: ${memberPin}

How to use your PIN:
1. Look for the QR code at the entrance of church services or events
2. Scan the QR code with your smartphone camera
3. Answer the location verification question
4. Enter your 4-digit PIN: ${memberPin}
5. You're checked in!

Important: Please keep this PIN secure and don't share it with others.

If you have any questions, please contact our church office.

God bless,
The ${churchName} Team
    `.trim();

    // Prepare email options
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: memberEmail,
      subject: `Your ${churchName} Attendance PIN`,
      html: htmlTemplate,
      text: textTemplate,
    };

    console.log(`📧 [Vercel] Attempting to send PIN email to ${memberEmail}...`);
    console.log(`   Member: ${memberName} (ID: ${memberId || 'N/A'})`);
    console.log(`   PIN: ${memberPin}`);
    console.log(`   SMTP Host: ${smtpHost}:${smtpPort}`);

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ [Vercel] PIN email sent successfully to ${memberEmail}`, { 
      messageId: result.messageId,
      memberId: memberId || 'N/A',
      memberName: memberName
    });

    return res.status(200).json({
      success: true,
      message: 'PIN email sent successfully',
      data: {
        messageId: result.messageId,
        memberEmail: memberEmail,
        memberName: memberName,
        memberId: memberId,
      },
    });

  } catch (error) {
    console.error('❌ [Vercel] Error sending PIN email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    let errorMessage = 'Failed to send PIN email';
    let errorCode = 500;

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection timeout. Vercel may also be blocking SMTP connections. Consider using SendGrid API instead.';
      errorCode = 503;
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your SMTP credentials in Vercel environment variables.';
      errorCode = 401;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return res.status(errorCode).json({
      error: 'Email sending failed',
      message: errorMessage,
      details: process.env.NODE_ENV === 'development' ? {
        code: error.code,
        command: error.command,
      } : undefined,
    });
  }
};
