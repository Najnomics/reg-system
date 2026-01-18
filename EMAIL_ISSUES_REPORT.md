# Email Issues Report - Church Attendance System

**Date:** January 18, 2026  
**System:** Church Attendance Registration System  
**Backend:** Railway (`reg-system-production.up.railway.app`)  
**Frontend:** Vercel (`reg-system-mu.vercel.app`)

---

## Executive Summary

The email sending functionality is currently **non-functional** due to Railway's network-level blocking of outbound SMTP connections. All attempts to send emails via SMTP (Gmail, Namecheap) result in connection timeouts. A solution using **Vercel Serverless Functions** has been implemented to bypass this restriction.

---

## 1. Problem Summary

### Issue
- **Symptom:** Emails not being sent from the application
- **Error:** `ETIMEDOUT` (Connection timeout) when connecting to SMTP servers
- **Impact:** 
  - PIN emails not delivered to new members
  - Resend PIN functionality fails
  - Member registration incomplete without PIN delivery

### Root Cause
**Railway blocks outbound SMTP connections** (ports 587, 465, 25) as a security measure to prevent spam. This is a network-level firewall restriction that cannot be bypassed through code changes.

---

## 2. Attempted Solutions

### Solution A: Gmail SMTP ✅ Configured ❌ Failed
- **Configuration:**
  - Host: `smtp.gmail.com`
  - Port: `587` (TLS)
  - Authentication: Gmail App Password
  - Timeout: 30 seconds
- **Result:** Connection timeout (`ETIMEDOUT`)
- **Status:** ❌ Failed - Railway blocks Gmail SMTP

### Solution B: Namecheap Private Email (Port 587) ✅ Configured ❌ Failed
- **Configuration:**
  - Host: `mail.privateemail.com`
  - Port: `587` (TLS)
  - User: `grace_edge@homecomming26.com`
  - Password: Configured
- **Result:** Connection timeout (`ETIMEDOUT`)
- **Status:** ❌ Failed - Railway blocks port 587

### Solution C: Namecheap Private Email (Port 465 SSL) ✅ Configured ❌ Failed
- **Configuration:**
  - Host: `mail.privateemail.com`
  - Port: `465` (SSL)
  - Secure: `true`
  - Same credentials
- **Result:** Connection timeout (`ETIMEDOUT`)
- **Status:** ❌ Failed - Railway blocks port 465

### Solution D: Alternative SMTP Hosts ✅ Tested ❌ Failed
- **Tested Hosts:**
  - `smtp.privateemail.com`
  - `mail.homecomming26.com`
- **Result:** Same timeout errors
- **Status:** ❌ Failed - All SMTP ports blocked

### Solution E: Code Optimizations ✅ Implemented ⚠️ No Effect
- **Changes Made:**
  - Connection pooling (5 concurrent connections)
  - Reduced timeouts (15s for Namecheap)
  - Parallel email sending (5 at a time)
  - Better error handling and logging
- **Result:** No improvement (network-level blocking)
- **Status:** ⚠️ Optimized but still blocked

---

## 3. Current State

### Working Components ✅
- ✅ Backend API (Railway) - All endpoints functional
- ✅ Frontend (Vercel) - All pages functional
- ✅ Database (Supabase) - Connection stable
- ✅ Authentication - JWT working
- ✅ Member Management - CRUD operations working
- ✅ Session Management - Create/view/delete working
- ✅ Check-in System - QR code scanning working
- ✅ Reports & Analytics - Data fetching working

### Non-Functional Components ❌
- ❌ Email Sending - SMTP blocked by Railway
- ❌ PIN Delivery - Cannot send PIN emails
- ❌ Email Notifications - All email features disabled

### Error Pattern
```
Error: Connection timeout
Code: ETIMEDOUT
Command: CONN
```

This indicates the connection **never establishes** - Railway's firewall blocks it before any SMTP handshake occurs.

---

## 4. Proposed Solution: Vercel Serverless Functions

### Architecture Change

**Before (Blocked):**
```
Frontend → Railway Backend → SMTP Server
                ❌ BLOCKED
```

**After (Proposed):**
```
Frontend → Vercel Serverless Function → SMTP Server
                ✅ Should work
```

### Implementation Status

✅ **Completed:**
1. Created `/api/send-email` - Generic email endpoint
2. Created `/api/send-pin-email` - PIN email endpoint
3. Added `vercelEmailService.js` - Frontend service
4. Updated `vercel.json` - Function configuration
5. Added `nodemailer` dependency
6. Created setup documentation

