class EmailService {
  constructor() {
    this.emailQueue = [];
  }

  // Mock email sending - in real implementation, use SendGrid, Nodemailer, etc.
  async sendEmail({ to, subject, html, text }) {
    return new Promise((resolve) => {
      // Simulate network delay
      setTimeout(() => {
        console.log('📧 Email sent:', { to, subject });
        this.emailQueue.push({
          to,
          subject,
          html,
          text,
          sentAt: new Date(),
          status: 'sent'
        });
        resolve({ success: true, messageId: `msg-${Date.now()}` });
      }, Math.random() * 1000 + 500);
    });
  }

  // Send member code email when member is created
  async sendMemberCodeEmail(member) {
    const subject = 'Your Church Member Code';
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .code { font-size: 24px; font-weight: bold; color: #4F46E5; text-align: center; 
                    padding: 15px; background: white; border: 2px solid #4F46E5; 
                    border-radius: 8px; margin: 20px 0; }
            .footer { padding: 15px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Church!</h1>
            </div>
            <div class="content">
              <h2>Hello ${member.firstName} ${member.lastName},</h2>
              <p>You have been successfully registered in our church attendance system.</p>
              
              <p>Your unique member code is:</p>
              <div class="code">${member.memberCode}</div>
              
              <p><strong>Please save this code!</strong> You will need it to check in to church sessions.</p>
              
              <h3>How to use your member code:</h3>
              <ol>
                <li>Scan the QR code at any church session</li>
                <li>Enter the session password (provided by staff)</li>
                <li>Enter your 4-digit member code: <strong>${member.memberCode}</strong></li>
                <li>You're checked in!</li>
              </ol>
              
              <p>If you have any questions, please contact the church office.</p>
              
              <p>God bless,<br>Church Administration</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Church Attendance Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      Welcome to Our Church!
      
      Hello ${member.firstName} ${member.lastName},
      
      You have been successfully registered in our church attendance system.
      
      Your unique member code is: ${member.memberCode}
      
      Please save this code! You will need it to check in to church sessions.
      
      How to use your member code:
      1. Scan the QR code at any church session
      2. Enter the session password (provided by staff)
      3. Enter your 4-digit member code: ${member.memberCode}
      4. You're checked in!
      
      If you have any questions, please contact the church office.
      
      God bless,
      Church Administration
    `;

    return this.sendEmail({
      to: member.email,
      subject,
      html,
      text
    });
  }

  // Send bulk member codes after CSV upload
  async sendBulkMemberCodes(members) {
    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send emails in batches to avoid overwhelming the service
    for (let i = 0; i < members.length; i += 5) {
      const batch = members.slice(i, i + 5);
      const promises = batch.map(async (member) => {
        try {
          await this.sendMemberCodeEmail(member);
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            member: member.email,
            error: error.message
          });
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches
      if (i + 5 < members.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // Send session notification when session is created
  async sendSessionNotification(session, members = []) {
    const subject = `New Session: ${session.theme}`;
    const sessionDate = new Date(session.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const sessionTime = new Date(session.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .session-details { background: white; padding: 15px; border-radius: 8px; margin: 15px 0; }
            .password { font-size: 18px; font-weight: bold; color: #059669; text-align: center; 
                       padding: 10px; background: #ECFDF5; border: 2px solid #059669; 
                       border-radius: 8px; margin: 15px 0; }
            .footer { padding: 15px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Church Session!</h1>
            </div>
            <div class="content">
              <h2>You're invited to join us!</h2>
              
              <div class="session-details">
                <h3>${session.theme}</h3>
                <p><strong>Date:</strong> ${sessionDate}</p>
                <p><strong>Time:</strong> ${sessionTime}</p>
                ${session.location ? `<p><strong>Location:</strong> ${session.location}</p>` : ''}
                ${session.description ? `<p><strong>Description:</strong> ${session.description}</p>` : ''}
              </div>
              
              <h3>Session Password for Check-in:</h3>
              <div class="password">${session.sessionPassword}</div>
              
              <h3>How to check in:</h3>
              <ol>
                <li>Scan the QR code at the session</li>
                <li>Enter session password: <strong>${session.sessionPassword}</strong></li>
                <li>Enter your 4-digit member code</li>
                <li>You're checked in!</li>
              </ol>
              
              <p>We look forward to seeing you there!</p>
              
              <p>God bless,<br>Church Administration</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Church Attendance Management System.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      New Church Session!
      
      You're invited to join us!
      
      Session: ${session.theme}
      Date: ${sessionDate}
      Time: ${sessionTime}
      ${session.location ? `Location: ${session.location}` : ''}
      ${session.description ? `Description: ${session.description}` : ''}
      
      Session Password for Check-in: ${session.sessionPassword}
      
      How to check in:
      1. Scan the QR code at the session
      2. Enter session password: ${session.sessionPassword}
      3. Enter your 4-digit member code
      4. You're checked in!
      
      We look forward to seeing you there!
      
      God bless,
      Church Administration
    `;

    const results = {
      sent: 0,
      failed: 0,
      errors: []
    };

    // Send to all members if no specific list provided
    const recipients = members.length > 0 ? members : [];

    if (recipients.length === 0) {
      // Mock: Would typically fetch all active members from database
      console.log(`📧 Session notification would be sent to all active members for: ${session.theme}`);
      return { sent: 0, failed: 0, message: 'No recipients specified' };
    }

    // Send emails in batches
    for (let i = 0; i < recipients.length; i += 10) {
      const batch = recipients.slice(i, i + 10);
      const promises = batch.map(async (member) => {
        try {
          await this.sendEmail({
            to: member.email,
            subject,
            html,
            text
          });
          results.sent++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            member: member.email,
            error: error.message
          });
        }
      });

      await Promise.all(promises);
      
      // Small delay between batches
      if (i + 10 < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    return results;
  }

  // Get email queue for debugging
  getEmailQueue() {
    return this.emailQueue;
  }

  // Clear email queue
  clearEmailQueue() {
    this.emailQueue = [];
  }
}

export const emailService = new EmailService();
export default emailService;