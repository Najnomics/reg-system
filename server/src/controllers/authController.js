const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateToken, verifyToken } = require('../middleware/auth');

/**
 * Admin login controller
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin by email
    const admin = await prisma.admin.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        isActive: true,
      },
    });

    if (!admin) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        error: 'Account disabled',
        message: 'Your account has been disabled',
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid email or password',
      });
    }

    // Generate JWT token
    const token = generateToken(admin);

    // Return success response (exclude password)
    const { password: _, ...adminData } = admin;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      admin: adminData,
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
 * Admin logout controller
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
    // The authenticateAdmin middleware already verified the token
    // and attached the admin data to req.admin
    
    res.status(200).json({
      valid: true,
      admin: req.admin,
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
    // The authenticateAdmin middleware already verified the current token
    // Generate a new token with extended expiry
    
    const newToken = generateToken(req.admin);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newToken,
      admin: req.admin,
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
    const adminId = req.admin.id;

    // Get current admin with password
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!admin) {
      return res.status(404).json({
        error: 'Admin not found',
        message: 'Admin account not found',
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Current password is incorrect',
      });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

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