# Database Schema Documentation

Complete database schema reference for the Church Attendance Management System.

## Overview

The system uses PostgreSQL as the primary database with Prisma ORM for schema management and migrations.

## Entity Relationship Diagram

```
Admin (1) ──< (Many) Member
Admin (1) ──< (Many) RegRep
Admin (1) ──< (Many) Session
Admin (1) ──< (Many) upload_history

Member (1) ──< (Many) attendance
Session (1) ──< (Many) attendance

attendance (Many) ──> (1) Member
attendance (Many) ──> (1) Session
```

## Tables

### admins

Stores administrator user accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| email | String | UNIQUE, NOT NULL | Admin email address |
| password | String | NOT NULL | Hashed password |
| name | String | NOT NULL | Admin full name |
| isActive | Boolean | DEFAULT true | Account status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Relationships:**
- One-to-Many with `members` (createdBy)
- One-to-Many with `reg_reps` (createdBy)
- One-to-Many with `sessions` (createdBy)
- One-to-Many with `upload_history` (uploadedBy)

**Indexes:**
- Primary key on `id`
- Unique index on `email`

### reg_reps

Stores Registration Representative accounts (limited access users).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| email | String | UNIQUE, NOT NULL | RegRep email address |
| password | String | NOT NULL | Hashed password |
| name | String | NOT NULL | RegRep full name |
| isActive | Boolean | DEFAULT true | Account status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |
| createdBy | String (UUID) | FOREIGN KEY → admins.id | Admin who created this reg-rep |

**Relationships:**
- Many-to-One with `admins` (createdBy)

**Indexes:**
- Primary key on `id`
- Unique index on `email`
- Foreign key index on `createdBy`

### members

Stores church member information and PINs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| name | String | UNIQUE, NOT NULL | Member full name |
| firstName | String | NULLABLE | First name |
| lastName | String | NULLABLE | Last name |
| email | String | UNIQUE, NULLABLE | Email address |
| phone | String | NULLABLE | Phone number |
| pin | String | UNIQUE, NOT NULL | 5-digit PIN for check-in |
| pinHash | String | NULLABLE | Hashed PIN (optional) |
| dateOfBirth | DateTime | NULLABLE | Date of birth |
| gender | String | NULLABLE | Gender |
| address | String | NULLABLE | Physical address |
| membershipType | String | NULLABLE | Type of membership |
| department | String | NULLABLE | Department/ministry |
| position | String | NULLABLE | Position/role |
| isActive | Boolean | DEFAULT true | Member status |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |
| createdBy | String (UUID) | FOREIGN KEY → admins.id | Admin who created this member |

**Relationships:**
- Many-to-One with `admins` (createdBy)
- One-to-Many with `attendance` (memberId)

**Indexes:**
- Primary key on `id`
- Unique index on `name`
- Unique index on `email`
- Unique index on `pin`
- Foreign key index on `createdBy`

**Notes:**
- `name` field is required and must be unique
- `email` can be null but if provided must be unique
- `pin` is a 5-digit string that must be unique

### sessions

Stores church session/event information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| theme | String | NOT NULL | Session theme/title |
| name | String | NULLABLE | Session name |
| description | String | NULLABLE | Session description |
| startTime | DateTime | NOT NULL | Check-in start time |
| endTime | DateTime | NOT NULL | Check-in end time |
| date | DateTime | NULLABLE | Session date |
| time | String | NULLABLE | Session time string |
| location | String | NULLABLE | Session location |
| secretQuestion | String | NOT NULL | Verification question |
| secretAnswer | String | NOT NULL | Hashed answer |
| secretAnswerPlain | String | NULLABLE | Plain text answer (admin reference) |
| maxAttendees | Integer | NULLABLE | Maximum attendees |
| isActive | Boolean | DEFAULT true | Session status |
| qrCodeData | String | NULLABLE | QR code URL/data |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |
| createdBy | String (UUID) | FOREIGN KEY → admins.id | Admin who created this session |

**Relationships:**
- Many-to-One with `admins` (createdBy)
- One-to-Many with `attendance` (sessionId)

