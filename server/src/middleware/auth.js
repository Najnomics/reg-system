const jwt = require('jsonwebtoken');
const prisma = require('../config/database');

/**
 * JWT Authentication middleware for admin routes (admin only)
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if the admin still exists and is active
      const admin = await prisma.admin.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });

      if (!admin || decoded.userType !== 'admin') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Admin access required',
        });
      }

      // Attach admin info to request object
      req.user = { ...admin, userType: 'admin' };
      req.admin = admin; // Keep for backwards compatibility
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Access token has expired',
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Access token is invalid',
        });
      }

      throw jwtError;
    }

  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

/**
 * JWT Authentication middleware for reg-rep routes (reg-rep only)
 */
const authenticateRegRep = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if the reg-rep still exists and is active
      const regRep = await prisma.regRep.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdBy: true,
        },
      });

      if (!regRep || decoded.userType !== 'reg-rep') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Reg-rep access required',
        });
      }

      // Attach reg-rep info to request object
      req.user = { ...regRep, userType: 'reg-rep' };
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Access token has expired',
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Access token is invalid',
        });
      }

      throw jwtError;
    }

  } catch (error) {
    console.error('Reg-rep authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

/**
 * JWT Authentication middleware for routes accessible by both admin and reg-rep
 */
const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      let user = null;
      
      if (decoded.userType === 'admin') {
        // Check if the admin still exists and is active
        user = await prisma.admin.findUnique({
          where: { 
            id: decoded.userId,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
          },
        });
        if (user) user.userType = 'admin';
      } else if (decoded.userType === 'reg-rep') {
        // Check if the reg-rep still exists and is active
        user = await prisma.regRep.findUnique({
          where: { 
            id: decoded.userId,
            isActive: true,
          },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdBy: true,
          },
        });
        if (user) user.userType = 'reg-rep';
      }

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
      }

      // Attach user info to request object
      req.user = user;
      if (user.userType === 'admin') {
        req.admin = user; // Keep for backwards compatibility
      }
      next();

    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Token expired',
          message: 'Access token has expired',
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          error: 'Invalid token',
          message: 'Access token is invalid',
        });
      }

      throw jwtError;
    }

  } catch (error) {
    console.error('User authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication middleware (for routes that can work with or without auth)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.admin = null;
      return next();
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      req.admin = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const admin = await prisma.admin.findUnique({
        where: { 
          id: decoded.adminId,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
        },
      });

      req.admin = admin || null;
      
    } catch (jwtError) {
      // For optional auth, we don't throw errors for invalid tokens
      req.admin = null;
    }

    next();

  } catch (error) {
    console.error('Optional authentication error:', error);
    req.admin = null;
    next();
  }
};

/**
 * Generate JWT token for admin or reg-rep
 */
const generateToken = (user, userType) => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    userType: userType, // 'admin' or 'reg-rep'
  };

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'church-attendance-system',
    audience: userType === 'admin' ? 'church-admin' : 'church-reg-rep',
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
};

/**
 * Verify JWT token without middleware
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw error;
  }
};

module.exports = {
  authenticateAdmin,
  authenticateRegRep,
  authenticateUser,
  optionalAuth,
  generateToken,
  verifyToken,
};