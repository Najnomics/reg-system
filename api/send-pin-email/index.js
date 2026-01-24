import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';

let prismaClient = null;

const getDatabaseUrl = () =>
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;

const getPrismaClient = (databaseUrl) => {
  if (prismaClient) return prismaClient;
  if (!databaseUrl) {
    return null;
  }
  prismaClient = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });
  return prismaClient;
};

/**
 * Fetch member with chariot details from database
 */
async function fetchMemberChariotDetails(memberId, memberEmail, databaseUrl) {
  try {
    const prisma = getPrismaClient(databaseUrl);
    if (!prisma) {
      return null;
    }
    const where = memberId 
      ? { id: memberId }
      : { email: memberEmail.toLowerCase() };

    const member = await prisma.member.findFirst({
      where,
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

    if (!member) {
      return null;
    }

    const portalUrl = process.env.FRONTEND_URL || 'https://reg-system-mu.vercel.app/';

    let chariotName = 'Not assigned';
    let roleLabel = 'Member';
    let leaderName = '';
    let leaderEmail = '';
    let showLogin = false;

    if (member.chariotLeader && member.chariotLeader.length > 0) {
      roleLabel = 'Leader';
      chariotName = member.chariotLeader[0].name;
      leaderName = member.name;
      leaderEmail = member.email;
      showLogin = true;
    } else if (member.chariotAssistants && member.chariotAssistants.length > 0) {
      roleLabel = 'Assistant';
      const chariot = member.chariotAssistants[0].chariot;
      chariotName = chariot?.name || chariotName;
      leaderName = chariot?.leader?.name || '';
      leaderEmail = chariot?.leader?.email || '';
      showLogin = true;
    } else if (member.chariotMembers && member.chariotMembers.length > 0) {
      roleLabel = 'Member';
      const chariot = member.chariotMembers[0].chariot;
      chariotName = chariot?.name || chariotName;
      leaderName = chariot?.leader?.name || '';
      leaderEmail = chariot?.leader?.email || '';
    }

    return {
      chariotName,
      roleLabel,
      leaderName,
      leaderEmail,
      portalUrl,
      showLogin,
    };
  } catch (error) {
    console.error('Error fetching member chariot details:', error);
    return null;
  }
}

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
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported' 
    });
  }

  try {
    // Parse request body if it's a string
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseError) {
        return res.status(400).json({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        });
      }
    }

    const { 
      memberId, 
      memberName, 
      memberEmail, 
      memberPin,
      chariotName: payloadChariotName,
      roleLabel: payloadRoleLabel,
      leaderName: payloadLeaderName,
      leaderEmail: payloadLeaderEmail,
      showLogin: payloadShowLogin,
      loginPassword: payloadLoginPassword,
      portalUrl: payloadPortalUrl
    } = body;

    // Validate required fields
    if (!memberName || !memberEmail || !memberPin) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'memberName, memberEmail, and memberPin are required',
      });
    }

    // Check if payload already contains chariot details (from frontend)
    const hasPayloadChariotData = payloadChariotName || payloadRoleLabel || payloadLeaderName;
    
    let chariotDetails = null;
    
    // Only fetch from database if payload doesn't have chariot data
    if (!hasPayloadChariotData) {
      const databaseUrl = getDatabaseUrl();
      if (databaseUrl) {
        console.log(`🔍 Payload missing chariot data, fetching from database for member: ${memberId || memberEmail}`);
        try {
          chariotDetails = await fetchMemberChariotDetails(memberId, memberEmail, databaseUrl);
          if (chariotDetails) {
            console.log(`✅ Fetched chariot details from DB: ${chariotDetails.chariotName}, Role: ${chariotDetails.roleLabel}`);
          } else {
            console.warn(`⚠️ Could not fetch chariot details from database`);
          }
        } catch (dbError) {
          console.error(`❌ Database fetch error (using defaults):`, dbError.message);
          // Continue without chariot details - email will still be sent
        }
      } else {
        console.log(`⚠️ No database URL configured and no payload chariot data - using defaults`);
      }
    } else {
      console.log(`✅ Using chariot data from frontend payload`);
    }

    const resolvedChariotName = payloadChariotName || chariotDetails?.chariotName || 'Not assigned';
    const resolvedRoleLabel = payloadRoleLabel || chariotDetails?.roleLabel || 'Member';
    const resolvedLeaderName = payloadLeaderName || chariotDetails?.leaderName || 'Not assigned';
    const resolvedLeaderEmail = payloadLeaderEmail || chariotDetails?.leaderEmail || '';
    const resolvedPortalUrl = payloadPortalUrl || chariotDetails?.portalUrl || process.env.FRONTEND_URL || 'https://reg-system-mu.vercel.app/';
    const resolvedShowLogin =
      typeof payloadShowLogin === 'boolean'
        ? payloadShowLogin
        : typeof chariotDetails?.showLogin === 'boolean'
          ? chariotDetails.showLogin
          : ['Leader', 'Assistant'].includes(resolvedRoleLabel);

    let resolvedLoginPassword = payloadLoginPassword || '';
    if (!resolvedLoginPassword && resolvedShowLogin) {
      if (resolvedRoleLabel === 'Leader') {
        resolvedLoginPassword = process.env.CHARIOT_LEADER_PASSWORD || 'blessingikpia';
      } else if (resolvedRoleLabel === 'Assistant') {
        resolvedLoginPassword = process.env.CHARIOT_ASSISTANT_PASSWORD || 'food123';
      }
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
    // Parse port - if SMTP_SECURE is true, default to 465, otherwise 587
    const smtpPort = process.env.SMTP_PORT 
      ? parseInt(process.env.SMTP_PORT) 
      : (process.env.SMTP_SECURE === 'true' ? 465 : 587);
    const smtpSecure = process.env.SMTP_SECURE === 'true';
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
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

    // Generate PIN email HTML template - HomeComing Conference 2026
    const displayChariotName = resolvedChariotName;
    const displayRole = resolvedRoleLabel;
    const displayLeaderName = resolvedLeaderName;
    const frontendUrl = resolvedPortalUrl;
    
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
                <p>HomeComing Conference 2026</p>
            </div>

            <p>Dear ${memberName},</p>
            <p>Welcome home.</p>
            <p>Thank you for successfully registering for HomeComing Conference 2026. We are honoured to have you join us for this sacred gathering themed "Territorial Commanders."</p>
            <p>HomeComing Conference is a prayer retreat and camping experience, set apart for alignment, spiritual responsibility, and territorial authority. Over these days, we will pray, wait on God, receive divine instructions, and take our place as commanders in the territories God has entrusted to us.</p>

            <hr />

            <h3>📌 Your Personal Assignment &amp; Check-In Information</h3>
            <p>For the duration of the conference, you will be in <strong>${displayChariotName}</strong>, and your chariot leader will be <strong>${displayLeaderName}</strong>.</p>
            ${resolvedLeaderEmail ? `<p>You may contact your chariot leader directly via <strong>${resolvedLeaderEmail}</strong> for guidance or coordination before and during the conference.</p>` : ''}
            <p>If you have any serious medical complications, please also contact your chariot leader so that adequate preparations can be made.</p>
            <p>Also, kindly take note of your personal check-in number (PIN):</p>

            <div class="pin-box">
                <div class="pin-label">Your Personal PIN</div>
                <div class="pin-number">${memberPin}</div>
            </div>

            <p><strong>Role in chariot:</strong> ${displayRole}</p>
            <p><strong>Chariot:</strong> ${displayChariotName}</p>

            ${resolvedShowLogin && resolvedLoginPassword ? `
              <div class="instructions">
                <h3>🔐 Your Login Details</h3>
                <p><strong>Platform:</strong> <a href="${frontendUrl}">${frontendUrl}</a></p>
                <p><strong>Email:</strong> ${memberEmail}</p>
                <p><strong>Password:</strong> ${resolvedLoginPassword}</p>
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
                <p>This email was sent to ${memberEmail}</p>
            </div>
        </div>
    </body>
    </html>
    `;

    // Generate plain text version - HomeComing Conference 2026
    const textTemplate = `
Dear ${memberName},

Welcome home.

Thank you for successfully registering for HomeComing Conference 2026. We are honoured to have you join us for this sacred gathering themed "Territorial Commanders."

HomeComing Conference is a prayer retreat and camping experience, set apart for alignment, spiritual responsibility, and territorial authority. Over these days, we will pray, wait on God, receive divine instructions, and take our place as commanders in the territories God has entrusted to us.

---

Your Personal Assignment & Check-In Information
Chariot: ${displayChariotName}
Chariot Leader: ${displayLeaderName}
${resolvedLeaderEmail ? `Chariot Leader Email: ${resolvedLeaderEmail}` : ''}
Role in Chariot: ${displayRole}

Your 4-digit check-in PIN: ${memberPin}

${resolvedShowLogin && resolvedLoginPassword ? `Login Details:
Platform: ${frontendUrl}
Email: ${memberEmail}
Password: ${resolvedLoginPassword}
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
This email was sent to ${memberEmail}
    `.trim();

    // Prepare email options
    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to: memberEmail,
      subject: `Your ${churchName} Attendance PIN`,
      html: htmlTemplate,
      text: textTemplate,
    };

    console.log(`📧 [Vercel v2.0] Attempting to send PIN email to ${memberEmail}...`);
    console.log(`   Template: HomeComing Conference 2026`);
    console.log(`   Member: ${memberName} (ID: ${memberId || 'N/A'})`);
    console.log(`   PIN: ${memberPin}`);
    console.log(`   Chariot: ${displayChariotName}`);
    console.log(`   Role: ${displayRole}`);
    console.log(`   Leader: ${displayLeaderName}${resolvedLeaderEmail ? ` (${resolvedLeaderEmail})` : ''}`);
    console.log(`   SMTP Config: ${smtpHost}:${smtpPort} (secure: ${smtpSecure})`);
    console.log(`   SMTP User: ${smtpUser ? 'SET' : 'MISSING'}`);

    // Send email
    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ [Vercel] PIN email sent successfully to ${memberEmail}`, { 
      messageId: result.messageId,
      memberId: memberId || 'N/A',
      memberName: memberName
    });

    // Cleanup Prisma connection
    if (prismaClient) {
      await prismaClient.$disconnect().catch(() => {});
      prismaClient = null;
    }

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
      stack: error.stack,
      name: error.name,
    });

    let errorMessage = 'Failed to send PIN email';
    let errorCode = 500;
    let errorDetails = {};

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      errorMessage = 'Connection timeout. Vercel may also be blocking SMTP connections. Consider using SendGrid API instead.';
      errorCode = 503;
    } else if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authentication failed. Please check your SMTP credentials in Vercel environment variables.';
      errorCode = 401;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Include error details for debugging
    errorDetails = {
      code: error.code,
      command: error.command,
      name: error.name,
    };

    // Log environment variable status (without exposing values)
    console.error('Environment check:', {
      SMTP_HOST: process.env.SMTP_HOST ? 'SET' : 'MISSING',
      SMTP_USER: process.env.SMTP_USER ? 'SET' : 'MISSING',
      SMTP_PASS: process.env.SMTP_PASS ? 'SET' : 'MISSING',
      SMTP_PORT: process.env.SMTP_PORT || 'NOT SET',
      SMTP_PORT_USED: smtpPort,
      SMTP_SECURE: process.env.SMTP_SECURE || 'NOT SET',
      SMTP_SECURE_USED: smtpSecure,
    });

    // Cleanup Prisma connection
    if (prismaClient) {
      await prismaClient.$disconnect().catch(() => {});
      prismaClient = null;
    }

    return res.status(errorCode).json({
      error: 'Email sending failed',
      message: errorMessage,
      details: errorDetails,
    });
  }
};
