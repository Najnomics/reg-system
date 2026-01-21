const XLSX = require('xlsx');
const { generateMemberPin } = require('../utils/pinGenerator');

/**
 * Parse Excel/CSV file and extract member data
 */
const parseExcelFile = async (fileBuffer, filename) => {
  try {
    let workbook;
    
    // Determine file type and parse accordingly
    if (filename.endsWith('.csv')) {
      // Parse CSV file
      const csvData = fileBuffer.toString('utf8');
      workbook = XLSX.read(csvData, { type: 'string' });
    } else {
      // Parse Excel file (.xlsx, .xls)
      workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    }

    // Get the first worksheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert worksheet to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Use array of arrays format
      defval: '', // Default value for empty cells
    });

    if (jsonData.length === 0) {
      throw new Error('The file appears to be empty');
    }

    // Get headers (first row)
    const headers = jsonData[0].map(header => 
      header.toString().toLowerCase().trim()
    );

    // Find column indexes
    const columnMapping = findColumnMapping(headers);
    
    if (!columnMapping.name || !columnMapping.email) {
      throw new Error('Required columns "name" and "email" not found in the file');
    }

    // Process data rows (skip header row)
    const memberData = [];
    const errors = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const rowNumber = i + 1; // 1-based row number for user feedback
      
      try {
        const member = await processRow(row, columnMapping, rowNumber);
        if (member) {
          memberData.push(member);
        }
      } catch (error) {
        errors.push({
          row: rowNumber,
          name: row[columnMapping.name]?.toString().trim() || 'Unknown',
          email: row[columnMapping.email]?.toString().trim() || 'Missing',
          phone: columnMapping.phone ? row[columnMapping.phone]?.toString().trim() : '',
          error: error.message,
          type: error.message.includes('Invalid email') ? 'invalid_email' : 'validation_error',
          data: row,
        });
      }
    }

    return {
      success: true,
      data: memberData,
      errors: errors,
      totalRows: jsonData.length - 1, // Excluding header row
      validRows: memberData.length,
      errorRows: errors.length,
    };

  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse file: ${error.message}`);
  }
};

/**
 * Find column mapping from headers
 */
const findColumnMapping = (headers) => {
  const mapping = {};
  
  headers.forEach((header, index) => {
    // Normalize header for comparison
    const normalizedHeader = header.replace(/[^a-z0-9]/g, '');
    
    // Map common variations
    if (['name', 'fullname', 'membername', 'firstname'].includes(normalizedHeader)) {
      mapping.name = index;
    } else if (['email', 'emailaddress', 'mail'].includes(normalizedHeader)) {
      mapping.email = index;
    }
  });
  
  return mapping;
};

/**
 * Process a single row of data
 */
const processRow = async (row, columnMapping, rowNumber) => {
  // Extract values from row
  const name = row[columnMapping.name]?.toString().trim();
  const email = row[columnMapping.email]?.toString().trim().toLowerCase();

  // Validate required fields
  if (!name) {
    throw new Error('Name is required');
  }

  if (!email) {
    throw new Error('Email is required');
  }

  // Enhanced email validation with detailed error reporting
  if (!validateEmailDetailed(email)) {
    throw new Error(`Invalid email format: '${email}'. Please provide a valid email address (e.g., user@domain.com)`);
  }

  // Validate name length
  if (name.length < 2 || name.length > 100) {
    throw new Error('Name must be between 2 and 100 characters');
  }

  // Generate PIN for the member
  const { pin, pinHash } = await generateMemberPin();

  return {
    name,
    email,
    pin,
    pinHash,
    rowNumber,
  };
};

/**
 * Generate Excel template for download
 */
const generateTemplate = () => {
  // Create template data
  const templateData = [
    ['name', 'email', 'phone'], // Headers
    ['John Doe', 'john@example.com', '+1234567890'], // Sample row 1
    ['Jane Smith', 'jane@example.com', '+1987654321'], // Sample row 2
    ['Bob Johnson', 'bob@example.com', ''], // Sample row 3 (no phone)
  ];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Set column widths
  ws['!cols'] = [
    { width: 20 }, // name
    { width: 25 }, // email
    { width: 15 }, // phone
  ];

  // Style the header row
  const headerRange = XLSX.utils.decode_range(ws['!ref']);
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) continue;
    
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E2E8F0' } },
    };
  }

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Members Template');

  // Generate buffer
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Enhanced email validation with detailed error messages
 */
const validateEmailDetailed = (email) => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Check basic format
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailRegex.test(email)) {
    return false;
  }
  
  // Additional checks for common issues
  const parts = email.split('@');
  if (parts.length !== 2) {
    return false;
  }
  
  const [localPart, domain] = parts;
  
  // Check local part (before @)
  if (localPart.length === 0 || localPart.length > 64) {
    return false;
  }
  
  // Check domain part (after @)
  if (domain.length === 0 || domain.length > 253) {
    return false;
  }
  
  // Check for valid domain format
  const domainParts = domain.split('.');
  if (domainParts.length < 2) {
    return false;
  }
  
  // Check each domain part
  for (const part of domainParts) {
    if (part.length === 0 || !/^[a-zA-Z0-9-]+$/.test(part)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Validate file format before parsing
 */
const validateFileFormat = (filename, mimetype) => {
  const allowedExtensions = ['.xlsx', '.xls', '.csv'];
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];

  const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
  
  if (!allowedExtensions.includes(extension)) {
    throw new Error('Invalid file extension. Allowed formats: .xlsx, .xls, .csv');
  }

  if (!allowedMimeTypes.includes(mimetype)) {
    throw new Error('Invalid file format. Please upload a valid Excel or CSV file');
  }

  return true;
};

module.exports = {
  parseExcelFile,
  generateTemplate,
  validateFileFormat,
};