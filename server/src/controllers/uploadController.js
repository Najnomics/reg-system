const prisma = require('../config/database');
const { parseExcelFile, generateTemplate, validateFileFormat } = require('../services/excelParser');

/**
 * Helper function to create a member with retry logic
 * Retries up to 3 times for transient errors
 */
const createMemberWithRetry = async (memberData, createdBy, maxRetries = 3) => {
  // Validate required fields
  if (!memberData || !memberData.name || !memberData.email) {
    return {
      success: false,
      error: 'Missing required fields: name and email are required',
      attempts: 0,
      permanent: true
    };
  }

  // Validate pin and pinHash exist
  if (!memberData.pin || !memberData.pinHash) {
    return {
      success: false,
      error: 'Missing PIN data: pin and pinHash are required',
      attempts: 0,
      permanent: true
    };
  }

  if (!createdBy) {
    return {
      success: false,
      error: 'Missing creator id for member creation',
      attempts: 0,
      permanent: true
    };
  }

  let lastError = null;
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const newMember = await prisma.member.create({
        data: {
          name: memberData.name.trim(),
          email: memberData.email.trim().toLowerCase(),
          pin: memberData.pin,
          pinHash: memberData.pinHash,
          isActive: true,
          createdBy,
        },
        select: {
          id: true,
          name: true,
          email: true,
          pin: true,
          createdAt: true,
        },
      });
      
      return { success: true, member: newMember, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      attempt++;
      
      // Don't retry for permanent errors (duplicate name, validation errors)
      const errorCode = error.code || '';
      const errorMessage = error.message || '';
      
      // Permanent errors - don't retry
      if (
        errorCode === 'P2002' || // Unique constraint violation
        errorMessage.includes('Unique constraint') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('duplicate') ||
        errorMessage.includes('Invalid') ||
        errorMessage.includes('required') ||
        errorMessage.includes('validation')
      ) {
        return { 
          success: false, 
          error: errorMessage, 
          attempts: attempt,
          permanent: true 
        };
      }
      
      // Transient errors - retry with exponential backoff
      if (attempt <= maxRetries) {
        const delay = Math.min(100 * Math.pow(2, attempt - 1), 1000); // Max 1 second delay
        await new Promise(resolve => setTimeout(resolve, delay));
        console.log(`Retrying member creation (attempt ${attempt + 1}/${maxRetries + 1}) for row ${memberData.rowNumber}: ${memberData.name}`);
      }
    }
  }
  
  // All retries exhausted
  return { 
    success: false, 
    error: lastError?.message || 'Unknown error', 
    attempts: attempt,
    permanent: false 
  };
};

/**
 * Upload and process Excel file with member data
 */
const uploadMembers = async (req, res) => {
  try {
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload',
      });
    }

    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Admin authentication required',
      });
    }

    // Validate file format
    try {
      validateFileFormat(file.originalname, file.mimetype);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid file format',
        message: error.message,
      });
    }

    console.log(`Processing file: ${file.originalname} (${file.size} bytes)`);

    // Parse the Excel file
    const parseResult = await parseExcelFile(file.buffer, file.originalname);
    
    if (parseResult.errors.length === parseResult.totalRows) {
      return res.status(400).json({
        error: 'All rows failed validation',
        message: 'No valid member data found in the file',
        details: parseResult.errors.slice(0, 10),
        totalErrors: parseResult.errors.length,
      });
    }

    // Pre-check for duplicate names in existing database
    // Names must be unique - duplicate names are not allowed
    const namesToCheck = parseResult.data.map(member => member.name.trim());
    const existingMembers = await prisma.member.findMany({
      where: {
        name: {
          in: namesToCheck
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    // Create lookup map for existing names
    const existingNameMap = new Map();
    existingMembers.forEach(member => {
      existingNameMap.set(member.name.toLowerCase(), member);
    });

    // Check for duplicate names within the uploaded file
    const uploadedNames = new Map();
    const fileDuplicates = [];
    
    parseResult.data.forEach(member => {
      const normalizedName = member.name.trim().toLowerCase();
      if (uploadedNames.has(normalizedName)) {
        fileDuplicates.push({
          row: member.rowNumber,
          name: member.name,
          email: member.email,
          error: 'Duplicate name in upload file',
          type: 'file_duplicate',
          firstFoundAtRow: uploadedNames.get(normalizedName).rowNumber
        });
      } else {
        uploadedNames.set(normalizedName, member);
      }
    });

    // Process valid members
    const successfulImports = [];
    const importErrors = [];
    const duplicateErrors = [];
    
    for (const memberData of parseResult.data) {
      try {
        // Skip if this is a duplicate name within the file
        const normalizedName = memberData.name.trim().toLowerCase();
        const isDuplicateInFile = fileDuplicates.some(dup => 
          dup.row === memberData.rowNumber && dup.name.toLowerCase() === normalizedName
        );
        
        if (isDuplicateInFile) {
          continue; // Skip this row, already recorded in fileDuplicates
        }

        // Check if name already exists in database
        const existingMember = existingNameMap.get(normalizedName);
        if (existingMember) {
          duplicateErrors.push({
            row: memberData.rowNumber,
            name: memberData.name,
            email: memberData.email,
            error: `Name already exists in database`,
            type: 'database_duplicate',
            existingMember: {
              id: existingMember.id,
              name: existingMember.name,
              email: existingMember.email,
              createdAt: existingMember.createdAt
            }
          });
          continue;
        }

        // Create new member with retry logic
        const result = await createMemberWithRetry(memberData, req.user.id, 3);
        
        if (result.success) {
          successfulImports.push({
            row: memberData.rowNumber,
            member: result.member,
            attempts: result.attempts,
          });
          
          // Log if retry was needed
          if (result.attempts > 1) {
            console.log(`Member created after ${result.attempts} attempts (row ${memberData.rowNumber}): ${memberData.name}`);
          }
        } else {
          // Member creation failed after retries
          importErrors.push({
            row: memberData.rowNumber,
            email: memberData.email,
            name: memberData.name || 'Unknown',
            error: result.error,
            type: result.permanent ? 'permanent_error' : 'creation_error',
            attempts: result.attempts,
            retried: result.attempts > 1
          });
          
          console.error(`Failed to create member after ${result.attempts} attempts (row ${memberData.rowNumber}):`, result.error);
        }

        // PIN email sending is disabled - admins will send PINs manually via the admin panel
        // Email can be sent manually using the "Resend PIN" feature (individual or bulk)

      } catch (error) {
        // This catch block handles unexpected errors outside the retry logic
        console.error(`Unexpected error creating member (row ${memberData.rowNumber}):`, error);
        
        importErrors.push({
          row: memberData.rowNumber,
          email: memberData.email,
          name: memberData.name || 'Unknown',
          error: error.message,
          type: 'unexpected_error',
          attempts: 1,
          retried: false
        });
      }
    }

    // Combine all types of errors - ensure all are arrays
    const parseErrors = Array.isArray(parseResult.errors) ? parseResult.errors : [];
    const duplicateErrorsArray = Array.isArray(duplicateErrors) ? duplicateErrors : [];
    const fileDuplicatesArray = Array.isArray(fileDuplicates) ? fileDuplicates : [];
    const importErrorsArray = Array.isArray(importErrors) ? importErrors : [];
    
    const allErrors = [
      ...parseErrors.map(err => ({...err, type: 'validation_error'})),
      ...duplicateErrorsArray,
      ...fileDuplicatesArray,
      ...importErrorsArray
    ];

    // Categorize errors for detailed reporting
    const retriedErrors = importErrorsArray.filter(err => err && err.retried === true);
    const permanentErrors = importErrorsArray.filter(err => err && err.type === 'permanent_error');
    const transientErrors = importErrorsArray.filter(err => err && err.permanent !== true && err.type === 'creation_error');
    
    const errorSummary = {
      validationErrors: parseErrors.length,
      invalidEmails: parseErrors.filter(err => err && err.error && err.error.includes('Invalid email')).length,
      duplicateInFile: fileDuplicatesArray.length,
      duplicateInDatabase: duplicateErrorsArray.length,
      creationErrors: importErrorsArray.length,
      retriedErrors: retriedErrors.length,
      permanentErrors: permanentErrors.length,
      transientErrors: transientErrors.length
    };

    // Prepare detailed response
    const response = {
      success: true,
      message: `Import completed. ${successfulImports.length} members imported successfully.`,
      summary: {
        totalRows: parseResult.totalRows,
        parsed: parseResult.validRows,
        imported: successfulImports.length,
        failed: allErrors.length,
        errorBreakdown: errorSummary
      },
      data: {
        importedMembers: Array.isArray(successfulImports) ? successfulImports.map(item => item.member) : [],
        successfulWithRetries: Array.isArray(successfulImports) 
          ? successfulImports.filter(item => item && item.attempts > 1).map(item => ({
              row: item.row,
              member: item.member,
              attempts: item.attempts
            }))
          : [],
        errors: {
          all: Array.isArray(allErrors) ? allErrors.slice(0, 100) : [], // Show more errors for detailed feedback
          duplicateInFile: fileDuplicatesArray,
          duplicateInDatabase: duplicateErrorsArray,
          invalidEmails: parseErrors.filter(err => err && err.error && err.error.includes('Invalid email')),
          validationErrors: parseErrors.filter(err => err && err.error && !err.error.includes('Invalid email')),
          creationErrors: importErrorsArray,
          retriedErrors: retriedErrors,
          permanentErrors: permanentErrors,
          transientErrors: transientErrors
        }
      },
    };

    // Set status based on results
    if (successfulImports.length === 0) {
      response.success = false;
      response.message = 'No members were imported due to errors';
      return res.status(400).json(response);
    } else if (allErrors.length > 0) {
      response.message += ` ${allErrors.length} rows had errors.`;
      return res.status(207).json(response); // 207 Multi-Status
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    
    // Provide more detailed error information
    const errorResponse = {
      error: 'Internal server error',
      message: 'Failed to process uploaded file',
      details: error.message || 'Unknown error occurred',
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.stack = error.stack;
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Download Excel template for member upload
 */
const downloadTemplate = async (req, res) => {
  try {
    const { format = 'xlsx' } = req.query;
    
    console.log(`Template download requested: format=${format}`);
    
    if (format === 'csv') {
      // Generate CSV template with proper formatting
      const csvRows = [
        ['name', 'email'], // Headers
        ['John Doe', 'john@example.com'], // Sample row 1
        ['Jane Smith', 'jane@example.com'], // Sample row 2
        ['Bob Johnson', 'bob@example.com'], // Sample row 3
      ];
      
      // Convert to CSV string with proper escaping
      const csvContent = csvRows.map(row => 
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        }).join(',')
      ).join('\n');
      
      const csvBuffer = Buffer.from(csvContent, 'utf8');
      
      console.log(`CSV template generated: ${csvBuffer.length} bytes`);
      console.log('CSV content preview:', csvContent.substring(0, 200));
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="members_template.csv"');
      res.setHeader('Content-Length', csvBuffer.length);
      
      res.send(csvBuffer);
    } else {
      // Generate Excel template
      const templateBuffer = generateTemplate();
      
      if (!templateBuffer || templateBuffer.length === 0) {
        throw new Error('Failed to generate template buffer');
      }
      
      console.log(`Excel template generated: ${templateBuffer.length} bytes`);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="members_template.xlsx"');
      res.setHeader('Content-Length', templateBuffer.length);
      
      res.send(templateBuffer);
    }

  } catch (error) {
    console.error('Template generation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate template file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get upload history and statistics
 */
const getUploadHistory = async (req, res) => {
  try {
    // Get recent member imports (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMembers = await prisma.member.findMany({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Get statistics
    const stats = await prisma.member.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
      },
    });

    const recentStats = await prisma.member.aggregate({
      _count: {
        id: true,
      },
      where: {
        isActive: true,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        recentImports: recentMembers,
        statistics: {
          totalActiveMembers: stats._count.id,
          recentImports: recentStats._count.id,
          period: '30 days',
        },
      },
    });

  } catch (error) {
    console.error('Upload history error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve upload history',
    });
  }
};

module.exports = {
  uploadMembers,
  downloadTemplate,
  getUploadHistory,
};