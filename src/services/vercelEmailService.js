/**
 * Vercel Email Service
 * Calls Vercel serverless functions for email sending
 * This bypasses Railway's SMTP blocking
 */

const VERCEL_API_BASE = window.location.origin; // Use same origin for Vercel functions

class VercelEmailService {
  /**
   * Send a generic email via Vercel serverless function
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML content
   * @param {string} options.text - Plain text content (optional)
   * @param {string} options.memberId - Member ID for logging (optional)
   */
  async sendEmail({ to, subject, html, text, memberId }) {
    try {
      const response = await fetch(`${VERCEL_API_BASE}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
          memberId,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `HTTP error! status: ${response.status}` };
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = errorData.details;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Vercel email service error:', error);
      throw error;
    }
  }

  /**
   * Send PIN email to a member via Vercel serverless function
   * @param {Object} member - Member object
   * @param {string} member.id - Member ID
   * @param {string} member.name - Member name
   * @param {string} member.email - Member email
   * @param {string} member.pin - Member PIN (4 digits)
   */
  async sendPinEmail(member) {
    try {
      const response = await fetch(`${VERCEL_API_BASE}/api/send-pin-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: member.id,
          memberName: member.name,
          memberEmail: member.email,
          memberPin: member.pin,
        }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: `HTTP error! status: ${response.status}` };
        }
        
        const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.details = errorData.details;
        throw error;
      }

      return await response.json();
    } catch (error) {
      console.error('Vercel PIN email service error:', error);
      throw error;
    }
  }
}

export default new VercelEmailService();