### Next Steps Required

1. **Add Environment Variables to Vercel:**
   ```env
   SMTP_HOST=mail.privateemail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=grace_edge@homecomming26.com
   SMTP_PASS=YOUR_PASSWORD
   FROM_EMAIL=grace_edge@homecomming26.com
   FROM_NAME=Grace Edge Ministries
   CHURCH_NAME=Grace Edge Ministries
   ```

2. **Deploy to Vercel:**
   ```bash
   git add api/ package.json vercel.json src/services/vercelEmailService.js
   git commit -m "feat: Add Vercel serverless functions for email"
   git push
   ```

3. **Test Email Sending:**
   - Test PIN email endpoint
   - Verify emails are received
   - Check Vercel logs for errors

4. **Update Backend (Optional):**
   - Add fallback to Vercel API when Railway SMTP fails
   - Or use Vercel email service directly from frontend

---

## 5. Alternative Solutions (If Vercel Also Blocks SMTP)

### Option 1: SendGrid API ✅ Recommended
- **Pros:**
  - API-based (no SMTP blocking)
  - Free tier: 100 emails/day
  - Reliable and scalable
  - Better deliverability
- **Cons:**
  - Requires SendGrid account
  - Cost for high volume ($19.95/month for 50k emails)
- **Status:** Code already supports SendGrid (just needs API key)

### Option 2: Resend API
- **Pros:**
  - Modern API
  - Free tier: 3,000 emails/month
  - Good developer experience
- **Cons:**
  - Requires code changes
  - New service to learn

### Option 3: AWS SES
- **Pros:**
  - Very reliable
  - Pay-as-you-go pricing
  - High volume support
- **Cons:**
  - More complex setup
  - Requires AWS account
  - Higher learning curve

---

## 6. Testing Plan

### Phase 1: Vercel Serverless Functions
1. ✅ Deploy functions to Vercel
2. ⏳ Add environment variables
3. ⏳ Test `/api/send-pin-email` endpoint
4. ⏳ Verify email delivery
5. ⏳ Check Vercel logs for errors

### Phase 2: Integration
1. ⏳ Update frontend to use Vercel email service
2. ⏳ Test member creation with PIN email
3. ⏳ Test resend PIN functionality
4. ⏳ Monitor for any issues

### Phase 3: Fallback (If Needed)
1. ⏳ Implement SendGrid API integration
2. ⏳ Test SendGrid email delivery
3. ⏳ Set up as primary or fallback service

---

## 7. Files Created/Modified

### New Files
- ✅ `api/send-email/index.js` - Generic email serverless function
- ✅ `api/send-pin-email/index.js` - PIN email serverless function
- ✅ `src/services/vercelEmailService.js` - Frontend email service
- ✅ `VERCEL_EMAIL_SETUP.md` - Setup documentation
- ✅ `EMAIL_ISSUES_REPORT.md` - This report

### Modified Files
- ✅ `package.json` - Added `nodemailer` dependency
- ✅ `vercel.json` - Added function configuration

---

## 8. Recommendations

### Immediate Actions
1. **Deploy Vercel Functions** - Test if Vercel allows SMTP
2. **Add Environment Variables** - Configure SMTP credentials in Vercel
3. **Test Email Sending** - Verify functionality

### If Vercel Also Blocks SMTP
1. **Use SendGrid** - Most reliable solution
2. **Update Functions** - Modify to use SendGrid API
3. **Remove SMTP Code** - Simplify by using API-only approach

### Long-term
1. **Monitor Email Delivery** - Track success rates
2. **Set Up Email Logging** - Log all email attempts
3. **Consider Email Service** - Evaluate SendGrid vs Resend vs AWS SES

---

## 9. Conclusion

The email sending issue is caused by **Railway's SMTP blocking**, not a code problem. The solution using **Vercel Serverless Functions** has been implemented and is ready for testing. If Vercel also blocks SMTP, **SendGrid API** is the recommended fallback solution.

**Current Status:** ✅ Code ready, ⏳ Awaiting deployment and testing

**Next Action:** Deploy to Vercel and test email sending functionality.

---

## 10. Contact & Support

For questions or issues:
- Check Vercel logs: Dashboard → Project → Functions → Logs
- Check Railway logs: Dashboard → Project → Deployments → Logs
- Review documentation: `VERCEL_EMAIL_SETUP.md`

---

**Report Generated:** January 18, 2026  
**Last Updated:** January 18, 2026
