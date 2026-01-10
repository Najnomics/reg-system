import { useState, useRef } from 'react';
import { XMarkIcon, CloudArrowUpIcon, DocumentIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useApp } from '../../contexts/SimpleAppContext';
import { emailService } from '../../services/emailService';

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

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const generateMemberCode = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const parseCSVContent = (content) => {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      
      rows.push(row);
    }
    
    return rows;
  };

  const validateCSVData = (data) => {
    const results = {
      validMembers: [],
      duplicateEmails: [],
      invalidEmails: [],
      missingFields: [],
      totalProcessed: data.length
    };
    
    const existingEmails = new Set(members.map(m => m.email.toLowerCase()));
    const newEmails = new Set();
    
    data.forEach((row, index) => {
      const lineNumber = index + 2; // +2 because CSV has header and is 1-indexed
      
      // Check required fields
      if (!row.firstname || !row.lastname || !row.email) {
        results.missingFields.push({
          line: lineNumber,
          data: row,
          missing: [
            !row.firstname && 'firstName',
            !row.lastname && 'lastName', 
            !row.email && 'email'
          ].filter(Boolean)
        });
        return;
      }
      
      const email = row.email.toLowerCase();
      
      // Check for invalid email
      if (!validateEmail(email)) {
        results.invalidEmails.push({
          line: lineNumber,
          email: row.email,
          data: row
        });
        return;
      }
      
      // Check for duplicate email (existing or in current batch)
      if (existingEmails.has(email) || newEmails.has(email)) {
        results.duplicateEmails.push({
          line: lineNumber,
          email: row.email,
          data: row,
          type: existingEmails.has(email) ? 'existing' : 'duplicate_in_batch'
        });
        return;
      }
      
      newEmails.add(email);
      
      // Valid member
      const memberCode = generateMemberCode();
      results.validMembers.push({
        firstName: row.firstname,
        lastName: row.lastname,
        email: row.email,
        phone: row.phone || '',
        dateOfBirth: row.dateofbirth || '',
        memberCode: memberCode,
        createdAt: new Date().toISOString(),
        isActive: true
      });
    });
    
    return results;
  };

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
      // Read file content
      const fileContent = await file.text();
      setUploadProgress(25);
      
      // Parse CSV
      const csvData = parseCSVContent(fileContent);
      setUploadProgress(50);
      
      // Validate data
      const validation = validateCSVData(csvData);
      setUploadProgress(75);
      
      setValidationResults(validation);
      setUploadProgress(100);
      
      if (validation.validMembers.length > 0) {
        showSuccess(`Successfully validated ${validation.validMembers.length} members`);
      } else {
        showError('No valid members found in the file');
      }
      
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleConfirmUpload = async () => {
    if (!validationResults || validationResults.validMembers.length === 0) {
      return;
    }
    
    try {
      // Mock API call to save members
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess(`Successfully imported ${validationResults.validMembers.length} members`);
      onSuccess(validationResults);
    } catch (err) {
      showError('Failed to save members');
    }
  };

  const downloadTemplate = () => {
    const csvContent = 'firstName,lastName,email,phone,dateOfBirth\nJohn,Doe,john.doe@example.com,(555) 123-4567,1985-06-15\nJane,Smith,jane.smith@example.com,(555) 234-5678,1992-03-22';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'member_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
                <div className="mt-2">
                  <button
                    onClick={downloadTemplate}
                    className="text-sm font-medium text-blue-800 hover:text-blue-900"
                  >
                    Download template →
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
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Validation Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total Processed: {validationResults.totalProcessed}</div>
                  <div className="text-green-700">Valid Members: {validationResults.validMembers.length}</div>
                  <div className="text-red-700">Duplicate Emails: {validationResults.duplicateEmails.length}</div>
                  <div className="text-red-700">Invalid Emails: {validationResults.invalidEmails.length}</div>
                  <div className="text-yellow-700">Missing Fields: {validationResults.missingFields.length}</div>
                </div>
              </div>

              {/* Duplicate Emails */}
              {validationResults.duplicateEmails.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-sm font-medium text-red-800">Duplicate Emails ({validationResults.duplicateEmails.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.duplicateEmails.map((item, index) => (
                      <div key={index} className="text-sm text-red-700 py-1">
                        Line {item.line}: {item.email} {item.type === 'existing' ? '(already exists)' : '(duplicate in file)'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invalid Emails */}
              {validationResults.invalidEmails.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="text-sm font-medium text-red-800">Invalid Emails ({validationResults.invalidEmails.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.invalidEmails.map((item, index) => (
                      <div key={index} className="text-sm text-red-700 py-1">
                        Line {item.line}: {item.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missing Fields */}
              {validationResults.missingFields.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <h4 className="text-sm font-medium text-yellow-800">Missing Required Fields ({validationResults.missingFields.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.missingFields.map((item, index) => (
                      <div key={index} className="text-sm text-yellow-700 py-1">
                        Line {item.line}: Missing {item.missing.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Valid Members Preview */}
              {validationResults.validMembers.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                    <h4 className="text-sm font-medium text-green-800">Valid Members Ready for Import ({validationResults.validMembers.length})</h4>
                  </div>
                  <div className="max-h-32 overflow-y-auto">
                    {validationResults.validMembers.slice(0, 5).map((member, index) => (
                      <div key={index} className="text-sm text-green-700 py-1">
                        {member.firstName} {member.lastName} - {member.email} (Code: {member.memberCode})
                      </div>
                    ))}
                    {validationResults.validMembers.length > 5 && (
                      <div className="text-sm text-green-600 italic">
                        ...and {validationResults.validMembers.length - 5} more
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
            Cancel
          </button>
          {!validationResults ? (
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? 'Validating...' : 'Validate'}
            </button>
          ) : (
            <div className="flex space-x-3">
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
                Upload New File
              </button>
              {validationResults.validMembers.length > 0 && (
                <button
                  onClick={handleConfirmUpload}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Import {validationResults.validMembers.length} Valid Members
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberUpload;