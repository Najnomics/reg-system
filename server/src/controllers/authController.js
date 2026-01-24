const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken, verifyToken } = require('../middleware/auth');

/**
 * Universal login controller for admin, reg-rep, chariot leaders, and chariot assistants
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check admin and reg-rep tables first
    let admin, regRep;
    try {
      [admin, regRep] = await Promise.all([
        prisma.admin.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            isActive: true,
          },
        }),
        prisma.regRep.findUnique({
          where: { email: email.toLowerCase() },
          select: {
            id: true,
            email: true,
            password: true,
            name: true,
            isActive: true,
            createdBy: true,
            canAssignChapels: true,
          },
        })
      ]);
    } catch (dbError) {
      console.error('Database query error in login:', dbError);
      // If canAssignChapels field doesn't exist, try without it
      if (dbError.message && dbError.message.includes('canAssignChapels')) {
        console.log('Retrying without canAssignChapels field...');
        [admin, regRep] = await Promise.all([
          prisma.admin.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              isActive: true,
            },
          }),
          prisma.regRep.findUnique({
            where: { email: email.toLowerCase() },
            select: {
              id: true,
              email: true,
              password: true,
              name: true,
              isActive: true,
              createdBy: true,
            },
          })
        ]);
        // Set canAssignChapels to false as default if not available
        if (regRep) {
          regRep.canAssignChapels = false;
        }
      } else {
        throw dbError;
      }
    }

    // If admin or reg-rep found, use existing logic
    if (admin || regRep) {
      const user = admin || regRep;
      const userType = admin ? 'admin' : 'reg-rep';

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          error: 'Account disabled',
          message: 'Your account has been disabled',
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token with user type
      const token = generateToken(user, userType);

      // Return success response (exclude password)
      const { password: _, ...userData } = user;

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { ...userData, userType },
        userType,
        // Keep legacy format for backwards compatibility
        ...(userType === 'admin' ? { admin: userData } : { regRep: userData })
      });
    }

    // Pastoral team login (read-only access)
    const pastoralEmail = process.env.PASTORAL_EMAIL?.toLowerCase();
    const pastoralPassword = process.env.PASTORAL_PASSWORD;
    const pastoralName = process.env.PASTORAL_NAME || 'Pastoral Team';

    if (pastoralEmail && email.toLowerCase() === pastoralEmail) {
      if (!pastoralPassword) {
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Pastoral credentials not configured. Please set PASTORAL_PASSWORD.',
        });
      }

      if (password !== pastoralPassword) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      const user = {
        id: 'pastoral',
        email: pastoralEmail,
        name: pastoralName,
        isActive: true,
      };

      const token = generateToken(user, 'pastoral');

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: { ...user, userType: 'pastoral' },
        userType: 'pastoral',
      });
    }

    // If not admin/reg-rep, check if it's a chariot leader or assistant
    // Use findFirst instead of findUnique since emails can now be duplicate
    // We'll check all members with this email and find one that is a leader/assistant
    const membersWithEmail = await prisma.member.findMany({
      where: { 
        email: email.toLowerCase(),
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (membersWithEmail.length === 0) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Try to find a member who is a leader or assistant
    // Check each member to see if they're a leader or assistant
    let member = null;
    let chariotAsLeader = null;
    let chariotAssistants = [];
    
    for (const m of membersWithEmail) {
      // Check if this member is a leader
      const leaderCheck = await prisma.chariot.findFirst({
        where: {
          leaderId: m.id,
          isActive: true,
        },
        select: { id: true, name: true },
      });

      // Check if this member is an assistant
      const assistantCheck = await prisma.chariotAssistant.findMany({
        where: {
          memberId: m.id,
          chariot: { isActive: true },
        },
        include: {
          chariot: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (leaderCheck || assistantCheck.length > 0) {
        member = m;
        chariotAsLeader = leaderCheck;
        chariotAssistants = assistantCheck;
        break;
      }
    }

    if (!member) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'No chariot leader or assistant found with this email',
      });
    }

    // Check if member is active
    if (!member.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled',
      });
    }

    // Get preset passwords from environment variables
    const leaderPassword = process.env.CHARIOT_LEADER_PASSWORD;
    const assistantPassword = process.env.CHARIOT_ASSISTANT_PASSWORD;

    if (!leaderPassword || !assistantPassword) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Chariot passwords not configured. Please set CHARIOT_LEADER_PASSWORD and CHARIOT_ASSISTANT_PASSWORD environment variables.',
      });
    }

    // Check if member is a chariot leader (we already found this above)

    if (chariotAsLeader) {
      // Verify password matches leader password
      if (password !== leaderPassword) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token
      const token = generateToken(
        { ...member, userType: 'chariot-leader' },
        'chariot-leader'
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          ...member,
          userType: 'chariot-leader',
          chariotId: chariotAsLeader.id,
          chariotName: chariotAsLeader.name,
        },
        userType: 'chariot-leader',
      });
    }

    // Check if member is a chariot assistant (we already found this above)

    if (chariotAssistants.length > 0) {
      // Verify password matches assistant password
      if (password !== assistantPassword) {
        return res.status(401).json({
          error: 'Authentication failed',
          message: 'Invalid email or password',
        });
      }

      // Generate JWT token (use first chariot for now, or could support multiple)
      const firstChariot = chariotAssistants[0].chariot;
      const token = generateToken(
        { ...member, userType: 'chariot-assistant' },
        'chariot-assistant'
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          ...member,
          userType: 'chariot-assistant',
          chariotId: firstChariot.id,
          chariotName: firstChariot.name,
          chariots: chariotAssistants.map(ca => ({
            id: ca.chariot.id,
            name: ca.chariot.name,
          })),
        },
        userType: 'chariot-assistant',
      });
    }

    // If member exists but is not assigned to any role, deny access
    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid email or password',
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed',
    });
  }
};

/**
 * Universal logout controller
 */
