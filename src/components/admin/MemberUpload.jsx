import { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { apiService } from '../../services/apiService';

const MemberUpload = ({ onClose, onSuccess }) => {
  const { showError, showSuccess, members } = useApp();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv'
      ];
      
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Please select a valid Excel (.xlsx, .xls) or CSV file');
        return;
      }
      
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      const mockEvent = { target: { files: [droppedFile] } };
      handleFileSelect(mockEvent);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // Validation and processing now handled by the backend API

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);
    setValidationResults(null);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(25);

      // Upload to real API endpoint
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/members/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      setUploadProgress(75);

      const result = await response.json();
      setUploadProgress(100);
      
      // Transform API response to match component structure
      const transformedResults = {
        totalProcessed: result.summary?.totalRows || 0,
        validMembers: result.data?.importedMembers || [],
        duplicateEmails: [
          ...(result.data?.errors?.duplicateInDatabase || []),
          ...(result.data?.errors?.duplicateInFile || [])
        ],
        invalidEmails: result.data?.errors?.invalidEmails || [],
        validationErrors: result.data?.errors?.validationErrors || [],
        creationErrors: result.data?.errors?.creationErrors || [],
        emailFailures: result.data?.warnings?.emailFailures || [],
        summary: result.summary
      };

      setValidationResults(transformedResults);
      
      if (transformedResults.validMembers.length > 0) {
        showSuccess(`Successfully imported ${transformedResults.validMembers.length} members`);
        // Refresh members list
        if (onSuccess) {
          onSuccess(transformedResults);
        }
      } else {
        showError('No valid members found in the file');
      }
      
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const downloadTemplate = async (format = 'xlsx') => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/members/template?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `members_template.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download error:', err);
      showError('Failed to download template');
    }
  };

  // Remove old downloadTemplate function - replaced above

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Upload Members
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Template Download */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <DocumentIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  Download Template
                </h4>
                <p className="mt-1 text-sm text-blue-700">
                  Download the Excel template to see the required format for member data.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => downloadTemplate('xlsx')}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Download Excel →
                  </button>
                  <span className="text-blue-600">|</span>
                  <button
                    onClick={() => downloadTemplate('csv')}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Download CSV →
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Excel or CSV File
            </label>
            
            <div
              className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="space-y-1 text-center">
                <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                  >
                    <span>Upload a file</span>
                    <input
                      id="file-upload"
                      ref={fileInputRef}
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">
                  Excel (.xlsx, .xls) or CSV files up to 10MB
                </p>
              </div>
            </div>

            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected: {file.name} ({Math.round(file.size / 1024)}KB)
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Validation Results */}
          {validationResults && (
            <div className="space-y-4">
              {/* Enhanced Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Upload Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Rows: {validationResults.totalProcessed}</div>
                  <div className="text-green-700 font-medium">Successfully Imported: {validationResults.validMembers.length}</div>
                  <div className="text-red-700">Duplicate Emails: {validationResults.duplicateEmails.length}</div>
                  <div className="text-red-700">Invalid Emails: {validationResults.invalidEmails.length}</div>
                  <div className="text-yellow-700">Validation Errors: {validationResults.validationErrors.length}</div>
                  <div className="text-orange-700">Creation Errors: {validationResults.creationErrors.length}</div>
                </div>
                {validationResults.emailFailures?.length > 0 && (
                  <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
                    <div className="flex items-center text-yellow-800 text-sm">
                      <InformationCircleIcon className="h-4 w-4 mr-1" />
                      {validationResults.emailFailures.length} members imported but PIN emails failed to send
                    </div>
                  </div>
                )}
              </div>

              {/* Duplicate Emails - Enhanced */}
              {validationResults.duplicateEmails.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-sm font-medium text-red-800">Duplicate Emails ({validationResults.duplicateEmails.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.duplicateEmails.map((item, index) => (
                      <div key={index} className="text-sm text-red-700 py-1 border-b border-red-100 last:border-b-0">
                        <div className="font-medium">Row {item.row}: {item.name} ({item.email})</div>
                        <div className="text-xs text-red-600 ml-2">
                          {item.type === 'database_duplicate' && 'Email already exists in database'}
                          {item.type === 'file_duplicate' && `Duplicate in upload file (first found at row ${item.firstFoundAtRow})`}
                          {item.existingMember && (
                            <span> - Existing member: {item.existingMember.name}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Emails - Enhanced */}
              {validationResults.invalidEmails.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-sm font-medium text-red-800">Invalid Email Addresses ({validationResults.invalidEmails.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.invalidEmails.map((item, index) => (
                      <div key={index} className="text-sm text-red-700 py-1 border-b border-red-100 last:border-b-0">
                        <div className="font-medium">Row {item.row}: {item.name || 'Unknown Name'}</div>
                        <div className="text-xs text-red-600 ml-2">
                          Invalid email: '{item.email}' - {item.error || 'Please provide a valid email address'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {validationResults.validationErrors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <h4 className="text-sm font-medium text-yellow-800">Validation Errors ({validationResults.validationErrors.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.validationErrors.map((item, index) => (
                      <div key={index} className="text-sm text-yellow-700 py-1 border-b border-yellow-100 last:border-b-0">
                        <div className="font-medium">Row {item.row}: {item.name || 'Unknown Name'}</div>
                        <div className="text-xs text-yellow-600 ml-2">
                          {item.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Creation Errors */}
              {validationResults.creationErrors.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
                    <h4 className="text-sm font-medium text-orange-800">Creation Errors ({validationResults.creationErrors.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.creationErrors.map((item, index) => (
                      <div key={index} className="text-sm text-orange-700 py-1 border-b border-orange-100 last:border-b-0">
                        <div className="font-medium">Row {item.row}: {item.name || 'Unknown Name'} ({item.email})</div>
                        <div className="text-xs text-orange-600 ml-2">
                          {item.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Email Failures Warning */}
              {validationResults.emailFailures?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
                    <h4 className="text-sm font-medium text-blue-800">PIN Email Delivery Issues ({validationResults.emailFailures.length})</h4>
                  </div>
                  <div className="text-sm text-blue-700 mb-2">
                    These members were successfully created but their PIN emails failed to send. You can resend PINs manually from the member list.
                  </div>
                  <div className="max-h-24 overflow-y-auto">
                    {validationResults.emailFailures.map((item, index) => (
                      <div key={index} className="text-sm text-blue-600 py-1">
                        Row {item.row}: {item.name} ({item.email})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Successfully Imported Members */}
              {validationResults.validMembers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-sm font-medium text-green-800">Successfully Imported Members ({validationResults.validMembers.length})</h4>
                  </div>
                  <div className="text-sm text-green-700 mb-2">
                    These members have been successfully added to the system and PIN emails have been sent.
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.validMembers.slice(0, 5).map((member, index) => (
                      <div key={index} className="text-sm text-green-700 py-1 border-b border-green-100 last:border-b-0">
                        <div className="font-medium">{member.name} - {member.email}</div>
                        <div className="text-xs text-green-600 ml-2">
                          PIN: {member.pin} | Phone: {member.phone || 'Not provided'}
                        </div>
                      </div>
                    ))}
                    {validationResults.validMembers.length > 5 && (
                      <div className="text-sm text-green-600 italic mt-2">
                        ...and {validationResults.validMembers.length - 5} more members
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {validationResults ? 'Close' : 'Cancel'}
          </button>
          {!validationResults ? (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Processing...' : 'Upload & Process'}
            </button>
          ) : (
            <button
              onClick={() => {
                setValidationResults(null);
                setFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Upload Another File
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberUpload;