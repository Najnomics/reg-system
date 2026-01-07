const QRCode = require('qrcode');

/**
 * QR Code service for generating session QR codes
 */
class QRCodeService {
  /**
   * Generate QR code for a session
   */
  async generateSessionQR(sessionId, baseUrl = null) {
    try {
      const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInUrl = `${frontendUrl}/checkin/${sessionId}`;

      // Generate QR code as data URL (base64 image)
      const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256, // 256px width
      });

      // Also generate QR code as SVG for better scalability
      const qrCodeSvg = await QRCode.toString(checkInUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 256,
      });

      return {
        url: checkInUrl,
        dataUrl: qrCodeDataUrl,
        svg: qrCodeSvg,
      };

    } catch (error) {
      console.error('QR code generation error:', error);
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code buffer for download
   */
  async generateQRBuffer(sessionId, format = 'png', baseUrl = null) {
    try {
      const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInUrl = `${frontendUrl}/checkin/${sessionId}`;

      let buffer;
      const options = {
        errorCorrectionLevel: 'M',
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 512, // Higher resolution for download
      };

      switch (format.toLowerCase()) {
        case 'png':
          buffer = await QRCode.toBuffer(checkInUrl, {
            ...options,
            type: 'png',
          });
          break;
        case 'svg':
          buffer = Buffer.from(await QRCode.toString(checkInUrl, {
            ...options,
            type: 'svg',
          }));
          break;
        default:
          throw new Error('Unsupported format. Use png or svg.');
      }

      return buffer;

    } catch (error) {
      console.error('QR code buffer generation error:', error);
      throw new Error(`Failed to generate QR code buffer: ${error.message}`);
    }
  }

  /**
   * Generate QR code with custom styling for print
   */
  async generatePrintableQR(session, includeDetails = true) {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInUrl = `${frontendUrl}/checkin/${session.id}`;

      // Generate base QR code
      const qrCodeDataUrl = await QRCode.toDataURL(checkInUrl, {
        errorCorrectionLevel: 'H', // High error correction for print
        type: 'image/png',
        quality: 0.95,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 400, // Large size for print
      });

      if (!includeDetails) {
        return { qrCode: qrCodeDataUrl, url: checkInUrl };
      }

      // Generate printable HTML with session details
      const printableHtml = this.generatePrintableTemplate(session, qrCodeDataUrl);

      return {
        qrCode: qrCodeDataUrl,
        url: checkInUrl,
        printableHtml,
      };

    } catch (error) {
      console.error('Printable QR code generation error:', error);
      throw new Error(`Failed to generate printable QR code: ${error.message}`);
    }
  }

  /**
   * Generate printable HTML template with QR code
   */
  generatePrintableTemplate(session, qrCodeDataUrl) {
    const startTime = new Date(session.startTime).toLocaleString();
    const endTime = new Date(session.endTime).toLocaleString();
    const churchName = process.env.CHURCH_NAME || 'Church Name';

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Check-in QR Code - ${session.theme}</title>
        <style>
            @media print {
                body { margin: 0; }
                .no-print { display: none; }
            }
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                text-align: center;
            }
            .header {
                border-bottom: 3px solid #3B82F6;
                padding-bottom: 20px;
                margin-bottom: 30px;
            }
            .church-name {
                font-size: 28px;
                font-weight: bold;
                color: #1F2937;
                margin: 0 0 10px 0;
            }
            .session-title {
                font-size: 24px;
                color: #3B82F6;
                margin: 20px 0;
            }
            .qr-container {
                margin: 30px 0;
                padding: 20px;
                border: 2px dashed #6B7280;
                border-radius: 10px;
                background-color: #F9FAFB;
            }
            .qr-code {
                max-width: 300px;
                height: auto;
            }
            .session-details {
                background-color: #EFF6FF;
                border-left: 4px solid #3B82F6;
                padding: 20px;
                margin: 20px 0;
                text-align: left;
            }
            .session-details h3 {
                color: #1E40AF;
                margin-top: 0;
            }
            .instructions {
                background-color: #F0FDF4;
                border: 1px solid #BBF7D0;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            .instructions h3 {
                color: #166534;
                margin-top: 0;
            }
            .instructions ol {
                text-align: left;
                color: #374151;
            }
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #E5E7EB;
                font-size: 12px;
                color: #6B7280;
            }
            .print-button {
                background-color: #3B82F6;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin: 20px;
                font-size: 16px;
            }
            .print-button:hover {
                background-color: #2563EB;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1 class="church-name">${churchName}</h1>
            <p>Attendance Check-in</p>
        </div>

        <h2 class="session-title">${session.theme}</h2>

        <div class="qr-container">
            <h3>Scan to Check In</h3>
            <img src="${qrCodeDataUrl}" alt="Check-in QR Code" class="qr-code">
        </div>

        <div class="session-details">
            <h3>Session Details</h3>
            <p><strong>Event:</strong> ${session.theme}</p>
            <p><strong>Start Time:</strong> ${startTime}</p>
            <p><strong>End Time:</strong> ${endTime}</p>
            <p><strong>Check-in Window:</strong> ${startTime} - ${endTime}</p>
        </div>

        <div class="instructions">
            <h3>How to Check In</h3>
            <ol>
                <li>Open your smartphone camera or QR code scanner app</li>
                <li>Point the camera at the QR code above</li>
                <li>Tap the notification or link that appears</li>
                <li>Answer the location verification question</li>
                <li>Enter your 5-digit PIN</li>
                <li>You're checked in!</li>
            </ol>
            <p><strong>Need your PIN?</strong> Check your email or contact church administration.</p>
        </div>

        <button class="print-button no-print" onclick="window.print()">🖨️ Print This Page</button>

        <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>This QR code is valid only during the check-in window</p>
        </div>

        <script>
            // Auto-print functionality (optional)
            // window.onload = function() { window.print(); }
        </script>
    </body>
    </html>
    `;
  }

  /**
   * Validate QR code URL format
   */
  validateQRUrl(url) {
    try {
      const urlObj = new URL(url);
      const pathMatch = urlObj.pathname.match(/^\/checkin\/(\d+)$/);
      
      if (!pathMatch) {
        throw new Error('Invalid QR code URL format');
      }

      const sessionId = parseInt(pathMatch[1]);
      if (isNaN(sessionId) || sessionId <= 0) {
        throw new Error('Invalid session ID in QR code URL');
      }

      return { sessionId, isValid: true };

    } catch (error) {
      return { sessionId: null, isValid: false, error: error.message };
    }
  }

  /**
   * Generate multiple QR code formats for a session
   */
  async generateMultiFormatQR(sessionId, baseUrl = null) {
    try {
      const frontendUrl = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3000';
      const checkInUrl = `${frontendUrl}/checkin/${sessionId}`;

      const [dataUrl, svg, pngBuffer, svgBuffer] = await Promise.all([
        // Data URL for immediate display
        QRCode.toDataURL(checkInUrl, {
          errorCorrectionLevel: 'M',
          width: 256,
          margin: 1,
        }),
        // SVG string for scalable display
        QRCode.toString(checkInUrl, {
          type: 'svg',
          errorCorrectionLevel: 'M',
          width: 256,
          margin: 1,
        }),
        // PNG buffer for download
        QRCode.toBuffer(checkInUrl, {
          type: 'png',
          errorCorrectionLevel: 'H',
          width: 512,
          margin: 2,
        }),
        // SVG buffer for download
        Buffer.from(await QRCode.toString(checkInUrl, {
          type: 'svg',
          errorCorrectionLevel: 'H',
          width: 512,
          margin: 2,
        }))
      ]);

      return {
        url: checkInUrl,
        display: {
          dataUrl,
          svg,
        },
        download: {
          png: pngBuffer,
          svg: svgBuffer,
        },
      };

    } catch (error) {
      console.error('Multi-format QR generation error:', error);
      throw new Error(`Failed to generate QR codes: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new QRCodeService();