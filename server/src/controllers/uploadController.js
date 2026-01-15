const prisma = require('../config/database');
const { parseExcelFile, generateTemplate, validateFileFormat } = require('../services/excelParser');

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

    // Pre-check for duplicates in existing database
    const emailsToCheck = parseResult.data.map(member => member.email);
    const existingMembers = await prisma.member.findMany({
      where: {
        email: {
          in: emailsToCheck
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      }
    });

    // Create lookup map for existing emails
    const existingEmailMap = new Map();
    existingMembers.forEach(member => {
      existingEmailMap.set(member.email, member);
    });

    // Check for duplicates within the uploaded file
    const uploadedEmails = new Map();
    const fileDuplicates = [];
    
    parseResult.data.forEach(member => {
      if (uploadedEmails.has(member.email)) {
        fileDuplicates.push({
          row: member.rowNumber,
          email: member.email,
          name: member.name,
          error: 'Duplicate email in upload file',
          type: 'file_duplicate',
          firstFoundAtRow: uploadedEmails.get(member.email).rowNumber
        });
      } else {
        uploadedEmails.set(member.email, member);
      }
    });

    // Process valid members
    const successfulImports = [];
    const importErrors = [];
    const duplicateErrors = [];
    const emailFailures = [];
    
    for (const memberData of parseResult.data) {
      try {
        // Skip if this is a duplicate within the file
        const isDuplicateInFile = fileDuplicates.some(dup => 
          dup.row === memberData.rowNumber && dup.email === memberData.email
        );
        
        if (isDuplicateInFile) {
          continue; // Skip this row, already recorded in fileDuplicates
        }

        // Check if email already exists in database
        const existingMember = existingEmailMap.get(memberData.email);
        if (existingMember) {
          duplicateErrors.push({
            row: memberData.rowNumber,
            email: memberData.email,
            name: memberData.name,
            error: `Email already exists in database`,
            type: 'database_duplicate',
            existingMember: {
              id: existingMember.id,
              name: existingMember.name,
              createdAt: existingMember.createdAt
            }
          });
          continue;
        }

        // Create new member
        const newMember = await prisma.member.create({
          data: {
            name: memberData.name,
            email: memberData.email,
            phone: memberData.phone,
            pin: memberData.pin,
            pinHash: memberData.pinHash,
            isActive: true,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            pin: true,
            createdAt: true,
          },
        });

        successfulImports.push({
          row: memberData.rowNumber,
          member: newMember,
        });

        // Send PIN email to new member
        try {
          const emailService = require('../services/emailService');
          await emailService.sendPin(newMember);
        } catch (emailError) {
          console.error(`Failed to send PIN email to ${newMember.email}:`, emailError);
          emailFailures.push({
            row: memberData.rowNumber,
            email: memberData.email,
            name: memberData.name,
            error: 'Member created successfully but PIN email failed to send',
            type: 'email_failure',
            details: emailError.message
          });
        }

      } catch (error) {
        console.error(`Error creating member (row ${memberData.rowNumber}):`, error);
        
        importErrors.push({
          row: memberData.rowNumber,
          email: memberData.email,
          name: memberData.name || 'Unknown',
          error: error.message,
          type: 'creation_error'
        });
      }
    }

    // Combine all types of errors
    const allErrors = [
      ...parseResult.errors.map(err => ({...err, type: 'validation_error'})),
      ...duplicateErrors,
      ...fileDuplicates,
      ...importErrors
    ];

    // Categorize errors for detailed reporting
    const errorSummary = {
      validationErrors: parseResult.errors.length,
      invalidEmails: parseResult.errors.filter(err => err.error.includes('Invalid email')).length,
      duplicateInFile: fileDuplicates.length,
      duplicateInDatabase: duplicateErrors.length,
      creationErrors: importErrors.length,
      emailFailures: emailFailures.length
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
        importedMembers: successfulImports.map(item => item.member),
        errors: {
          all: allErrors.slice(0, 50), // Show more errors for detailed feedback
          duplicateInFile: fileDuplicates,
          duplicateInDatabase: duplicateErrors,
          invalidEmails: parseResult.errors.filter(err => err.error.includes('Invalid email')),
          validationErrors: parseResult.errors.filter(err => !err.error.includes('Invalid email')),
          creationErrors: importErrors
        },
        warnings: {
          emailFailures: emailFailures
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
      if (emailFailures.length > 0) {
        response.message += ` ${emailFailures.length} PIN emails failed to send.`;
      }
      return res.status(207).json(response); // 207 Multi-Status
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process uploaded file',
      details: error.message,
    });
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
        ['name', 'email', 'phone'], // Headers
        ['John Doe', 'john@example.com', '+1234567890'], // Sample row 1
        ['Jane Smith', 'jane@example.com', '+1987654321'], // Sample row 2
        ['Bob Johnson', 'bob@example.com', ''], // Sample row 3 (no phone)
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