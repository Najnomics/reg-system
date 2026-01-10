import { useState, useRef } from 'react';
import { XMarkIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline';
import QRCode from 'qrcode.react';
import { sessionService } from '../../services/sessionService';
import { format } from 'date-fns';

const QRCodeModal = ({ session, onClose }) => {
  const [qrSize, setQrSize] = useState(256);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef(null);

  const checkinUrl = `${window.location.origin}/checkin/${session.id}`;

  const handleDownload = async (format = 'png') => {
    setDownloading(true);
    try {
      await sessionService.downloadQRCode(session.id, format);
    } catch (error) {
      alert(error.message);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(checkinUrl);
      alert('Check-in link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Check-in for ${session.theme}`,
          text: `Join our session: ${session.theme}`,
          url: checkinUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 no-print">
            <h3 className="text-lg font-medium text-gray-900">
              QR Code for {session.theme}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="print-area text-center">
              {/* Session Information */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{session.theme}</h2>
                {session.description && (
                  <p className="text-gray-600 mb-2">{session.description}</p>
                )}
                <div className="text-sm text-gray-500 space-y-1">
                  <p>
                    <strong>Date:</strong> {format(new Date(session.startTime), 'MMMM dd, yyyy')}
                  </p>
                  <p>
                    <strong>Time:</strong> {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
                  </p>
                  {session.location && (
                    <p>
                      <strong>Location:</strong> {session.location}
                    </p>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-gray-200">
                  <QRCode
                    value={checkinUrl}
                    size={qrSize}
                    level="M"
                    includeMargin={true}
                    ref={qrRef}
                  />
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <h3 className="text-lg font-medium text-gray-900">How to Check In</h3>
                <div className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                  <p>1. Scan the QR code with your phone camera</p>
                  <p>2. Answer the security question</p>
                  <p>3. Enter your 5-digit PIN</p>
                  <p>4. Confirm your attendance</p>
                </div>
              </div>

              {/* URL for manual entry */}
              <div className="mt-6 p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Or visit:</p>
                <p className="text-sm font-mono text-gray-700 break-all">
                  {checkinUrl}
                </p>
              </div>
            </div>

            {/* Size Control */}
            <div className="mt-6 no-print">
              <label htmlFor="qr-size" className="block text-sm font-medium text-gray-700 mb-2">
                QR Code Size
              </label>
              <select
                id="qr-size"
                value={qrSize}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value={128}>Small (128x128)</option>
                <option value={256}>Medium (256x256)</option>
                <option value={512}>Large (512x512)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 no-print">
            <div className="flex space-x-2">
              <button
                onClick={() => handleDownload('png')}
                disabled={downloading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {downloading ? 'Downloading...' : 'Download PNG'}
              </button>

              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {downloading ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={handleShare}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>

              <button
                onClick={onClose}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QRCodeModal;