import { useState, useEffect } from 'react';
import { XMarkIcon, DocumentDuplicateIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';

const QRCodeModal = ({ session, onClose }) => {
  const { showSuccess } = useApp();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const checkInUrl = `${window.location.origin}/checkin/${session.id}`;

  useEffect(() => {
    // Generate QR code using QR Server API (free service)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkInUrl)}`;
    setQrCodeUrl(qrUrl);
  }, [checkInUrl]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(checkInUrl);
      showSuccess('Check-in URL copied to clipboard');
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = checkInUrl;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showSuccess('Check-in URL copied to clipboard');
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `qr-code-${session.theme.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('QR code downloaded');
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code - ${session.theme}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 40px;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 30px;
              border-radius: 10px;
            }
            h1 {
              font-size: 24px;
              margin-bottom: 10px;
            }
            .session-info {
              margin: 20px 0;
              font-size: 16px;
            }
            .qr-code {
              margin: 30px 0;
            }
            .instructions {
              font-size: 14px;
              color: #666;
              margin-top: 20px;
            }
            @media print {
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <h1>${session.theme}</h1>
            <div class="session-info">
              <p><strong>Date:</strong> ${new Date(session.startTime).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(session.startTime).toLocaleTimeString()}</p>
              ${session.location ? `<p><strong>Location:</strong> ${session.location}</p>` : ''}
            </div>
            <div class="qr-code">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 250px; height: 250px;" />
            </div>
            <div class="instructions">
              <p>Scan this QR code with your phone to check in</p>
              <p>Or visit: ${checkInUrl}</p>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            QR Code for Check-In
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Session Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">{session.theme}</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <p>
                <strong>Date:</strong> {new Date(session.startTime).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
              <p>
                <strong>Time:</strong> {new Date(session.startTime).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </p>
              {session.location && (
                <p><strong>Location:</strong> {session.location}</p>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="QR Code for session check-in"
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-100 flex items-center justify-center">
                  <QrCodeIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Scan this QR code to check in to the session
            </p>
          </div>

          {/* Check-in URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Check-in URL
            </label>
            <div className="flex">
              <input
                type="text"
                value={checkInUrl}
                readOnly
                className="flex-1 min-w-0 border-gray-300 rounded-l-md bg-gray-50 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <DocumentDuplicateIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-center space-x-3">
            <button
              onClick={downloadQRCode}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Download QR Code
            </button>
            <button
              onClick={printQRCode}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Print QR Code
            </button>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Instructions:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Display this QR code at your event entrance</li>
              <li>• Members can scan it with their phone camera</li>
              <li>• They'll be directed to the check-in page</li>
              <li>• Members enter their PIN to confirm attendance</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;