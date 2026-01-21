# Security Guide

Security best practices and guidelines for the Church Attendance Management System.

## Table of Contents

- [Security Overview](#security-overview)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [Database Security](#database-security)
- [API Security](#api-security)
- [Frontend Security](#frontend-security)
- [Best Practices](#best-practices)
- [Incident Response](#incident-response)

## Security Overview

The Church Attendance Management System handles sensitive member data and requires robust security measures. This guide outlines security best practices and implementation details.

### Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Users have minimum necessary access
3. **Data Encryption**: Sensitive data encrypted at rest and in transit
4. **Input Validation**: All inputs validated and sanitized
5. **Secure by Default**: Secure configurations by default

## Authentication & Authorization

### JWT Authentication

**Implementation:**
- JWT tokens expire after 7 days (configurable)
- Tokens stored in memory (not localStorage)
- Tokens include user ID, email, and user type
- Secret key must be strong and kept secure

**Best Practices:**
```javascript
// Use strong secret (min 32 characters, random)
JWT_SECRET=generate-random-secret-key-min-32-chars

// Set appropriate expiration
JWT_EXPIRES_IN=7d  // Not too long, not too short

// Verify token on every request
authenticateUser middleware validates token
```

### Password Security

**Requirements:**
- Minimum 8 characters (enforced in frontend)
- Stored as bcrypt hash (never plain text)
- Salt rounds: 10 (configurable)

**Implementation:**
```javascript
// Hashing passwords
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verifying passwords
const isValid = await bcrypt.compare(password, hashedPassword);
```

### Role-Based Access Control

**Roles:**
1. **Admin**: Full system access
2. **RegRep**: Read-only access to members, sessions, attendance
3. **Public**: Check-in only (no authentication)

**Middleware:**
```javascript
// Admin only
authenticateAdmin

// Admin or RegRep
authenticateUser

// Public (no auth)
optionalAuth or no middleware
```

## Data Protection

### PIN Security

**PIN Generation:**
- 5-digit numeric PINs
- Cryptographically random generation
- Unique constraint enforced
- Stored in database (not hashed, but can be hashed optionally)

**PIN Distribution:**
- Sent via email only
- Never displayed in logs
- Can be resent by admin only

### Member Data

**Sensitive Fields:**
- Names (unique identifier)
- Email addresses
- Phone numbers
- Dates of birth
- Addresses

**Protection:**
- Access restricted by role
- No public exposure
- Encrypted in transit (HTTPS)
- Backed up securely

### Session Data

**Sensitive Fields:**
- Secret questions and answers
- QR codes
- Attendance records

**Protection:**
- Secret answers hashed in database
- QR codes contain session IDs only
- Attendance records linked to members

## Database Security

### Connection Security

**Requirements:**
- Use SSL/TLS for database connections
- Strong database passwords
- Limited database user permissions
- Connection string in environment variables (never committed)

**Example:**
```env
DATABASE_URL="postgresql://user:password@host:5432/db?sslmode=require"
```

### Row Level Security (RLS)

**Status:** Enabled on all tables

**Implementation:**
- RLS policies set to `DENY ALL` by default
- Application layer handles all access control
- Prisma bypasses RLS (expected behavior)
- RLS serves as defense-in-depth

### SQL Injection Prevention

**Protection:**
- Prisma ORM uses parameterized queries
- Never use raw SQL with user input
- Input validation before database operations

**Example:**
```javascript
// Safe - Prisma handles parameterization
const member = await prisma.member.findUnique({
  where: { id: req.params.id }
});

// Never do this:
// const query = `SELECT * FROM members WHERE id = '${req.params.id}'`;
```

### Data Validation

**Backend Validation:**
- Joi schemas for all inputs
- Type checking
- Length limits
- Format validation (email, UUID, etc.)

**Example:**
```javascript
const schema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
});
```

## API Security

### CORS Configuration

**Settings:**
```javascript
// Only allow specific origins
cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
});
```

**Production:**
- Set `CORS_ORIGIN` to your frontend domain only
- Never use `*` in production

### Rate Limiting

**Implementation:**
- Express rate limiter middleware
- Different limits for different endpoints
- Check-in endpoints have stricter limits

**Example:**
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
});
```

### Input Sanitization

**Requirements:**
- Validate all inputs
- Sanitize strings (trim, escape)
- Type checking
- Length limits

**Example:**
```javascript
// Sanitize input
const sanitizedInput = input.trim().substring(0, 255);

// Validate UUID
Joi.string().uuid().required()
```

### Error Handling

**Security:**
- Don't expose internal errors to clients
- Generic error messages for authentication failures
- Log errors server-side only
- No stack traces in production

**Example:**
```javascript
try {
  // Operation
} catch (error) {
  console.error('Internal error:', error); // Server-side only
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An error occurred', // Generic message
  });
}
```

## Frontend Security

### Environment Variables

**Security:**
- Only expose non-sensitive variables
- Prefix with `VITE_` for Vite
- Never expose secrets or API keys
- Use different values for dev/prod

### API Calls

**Security:**
- Always use HTTPS in production
- Include authentication tokens in headers
- Handle errors gracefully
- Don't expose sensitive data in URLs

### XSS Prevention

**Protection:**
- React escapes content by default
- Never use `dangerouslySetInnerHTML`
- Sanitize user-generated content
- Use Content Security Policy (CSP)

### CSRF Protection

**Implementation:**
- SameSite cookies
- CSRF tokens for state-changing operations
- Verify origin headers

## Best Practices

### Development

1. **Never commit secrets**
   - Use `.env` files (in `.gitignore`)
   - Use environment variables
   - Rotate secrets regularly

2. **Keep dependencies updated**
   - Regular `npm audit`
   - Update packages with security patches
   - Review dependency changes

3. **Code reviews**
   - Review security implications
   - Check for common vulnerabilities
   - Test authentication flows

4. **Secure defaults**
   - Strong password requirements
   - Secure session settings
   - HTTPS only in production

### Production

1. **HTTPS Only**
   - SSL/TLS certificates
   - Redirect HTTP to HTTPS
   - HSTS headers

2. **Security Headers**
   ```javascript
   helmet({
     contentSecurityPolicy: {
       directives: {
         defaultSrc: ["'self'"],
         scriptSrc: ["'self'"],
         styleSrc: ["'self'", "'unsafe-inline'"],
       },
     },
   });
   ```

3. **Regular Audits**
   - Security scans
   - Dependency audits
   - Penetration testing

4. **Monitoring**
   - Log security events
   - Monitor failed login attempts
   - Alert on suspicious activity

### Password Policy

**Requirements:**
- Minimum 8 characters
- Mix of letters and numbers (recommended)
- No common passwords
- Regular password changes (optional)

**Implementation:**
- Enforced in frontend validation
- Backend validates before hashing
- Consider password strength meter

### PIN Policy

**Requirements:**
- 5-digit numeric PINs
- Unique per member
- Can be regenerated by admin
- Sent via email only

**Security:**
- PINs are not hashed (by design, for quick lookup)
- Consider hashing for enhanced security
- Rate limit PIN entry attempts

## Incident Response

### Security Incident Procedure

1. **Identify**
   - Detect security breach
   - Assess scope and impact
   - Document evidence

2. **Contain**
   - Isolate affected systems
   - Revoke compromised credentials
   - Disable affected accounts

3. **Eradicate**
   - Remove malicious code
   - Patch vulnerabilities
   - Update security measures

4. **Recover**
   - Restore from backups
   - Verify system integrity
   - Resume normal operations

5. **Post-Incident**
   - Document incident
   - Review security measures
   - Update procedures
   - Notify affected users (if required)

### Common Vulnerabilities

**OWASP Top 10:**
1. Injection (SQL, NoSQL, etc.)
2. Broken Authentication
3. Sensitive Data Exposure
4. XML External Entities (XXE)
5. Broken Access Control
6. Security Misconfiguration
7. XSS (Cross-Site Scripting)
8. Insecure Deserialization
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring

**Mitigation:**
- Input validation
- Parameterized queries
- Strong authentication
- Proper authorization
- Secure configurations
- Regular updates
- Comprehensive logging

### Reporting Security Issues

**Process:**
1. Report to security team/admin
2. Include details:
   - Description of issue
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

3. **Do NOT:**
   - Publicly disclose before fix
   - Exploit the vulnerability
   - Access unauthorized data

## Compliance

### Data Privacy

- **GDPR**: If serving EU users
- **CCPA**: If serving California users
- **Local Regulations**: Check local data protection laws

**Requirements:**
- User consent for data collection
- Right to access data
- Right to deletion
- Data breach notification

### Data Retention

- **Members**: Retain while active
- **Sessions**: Retain for reporting
- **Attendance**: Retain for historical records
- **Logs**: Retain per policy (typically 30-90 days)

## Security Checklist

### Pre-Deployment

- [ ] All secrets in environment variables
- [ ] HTTPS configured
- [ ] Database SSL enabled
- [ ] Strong JWT secret
- [ ] Rate limiting enabled
- [ ] CORS configured correctly
- [ ] Security headers set
- [ ] Error handling secure
- [ ] Input validation complete
- [ ] Dependencies updated
- [ ] Security audit passed

### Ongoing

- [ ] Regular dependency updates
- [ ] Security monitoring active
- [ ] Logs reviewed regularly
- [ ] Backups tested
- [ ] Access reviews conducted
- [ ] Security training updated

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Prisma Security](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
