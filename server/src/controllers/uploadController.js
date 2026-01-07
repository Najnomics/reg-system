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
        details: parseResult.errors.slice(0, 10), // Show first 10 errors
        totalErrors: parseResult.errors.length,
      });
    }

    // Process valid members
    const successfulImports = [];
    const importErrors = [];
    
    for (const memberData of parseResult.data) {
      try {
        // Check if email already exists
        const existingMember = await prisma.member.findUnique({
          where: { email: memberData.email },
          select: { id: true, name: true },
        });

        if (existingMember) {
          importErrors.push({
            row: memberData.rowNumber,
            email: memberData.email,
            error: `Member with email ${memberData.email} already exists`,
            existingMember: existingMember.name,
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
          // Continue with import even if email fails
        }

      } catch (error) {
        console.error(`Error creating member (row ${memberData.rowNumber}):`, error);
        
        importErrors.push({
          row: memberData.rowNumber,
          email: memberData.email,
          error: error.message,
        });
      }
    }

    // Combine parsing errors and import errors
    const allErrors = [...parseResult.errors, ...importErrors];

    // Prepare response
    const response = {
      success: true,
      message: `Import completed. ${successfulImports.length} members imported successfully.`,
      summary: {
        totalRows: parseResult.totalRows,
        parsed: parseResult.validRows,
        imported: successfulImports.length,
        failed: allErrors.length,
        parseErrors: parseResult.errors.length,
        importErrors: importErrors.length,
      },
      data: {
        importedMembers: successfulImports.map(item => item.member),
        errors: allErrors.slice(0, 20), // Limit errors in response
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
    const templateBuffer = generateTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="members_template.xlsx"');
    res.setHeader('Content-Length', templateBuffer.length);
    
    res.send(templateBuffer);

  } catch (error) {
    console.error('Template generation error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate template file',
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