**Indexes:**
- Primary key on `id`
- Foreign key index on `createdBy`
- Index on `startTime` and `endTime` (for date range queries)

**Notes:**
- `secretAnswer` is stored hashed for security
- `secretAnswerPlain` is optional and only for admin reference
- QR codes are generated automatically on session creation

### attendances

Junction table linking members to sessions (attendance records).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| memberId | String (UUID) | FOREIGN KEY → members.id | Member who attended |
| sessionId | String (UUID) | FOREIGN KEY → sessions.id | Session attended |
| checkedIn | Boolean | DEFAULT true | Check-in status |
| checkedInAt | DateTime | DEFAULT now() | Check-in timestamp |
| createdAt | DateTime | DEFAULT now() | Creation timestamp |
| updatedAt | DateTime | AUTO UPDATE | Last update timestamp |

**Relationships:**
- Many-to-One with `members` (memberId)
- Many-to-One with `sessions` (sessionId)

**Indexes:**
- Primary key on `id`
- Unique composite index on `[memberId, sessionId]` (prevents duplicate check-ins)
- Foreign key index on `memberId`
- Foreign key index on `sessionId`
- Index on `checkedInAt` (for reporting)

**Notes:**
- Composite unique constraint ensures a member can only check in once per session
- `checkedInAt` defaults to current timestamp but can be set manually by admin

### upload_history

Tracks bulk member uploads.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PRIMARY KEY | Unique identifier |
| filename | String | NOT NULL | Uploaded file name |
| totalRecords | Integer | NOT NULL | Total records in file |
| successful | Integer | NOT NULL | Successfully imported count |
| failed | Integer | NOT NULL | Failed import count |
| errors | JSON | NULLABLE | Error details |
| createdAt | DateTime | DEFAULT now() | Upload timestamp |
| uploadedBy | String (UUID) | FOREIGN KEY → admins.id | Admin who uploaded |

**Relationships:**
- Many-to-One with `admins` (uploadedBy)

**Indexes:**
- Primary key on `id`
- Foreign key index on `uploadedBy`
- Index on `createdAt` (for history queries)

**Notes:**
- `errors` field stores JSON object with detailed error information
- Used for audit trail and troubleshooting

## Constraints

### Unique Constraints

1. **admins.email** - Each admin must have a unique email
2. **reg_reps.email** - Each reg-rep must have a unique email
3. **members.name** - Each member must have a unique name
4. **members.email** - If provided, email must be unique
5. **members.pin** - Each PIN must be unique
6. **attendances.[memberId, sessionId]** - A member can only check in once per session

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` to maintain referential integrity:
- `members.createdBy` → `admins.id`
- `reg_reps.createdBy` → `admins.id`
- `sessions.createdBy` → `admins.id`
- `upload_history.uploadedBy` → `admins.id`
- `attendances.memberId` → `members.id`
- `attendances.sessionId` → `sessions.id`

## Data Types

- **UUID**: String format UUID v4 (e.g., "550e8400-e29b-41d4-a716-446655440000")
- **DateTime**: ISO 8601 format timestamps
- **Boolean**: true/false
- **String**: Variable length text
- **Integer**: 32-bit signed integer
- **JSON**: JSON object stored as text

## Migration History

Migrations are managed through Prisma Migrate. Key migrations include:

1. Initial schema creation
2. Enable Row Level Security (RLS)
3. Add unique constraint on member names
4. Remove unique constraint on member emails (allow duplicates)

## Row Level Security (RLS)

RLS is enabled on all tables as a defense-in-depth measure. However, since the application uses Prisma ORM which bypasses RLS, policies are set to `DENY ALL` by default. All access control is handled at the application layer.

## Best Practices

1. **Always use UUIDs** for primary keys to avoid collisions
2. **Use transactions** for multi-step operations (e.g., bulk uploads)
3. **Index frequently queried fields** (dates, foreign keys, search fields)
4. **Use soft deletes** via `isActive` flag rather than hard deletes when possible
5. **Maintain audit trails** via `createdAt` and `updatedAt` timestamps
6. **Validate data** at the application layer before database operations
