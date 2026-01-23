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
      } else if (decoded.userType === 'pastoral') {
        const pastoralEmail = process.env.PASTORAL_EMAIL?.toLowerCase();
        const pastoralName = process.env.PASTORAL_NAME || 'Pastoral Team';

        if (pastoralEmail && decoded.email?.toLowerCase() === pastoralEmail) {
          user = {
            id: decoded.userId || 'pastoral',
            email: pastoralEmail,
            name: pastoralName,
            userType: 'pastoral',
          };
        }
      } else if (decoded.userType === 'chariot-leader') {
        // Verify member exists and is a leader of an active chariot
        try {
          const member = await prisma.member.findUnique({
            where: { 
              id: decoded.userId,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });

          if (member) {
            // Check if member is a leader of any active chariot
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

            if (chariot) {
              user = {
                id: member.id,
                email: member.email,
                name: member.name,
                userType: 'chariot-leader',
                chariotId: chariot.id,
                chariotName: chariot.name,
              };
            }
          }
        } catch (error) {
          console.error('Chariot leader verification error:', error);
          // Don't throw, just leave user as null
        }
      } else if (decoded.userType === 'chariot-assistant') {
        // Verify member exists and is an assistant of an active chariot
        try {
          const member = await prisma.member.findUnique({
            where: { 
              id: decoded.userId,
              isActive: true,
            },
            select: {
              id: true,
              email: true,
              name: true,
            },
          });

          if (member) {
            // Check if member is an assistant of any active chariot
            const chariotAssistants = await prisma.chariotAssistant.findMany({
              where: {
                memberId: member.id,
                chariot: {
                  isActive: true,
                },
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

            if (chariotAssistants.length > 0) {
              const chariotIds = chariotAssistants.map(ca => ca.chariot.id);
              const chariotNames = chariotAssistants.map(ca => ca.chariot.name);

              user = {
                id: member.id,
                email: member.email,
                name: member.name,
                userType: 'chariot-assistant',
                chariotIds,
                chariotNames,
              };
            }
          }
        } catch (error) {
          console.error('Chariot assistant verification error:', error);
          // Don't throw, just leave user as null
        }
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
 * Generate JWT token for admin, reg-rep, pastoral, chariot-leader, or chariot-assistant
 */
const generateToken = (user, userType) => {
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    userType: userType, // 'admin', 'reg-rep', 'pastoral', 'chariot-leader', or 'chariot-assistant'
  };

  let audience = 'church-user';
  if (userType === 'admin') {
    audience = 'church-admin';
  } else if (userType === 'reg-rep') {
    audience = 'church-reg-rep';
  } else if (userType === 'pastoral') {
    audience = 'church-pastoral';
  } else if (userType === 'chariot-leader') {
    audience = 'church-chariot-leader';
  } else if (userType === 'chariot-assistant') {
    audience = 'church-chariot-assistant';
  }

  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'church-attendance-system',
    audience,
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

/**
 * JWT Authentication middleware for chariot leader routes
 */
const authenticateChariotLeader = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.userType !== 'chariot-leader') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Chariot leader access required',
        });
      }

      // Verify member exists and is a leader of an active chariot
      const member = await prisma.member.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        include: {
          chariotLeader: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!member || member.chariotLeader.length === 0) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You are not assigned as a chariot leader',
        });
      }

      req.user = {
        id: member.id,
        email: member.email,
        name: member.name,
        userType: 'chariot-leader',
        chariotId: member.chariotLeader[0].id,
        chariotName: member.chariotLeader[0].name,
      };
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
    console.error('Chariot leader authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

/**
 * JWT Authentication middleware for chariot assistant routes
 */
const authenticateChariotAssistant = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.userType !== 'chariot-assistant') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Chariot assistant access required',
        });
      }

      // Verify member exists and is an assistant of an active chariot
      const member = await prisma.member.findUnique({
        where: { 
          id: decoded.userId,
          isActive: true,
        },
        include: {
          chariotAssistants: {
            where: {
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
          },
        },
      });

      if (!member || member.chariotAssistants.length === 0) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'You are not assigned as a chariot assistant',
        });
      }

      // Get all chariot IDs the assistant belongs to
      const chariotIds = member.chariotAssistants.map(ca => ca.chariot.id);
      const chariotNames = member.chariotAssistants.map(ca => ca.chariot.name);

      req.user = {
        id: member.id,
        email: member.email,
        name: member.name,
        userType: 'chariot-assistant',
        chariotIds,
        chariotNames,
      };
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
    console.error('Chariot assistant authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

/**
 * JWT Authentication middleware for routes accessible by chariot leader or assistant
 */
const authenticateChariotUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    const token = authHeader.substring(7);
    
    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Access token is required',
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.userType === 'chariot-leader') {
        // Use leader authentication logic
        const member = await prisma.member.findUnique({
          where: { 
            id: decoded.userId,
            isActive: true,
          },
          include: {
            chariotLeader: {
              where: { isActive: true },
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        if (!member || member.chariotLeader.length === 0) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'You are not assigned as a chariot leader',
          });
        }

        req.user = {
          id: member.id,
          email: member.email,
          name: member.name,
          userType: 'chariot-leader',
          chariotId: member.chariotLeader[0].id,
          chariotName: member.chariotLeader[0].name,
        };
      } else if (decoded.userType === 'chariot-assistant') {
        // Use assistant authentication logic
        const member = await prisma.member.findUnique({
          where: { 
            id: decoded.userId,
            isActive: true,
          },
          include: {
            chariotAssistants: {
              where: {
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
            },
          },
        });

        if (!member || member.chariotAssistants.length === 0) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'You are not assigned as a chariot assistant',
          });
        }

        const chariotIds = member.chariotAssistants.map(ca => ca.chariot.id);
        const chariotNames = member.chariotAssistants.map(ca => ca.chariot.name);

        req.user = {
          id: member.id,
          email: member.email,
          name: member.name,
          userType: 'chariot-assistant',
          chariotIds,
          chariotNames,
        };
      } else {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Chariot leader or assistant access required',
        });
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
    console.error('Chariot user authentication error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Authentication failed',
    });
  }
};

module.exports = {
  authenticateAdmin,
  authenticateRegRep,
  authenticateUser,
  authenticateChariotLeader,
  authenticateChariotAssistant,
  authenticateChariotUser,
  optionalAuth,
  generateToken,
  verifyToken,
};
