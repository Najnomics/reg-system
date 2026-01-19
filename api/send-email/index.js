const nodemailer = require('nodemailer');

/**
 * Vercel Serverless Function for sending emails
 * This bypasses Railway's SMTP blocking by using Vercel's infrastructure
 * 
 * POST /api/send-email
 * Body: {
 *   to: string (email address)
 *   subject: string
 *   html: string (HTML content)
 *   text: string (plain text content)
 *   memberId?: string (optional, for logging)
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
    const { to, subject, html, text, memberId } = req.body;

    // Validate required fields
    if (!to || !subject || !html) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'to, subject, and html are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({
        error: 'Invalid email address',
        message: 'Please provide a valid email address',
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

    // Check if email service is configured
    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('❌ Email service not configured. Missing SMTP credentials.');
      return res.status(500).json({
        error: 'Email service not configured',
        message: 'SMTP credentials are missing. Please configure SMTP_HOST, SMTP_USER, and SMTP_PASS in Vercel environment variables.',
      });
    }

    // Create transporter based on provider
    let transporter;
    
    if (smtpHost.includes('gmail.com')) {
      // Gmail-specific configuration
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
      // Generic SMTP configuration
      const isNamecheap = smtpHost.includes('privateemail.com') || smtpHost.includes('homecomming26.com');
      
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        // Optimized timeout settings
        connectionTimeout: isNamecheap ? 15000 : 30000,
        socketTimeout: isNamecheap ? 15000 : 30000,
        greetingTimeout: isNamecheap ? 10000 : 30000,
        // Connection pooling for better performance
        pool: true,
        maxConnections: isNamecheap ? 5 : 1,
        maxMessages: isNamecheap ? 100 : 3,
      });
    }

    // Prepare email options
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      subject: subject,
      html: html,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version if not provided
    };

    console.log(`📧 [Vercel] Attempting to send email to ${to}...`);
    console.log(`   From: ${mailOptions.from}`);
    console.log(`   SMTP Host: ${smtpHost}`);
    console.log(`   SMTP Port: ${smtpPort}`);

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ [Vercel] Email sent successfully to ${to}`, { 
      messageId: result.messageId,
      memberId: memberId || 'N/A'
    });

    return res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: {
        messageId: result.messageId,
        to: to,
        subject: subject,
      },
    });

  } catch (error) {
    console.error('❌ [Vercel] Error sending email:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      response: error.response,
      responseCode: error.responseCode,
      command: error.command,
      stack: error.stack,
    });

    // Provide helpful error messages
    let errorMessage = 'Failed to send email';
    let errorCode = 500;

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection timeout. Vercel may also be blocking SMTP connections. Consider using SendGrid API instead.';
      errorCode = 503;
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your SMTP_USER and SMTP_PASS credentials.';
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
