import { useState, useEffect } from 'react';
import { XMarkIcon, PrinterIcon, ShareIcon } from '@heroicons/react/24/outline';
import { QRCodeCanvas as QRCode } from 'qrcode.react';
import { sessionService } from '../../services/sessionService';
import { format } from 'date-fns';

const QRCodeModal = ({ session, onClose }) => {
  const [qrSize, setQrSize] = useState(256);
  const [downloading, setDownloading] = useState(false);
  const [qrLoaded, setQrLoaded] = useState(false);

  useEffect(() => {
    // Small delay to show loading state briefly, then mark as loaded
    const timer = setTimeout(() => setQrLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] my-auto overflow-y-auto">
          <div className="flex items-center justify-between p-3 sm:p-4 sm:p-6 border-b border-gray-200 no-print">
            <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900 break-words pr-2 min-w-0 flex-1">
              QR Code for {session.theme}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 flex-shrink-0 touch-manipulation"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <div className="p-3 sm:p-4 sm:p-6">
            <div className="print-area text-center">
              {/* Session Information */}
              <div className="mb-3 sm:mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2 break-words">{session.theme}</h2>
                {session.description && (
                  <p className="text-xs sm:text-sm lg:text-base text-gray-600 mb-2 break-words">{session.description}</p>
                )}
                <div className="text-xs sm:text-sm text-gray-500 space-y-1">
                  <p>
                    <strong>Date:</strong> {format(new Date(session.startTime), 'MMMM dd, yyyy')}
                  </p>
                  <p>
                    <strong>Time:</strong> {format(new Date(session.startTime), 'h:mm a')} - {format(new Date(session.endTime), 'h:mm a')}
                  </p>
                  {session.location && (
                    <p className="break-words">
                      <strong>Location:</strong> {session.location}
                    </p>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-3 sm:mb-4 sm:mb-6">
                <div className="bg-white p-2 sm:p-4 rounded-lg shadow-sm border-2 border-gray-200">
                  {qrLoaded ? (
                    <QRCode
                      value={checkinUrl}
                      size={Math.min(qrSize, Math.min(window.innerWidth - 60, 256))}
                      level="M"
                      includeMargin={true}
                    />
                  ) : (
                    <div 
                      className="bg-gray-100 animate-pulse rounded flex items-center justify-center"
                      style={{ width: Math.min(qrSize, Math.min(window.innerWidth - 60, 256)), height: Math.min(qrSize, Math.min(window.innerWidth - 60, 256)) }}
                    >
                      <div className="text-gray-400 text-center p-2">
                        <svg className="mx-auto h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span className="text-xs">Generating QR Code...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2">
                <h3 className="text-sm sm:text-base lg:text-lg font-medium text-gray-900">How to Check In</h3>
                <div className="text-xs sm:text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                  <p>1. Scan the QR code with your phone camera</p>
                  <p>2. Answer the security question</p>
                  <p>3. Enter your 4-digit PIN</p>
                  <p>4. Confirm your attendance</p>
                </div>
              </div>

              {/* URL for manual entry */}
              <div className="mt-3 sm:mt-4 sm:mt-6 p-2 sm:p-3 bg-gray-50 rounded-md">
                <p className="text-xs text-gray-500 mb-1">Or visit:</p>
                <p className="text-xs sm:text-sm font-mono text-gray-700 break-all">
                  {checkinUrl}
                </p>
              </div>
            </div>

            {/* Size Control */}
            <div className="mt-4 sm:mt-6 no-print">
              <label htmlFor="qr-size" className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                QR Code Size
              </label>
              <select
                id="qr-size"
                value={qrSize}
                onChange={(e) => {
                  setQrLoaded(false);
                  setQrSize(parseInt(e.target.value));
                  setTimeout(() => setQrLoaded(true), 50);
                }}
                className="block w-full px-3 py-2.5 sm:py-2 text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 touch-manipulation"
              >
                <option value={128}>Small (128x128)</option>
                <option value={256}>Medium (256x256)</option>
                <option value={512}>Large (512x512)</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 px-3 sm:px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 no-print">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDownload('png')}
                disabled={downloading}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 touch-manipulation"
              >
                {downloading ? 'Downloading...' : <><span className="hidden sm:inline">Download </span>PNG</>}
              </button>

              <button
                onClick={() => handleDownload('pdf')}
                disabled={downloading}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 touch-manipulation"
              >
                {downloading ? 'Downloading...' : <><span className="hidden sm:inline">Download </span>PDF</>}
              </button>

              <button
                onClick={handleShare}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
              >
                <ShareIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
              >
                <PrinterIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Print</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 touch-manipulation"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default QRCodeModal;