const logout = async (req, res) => {
  try {
    // In a stateless JWT system, logout is mainly handled client-side
    // Here we could implement token blacklisting if needed
    
    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Logout failed',
    });
  }
};

/**
 * Verify token controller
 */
const verify = async (req, res) => {
  try {
    // The authenticateUser middleware already verified the token
    // and attached the user data to req.user
    
    res.status(200).json({
      valid: true,
      user: req.user,
      userType: req.user.userType,
      // Keep legacy format for backwards compatibility
      ...(req.user.userType === 'admin'
        ? { admin: req.user }
        : req.user.userType === 'reg-rep'
        ? { regRep: req.user }
        : {})
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Token verification failed',
    });
  }
};

/**
 * Refresh token controller
 */
const refresh = async (req, res) => {
  try {
    // The authenticateUser middleware already verified the current token
    // Generate a new token with extended expiry
    
    const newToken = generateToken(req.user, req.user.userType);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      user: req.user,
      userType: req.user.userType,
      // Keep legacy format for backwards compatibility
      ...(req.user.userType === 'admin'
        ? { admin: req.user }
        : req.user.userType === 'reg-rep'
        ? { regRep: req.user }
        : {})
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Token refresh failed',
    });
  }
};

/**
 * Change password controller
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;
    const userType = req.user.userType;

    // Get current user with password based on user type
    const user = userType === 'admin' 
      ? await prisma.admin.findUnique({
          where: { id: userId },
          select: { id: true, password: true },
        })
      : await prisma.regRep.findUnique({
          where: { id: userId },
          select: { id: true, password: true },
        });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `${userType} account not found`,
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password in the appropriate table
    if (userType === 'admin') {
      await prisma.admin.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });
    } else {
      await prisma.regRep.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Password change failed',
    });
  }
};

/**
 * Login controller for chariot leaders and assistants
 * Uses preset passwords from environment variables
 */
const loginChariotUser = async (req, res) => {
  try {
    const { email, password, userType } = req.body; // userType: 'chariot-leader' or 'chariot-assistant'

    if (!userType || !['chariot-leader', 'chariot-assistant'].includes(userType)) {
      return res.status(400).json({
        error: 'Invalid user type',
        message: 'userType must be either "chariot-leader" or "chariot-assistant"',
      });
    }

    // Get preset passwords from environment variables (required)
    const leaderPassword = process.env.CHARIOT_LEADER_PASSWORD;
    const assistantPassword = process.env.CHARIOT_ASSISTANT_PASSWORD;

    if (!leaderPassword || !assistantPassword) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Chariot passwords not configured. Please set CHARIOT_LEADER_PASSWORD and CHARIOT_ASSISTANT_PASSWORD environment variables.',
      });
    }

    const expectedPassword = userType === 'chariot-leader' ? leaderPassword : assistantPassword;

    // Verify password matches preset password
    if (password !== expectedPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid password',
      });
    }

    // Find member by email
    const member = await prisma.member.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
      },
    });

    if (!member) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Check if member is active
    if (!member.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled',
      });
    }

    // Verify member is assigned to the appropriate role
    if (userType === 'chariot-leader') {
      const chariot = await prisma.chariot.findFirst({
        where: {
          leaderId: member.id,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!chariot) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'You are not assigned as a chariot leader',
        });
      }

      // Generate JWT token
      const token = generateToken(
        { ...member, userType: 'chariot-leader' },
        'chariot-leader'
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          ...member,
          userType: 'chariot-leader',
          chariotId: chariot.id,
          chariotName: chariot.name,
        },
        userType: 'chariot-leader',
      });
    } else {
      // userType === 'chariot-assistant'
      const chariotAssistants = await prisma.chariotAssistant.findMany({
        where: {
          memberId: member.id,
          chariot: { isActive: true },
        },
        include: {
          chariot: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (chariotAssistants.length === 0) {
        return res.status(401).json({
          error: 'Access denied',
          message: 'You are not assigned as a chariot assistant',
        });
      }

      const chariotIds = chariotAssistants.map(ca => ca.chariot.id);
      const chariotNames = chariotAssistants.map(ca => ca.chariot.name);

      // Generate JWT token
      const token = generateToken(
        { ...member, userType: 'chariot-assistant' },
        'chariot-assistant'
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          ...member,
          userType: 'chariot-assistant',
          chariotIds,
          chariotNames,
        },
        userType: 'chariot-assistant',
      });
    }

  } catch (error) {
    console.error('Chariot user login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Login failed',
    });
  }
};

module.exports = {
  login,
  loginChariotUser,
  logout,
  verify,
  refresh,
  changePassword,
};
