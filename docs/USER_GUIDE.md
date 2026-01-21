# User Guide

Complete user guide for the Church Attendance Management System.

## Table of Contents

- [Getting Started](#getting-started)
- [Admin Guide](#admin-guide)
- [RegRep Guide](#regrep-guide)
- [Member Check-in Guide](#member-check-in-guide)
- [Troubleshooting](#troubleshooting)

## Getting Started

### System Overview

The Church Attendance Management System helps churches track member attendance at sessions and events. The system has three main user types:

1. **Admin**: Full system access - manages members, sessions, and reg-reps
2. **RegRep**: Registration Representative - can view members, sessions, and attendance
3. **Members**: Use PIN-based check-in system (no account needed)

### Accessing the System

- **Admin Dashboard**: `/admin/login`
- **RegRep Dashboard**: `/admin/login` (same login page)
- **Member Check-in**: `/checkin/:sessionId` (public, no login required)

## Admin Guide

### Logging In

1. Navigate to `/admin/login`
2. Enter your admin email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### Dashboard

The dashboard provides an overview of:
- Total members
- Active members
- Total sessions
- Active sessions
- Total attendance records
- Recent activity

### Managing Members

#### Adding Individual Members

1. Navigate to **Members** page
2. Click **"Add Member"** button
3. Fill in the form:
   - **Name** (required, must be unique)
   - **Email** (optional, but must be unique if provided)
   - **Phone** (optional)
   - **Date of Birth** (optional)
   - **Gender** (optional)
   - **Address** (optional)
   - **Membership Type** (optional)
   - **Department** (optional)
   - **Position** (optional)
4. Click **"Create Member"**
5. The system will:
   - Generate a unique 5-digit PIN
   - Send PIN via email (if email provided)
   - Display the PIN on screen

#### Bulk Upload Members

1. Navigate to **Members** page
2. Click **"Bulk Upload"** button
3. Download the Excel template (optional but recommended)
4. Fill in the template with member data:
   - **Name** (required)
   - **Email** (optional)
   - **Phone** (optional)
   - Other fields as needed
5. Click **"Choose File"** and select your Excel/CSV file
6. Click **"Upload"**
7. Review the import summary:
   - Total rows processed
   - Successfully imported
   - Failed imports with error details
8. Fix any errors and re-upload if needed

**Supported File Formats:**
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- `.csv` (Comma-separated values)

#### Searching Members

1. Use the search bar at the top of the Members page
2. Search by:
   - Name
   - Email
   - Phone
   - PIN
3. Results update as you type

#### Editing Members

1. Navigate to **Members** page
2. Find the member you want to edit
3. Click **"Edit"** button
4. Modify the fields
5. Click **"Save Changes"**

**Note:** Member names must remain unique. If you change a name to one that already exists, you'll get an error.

#### Resending PIN

1. Navigate to **Members** page
2. Find the member
3. Click **"Resend PIN"** button
4. The PIN email will be sent to the member's email address

#### Marking Members Present

1. Navigate to **Sessions** page
2. Click on a session
3. Click **"Mark Present"** button
4. Search for and select the member
5. Click **"Mark Present"**

#### Deactivating/Activating Members

1. Navigate to **Members** page
2. Find the member
3. Click **"Edit"** button
4. Toggle **"Active"** status
5. Click **"Save Changes"**

### Managing Sessions

#### Creating a Session

1. Navigate to **Sessions** page
2. Click **"Create Session"** button
3. Fill in the form:
   - **Theme** (required): e.g., "Sunday Service", "Youth Meeting"
   - **Start Time** (required): When check-in opens
   - **End Time** (required): When check-in closes
   - **Location** (optional): Physical location
   - **Secret Question** (required): Verification question
   - **Secret Answer** (required): Correct answer
   - **Max Attendees** (optional): Maximum capacity
4. Click **"Create Session"**
5. The system will:
   - Generate a unique QR code
   - Create a check-in link
   - Display QR code for printing

#### Editing Sessions

1. Navigate to **Sessions** page
2. Find the session you want to edit
3. Click **"Edit"** button
4. Modify the fields
5. Click **"Save Changes"**

#### Viewing Session Attendance

1. Navigate to **Sessions** page
2. Click on a session
3. View the attendance list showing:
   - Member name
   - Check-in time
   - Member details

#### Activating/Deactivating Sessions

1. Navigate to **Sessions** page
2. Find the session
3. Click **"Edit"** button
4. Toggle **"Active"** status
5. Click **"Save Changes"**

**Note:** Only active sessions allow check-ins. Deactivate sessions after events to prevent late check-ins.

### Managing RegReps

#### Creating a RegRep

1. Navigate to **RegReps** page
2. Click **"Add RegRep"** button
3. Fill in:
   - **Name** (required)
   - **Email** (required, must be unique)
   - **Password** (required)
4. Click **"Create RegRep"**

#### Editing RegReps

1. Navigate to **RegReps** page
2. Find the reg-rep
3. Click **"Edit"** button
4. Modify fields
5. Click **"Save Changes"**

#### Deactivating RegReps

1. Navigate to **RegReps** page
2. Find the reg-rep
3. Click **"Edit"** button
4. Toggle **"Active"** status
5. Click **"Save Changes"**

### Reports

#### Generating Attendance Reports

1. Navigate to **Reports** page
2. Select filters:
   - **Session**: Filter by specific session
   - **Member**: Filter by specific member
   - **Date Range**: Filter by date
3. Select format:
   - **JSON**: For viewing online
   - **CSV**: For Excel/spreadsheet
   - **XLSX**: Excel format
   - **PDF**: For printing
4. Click **"Generate Report"**
5. Download or view the report

## RegRep Guide

### Logging In

1. Navigate to `/admin/login`
2. Enter your reg-rep email and password
3. Click "Login"
4. You'll be redirected to the dashboard

### Available Features

As a RegRep, you can:
- View all members
- Search members
- View all sessions
- View session attendance
- Generate reports
- View dashboard statistics

### Limitations

RegReps **cannot**:
- Create, edit, or delete members
- Create, edit, or delete sessions
- Mark members present manually
- Manage other reg-reps
- Access admin settings

## Member Check-in Guide

### Receiving Your PIN

When you're added to the system, you'll receive an email with your unique 5-digit PIN. Save this PIN securely - you'll need it for every check-in.

**If you didn't receive your PIN:**
- Contact your church admin
- Ask them to resend your PIN

### Checking In

#### Method 1: QR Code Scan

1. At the venue, locate the QR code for the session
2. Open your phone's camera app
3. Point camera at QR code
4. Tap the notification that appears
5. You'll be taken to the check-in page
6. Answer the verification question
7. Enter your 5-digit PIN
8. Click **"Check In"**
9. See confirmation message

#### Method 2: Direct Link

1. Click the check-in link provided by your church
2. Answer the verification question
3. Enter your 5-digit PIN
4. Click **"Check In"**
5. See confirmation message

### Verification Questions

Each session has a verification question to prove you're physically present. Examples:
- "What color is the church roof?"
- "What is written on the welcome banner?"
- "What is the name of today's speaker?"

Answer the question exactly as instructed by your church admin.

### Troubleshooting Check-in

**"Session not found"**
- The session link may be incorrect
- Contact your church admin

**"Session is not active"**
- Check-in is outside the allowed time window
- Wait until the session start time
- Or contact admin if you believe this is an error

**"Invalid PIN"**
- Double-check you entered the correct 5-digit PIN
- Contact admin to resend your PIN if needed

**"Already checked in"**
- You've already checked in for this session
- Each member can only check in once per session

**"Invalid secret answer"**
- Answer the verification question correctly
- Answers are case-sensitive

## Troubleshooting

### Common Issues

#### Can't Log In

- Verify your email and password are correct
- Check if your account is active (contact admin)
- Clear browser cache and cookies
- Try a different browser

#### PIN Email Not Received

- Check spam/junk folder
- Verify email address is correct in member profile
- Ask admin to resend PIN
- Check email server configuration (admin)

#### Bulk Upload Fails

- Ensure file format is correct (.xlsx, .xls, or .csv)
- Check that required fields (name) are filled
- Verify no duplicate names in file
- Check file size (should be under 10MB)
- Review error messages for specific row issues

#### Session QR Code Not Working

- Verify session is active
- Check that start time hasn't passed
- Ensure QR code wasn't corrupted during printing
- Try scanning with a different QR code reader

#### Report Generation Fails

- Check date range is valid
- Ensure filters are correct
- Try generating with fewer filters
- Contact admin if issue persists

### Getting Help

For additional support:
1. Contact your church administrator
2. Check the system documentation
3. Review error messages carefully
4. Try refreshing the page
5. Clear browser cache

### Best Practices

**For Admins:**
- Regularly backup member data
- Keep session information up to date
- Monitor attendance reports regularly
- Keep member information current
- Test check-in process before major events

**For Members:**
- Save your PIN securely
- Check in early to avoid last-minute issues
- Answer verification questions accurately
- Contact admin if you lose your PIN
