# How to Access and Use Supabase Dashboard

## Step 1: Access Supabase Dashboard

1. **Go to Supabase Website**
   - Visit: https://supabase.com
   - Click **"Sign In"** (top right)
   - Log in with your Supabase account credentials

2. **Select Your Project**
   - After logging in, you'll see your project list
   - Click on your project (likely named something like "reg-system" or your project name)

## Step 2: Navigate to Database Tables

Once in your project dashboard:

1. **Click on "Table Editor"** in the left sidebar
   - This shows all your database tables
   - You'll see tables like: `members`, `sessions`, `attendance`, `admins`, etc.

2. **View/Edit Data**
   - Click on any table name (e.g., `members`)
   - You'll see all records in that table
   - You can:
     - **View** all members and their data
     - **Edit** individual records by clicking on a cell
     - **Add** new records using the "+" button
     - **Delete** records using the trash icon
     - **Filter/Sort** using the column headers

## Step 3: Check Member Count Issue

To investigate why dashboard shows 26 but members page shows 20:

1. **Go to Table Editor → `members` table**
2. **Check the `isActive` column**
   - Look for members where `isActive` is `false` or `null`
   - Count total members vs active members
3. **Filter by `isActive`**
   - Click the filter icon on the `isActive` column
   - Filter to see only `false` or `null` values
   - This will show you inactive members

## Step 4: Common Tasks

### View All Members
- **Table Editor** → Click `members` table
- See all member records with: id, name, email, phone, pin, isActive, createdAt, etc.

### Edit a Member
- Click on any cell in the `members` table
- Make changes
- Press Enter or click outside to save

### Delete a Member
- Click the row (left side) to select it
- Click the trash icon that appears
- Confirm deletion

### Check Member Status
- Look at the `isActive` column
- `true` = Active member (shown on members page)
- `false` = Inactive member (hidden from members page)
- `null` = Treated as active (shown on members page)

### View Sessions
- **Table Editor** → Click `sessions` table
- See all sessions with: id, theme, startTime, endTime, secretQuestion, etc.

### View Attendance Records
- **Table Editor** → Click `attendance` table
- See all check-in records

## Step 5: SQL Editor (Advanced)

For more complex queries:

1. **Click "SQL Editor"** in the left sidebar
2. **Write SQL queries** like:
   ```sql
   -- Count all members
   SELECT COUNT(*) FROM members;
   
   -- Count active members only
   SELECT COUNT(*) FROM members WHERE isActive = true;
   
   -- Count members where isActive is not false
   SELECT COUNT(*) FROM members WHERE isActive != false OR isActive IS NULL;
   
   -- See all inactive members
   SELECT * FROM members WHERE isActive = false;
   
   -- Update a member's status
   UPDATE members SET isActive = true WHERE id = 'member-id-here';
   ```

## Step 6: Database Settings

To view/edit database configuration:

1. **Click "Settings"** (gear icon) in the left sidebar
2. **Click "Database"**
3. View:
   - Connection string
   - Database URL
   - Connection pooling settings
   - SSL settings

## Step 7: API Documentation

To see API endpoints:

1. **Click "API"** in the left sidebar
2. View:
   - REST API endpoints
   - GraphQL endpoints
   - API keys

## Quick Links in Supabase Dashboard

- **Table Editor**: View/edit data directly
- **SQL Editor**: Run custom SQL queries
- **Database**: View database settings and connection info
- **API**: View API documentation
- **Authentication**: Manage user authentication
- **Storage**: Manage file storage
- **Settings**: Project configuration

## Troubleshooting

### Can't See Your Project?
- Make sure you're logged into the correct Supabase account
- Check if the project was created under a different account

### Can't Edit Data?
- Check if you have the right permissions
- Some tables might be read-only if you're not the project owner

### Need to Reset Data?
- Use SQL Editor to run DELETE queries
- Or use the trash icon in Table Editor

## Finding Your Project URL

Your Supabase project URL is usually:
- Format: `https://[project-ref].supabase.co`
- You can find it in:
  - Settings → API → Project URL
  - Or in your `.env` file as `DATABASE_URL`

## Need Help?

- Supabase Docs: https://supabase.com/docs
- Supabase Support: Available in the dashboard
- Community: https://github.com/supabase/supabase/discussions
