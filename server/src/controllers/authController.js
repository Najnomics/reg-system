const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken, verifyToken } = require('../middleware/auth');

/**
 * Universal login controller for admin and reg-rep
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check both admin and reg-rep tables
    const [admin, regRep] = await Promise.all([
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

    const user = admin || regRep;
    const userType = admin ? 'admin' : 'reg-rep';

    if (!user) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

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

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: { ...userData, userType },
      userType,
      // Keep legacy format for backwards compatibility
      ...(userType === 'admin' ? { admin: userData } : { regRep: userData })
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
      ...(req.user.userType === 'admin' ? { admin: req.user } : { regRep: req.user })
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
      ...(req.user.userType === 'admin' ? { admin: req.user } : { regRep: req.user })
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

module.exports = {
  login,
  logout,
  verify,
  refresh,
  changePassword,
};