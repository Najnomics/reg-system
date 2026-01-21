# API Documentation

Complete API reference for the Church Attendance Management System.

## Base URL

```
http://localhost:5000/api (Development)
https://your-domain.com/api (Production)
```

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## User Roles

- **Admin**: Full system access
- **RegRep**: Registration Representative - can view members, sessions, and attendance
- **Public**: No authentication required for check-in endpoints

## Endpoints

### Authentication

#### POST `/api/auth/login`
Login for admins and reg-reps.

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin Name",
    "userType": "admin"
  },
  "userType": "admin"
}
```

#### GET `/api/auth/verify`
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@example.com",
    "name": "Admin Name",
    "userType": "admin"
  }
}
```

### Members

#### GET `/api/members`
Get all members with pagination and filtering.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `sortBy` (string): Field to sort by (default: "name")
- `sortOrder` (string): "asc" or "desc" (default: "asc")
- `query` (string): Search query (searches name, email, phone)
- `name` (string): Filter by name
- `email` (string): Filter by email
- `phone` (string): Filter by phone

**Response:**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "id": "uuid",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "pin": "12345",
        "isActive": true,
        "createdAt": "2024-01-20T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "pages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

#### GET `/api/members/search`
Search members by query string.

**Query Parameters:**
- `q` (string): Search query (required)
- `page`, `limit`: Pagination parameters

#### GET `/api/members/template`
Download Excel template for member upload (Admin only).

**Query Parameters:**
- `format` (string): "xlsx" or "csv" (default: "xlsx")

#### GET `/api/members/:id`
Get a single member by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "member": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "pin": "12345",
      "isActive": true,
      "createdAt": "2024-01-20T10:00:00Z"
    }
  }
}
```

#### POST `/api/members`
Create a new member (Admin only).

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-01",
  "gender": "Male",
  "address": "123 Main St",
  "membershipType": "Regular",
  "department": "Youth",
  "position": "Member"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member created successfully. PIN email is being sent.",
  "data": {
    "member": {
      "id": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "pin": "12345",
      ...
    }
  }
}
```

#### PATCH `/api/members/:id`
Update a member (Admin only).

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "john.new@example.com",
  "phone": "+1234567890",
  "isActive": true
}
```

#### DELETE `/api/members/:id`
Delete a member (Admin only).

#### POST `/api/members/:id/resend-pin`
Resend PIN email to a member (Admin only).

**Response:**
```json
{
  "success": true,
  "message": "PIN email sent successfully"
}
```

#### POST `/api/members/:id/mark-present`
Mark a member as present for a session (Admin only).

**Request Body:**
```json
{
  "sessionId": "session-uuid"
}
```

### Sessions

#### GET `/api/sessions`
Get all sessions.

**Query Parameters:**
- `page`, `limit`, `sortBy`, `sortOrder`: Pagination and sorting
- `isActive` (boolean): Filter by active status
- `startDate`, `endDate`: Filter by date range

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "theme": "Sunday Service",
        "startTime": "2024-01-20T10:00:00Z",
        "endTime": "2024-01-20T12:00:00Z",
        "secretQuestion": "What is the color of the church roof?",
        "isActive": true,
        "createdAt": "2024-01-19T10:00:00Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### GET `/api/sessions/stats`
Get session statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSessions": 50,
    "activeSessions": 5,
    "totalAttendance": 5000
  }
}
```

#### GET `/api/sessions/:id`
Get a single session by ID.

#### POST `/api/sessions`
Create a new session (Admin only).

**Request Body:**
```json
{
  "theme": "Sunday Service",
  "startTime": "2024-01-20T10:00:00Z",
  "endTime": "2024-01-20T12:00:00Z",
  "secretQuestion": "What is the color of the church roof?",
  "secretAnswer": "Red",
  "location": "Main Hall",
  "maxAttendees": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "session": {
      "id": "uuid",
      "theme": "Sunday Service",
      "qrCodeData": "https://checkin.example.com/checkin/session-id",
      ...
    }
  }
}
```

#### PATCH `/api/sessions/:id`
Update a session (Admin only).

#### DELETE `/api/sessions/:id`
Delete a session (Admin only).

#### GET `/api/sessions/:id/attendance`
Get attendance for a session.

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {...},
    "attendance": [
      {
        "id": "uuid",
        "member": {
          "id": "uuid",
          "name": "John Doe",
          "email": "john@example.com"
        },
        "checkedInAt": "2024-01-20T10:30:00Z"
      }
    ],
    "total": 150
  }
}
```

#### POST `/api/sessions/:id/mark-present`
Mark a member as present for a session (Admin only).

**Request Body:**
```json
{
  "memberId": "member-uuid"
}
```

### Check-in (Public)

#### GET `/api/checkin/:sessionId`
Get session details for check-in (no authentication required).

**Response:**
```json
{
  "success": true,
  "data": {
    "session": {
      "id": "uuid",
      "theme": "Sunday Service",
      "secretQuestion": "What is the color of the church roof?",
      "isActive": true,
      "startTime": "2024-01-20T10:00:00Z",
      "endTime": "2024-01-20T12:00:00Z"
    }
  }
}
```

#### POST `/api/checkin/:sessionId`
Public check-in endpoint (no authentication required).

**Request Body:**
```json
{
  "pin": "12345",
  "secretAnswer": "Red"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "attendance": {
      "id": "uuid",
      "memberId": "uuid",
      "sessionId": "uuid",
      "checkedInAt": "2024-01-20T10:30:00Z"
    },
    "member": {
      "name": "John Doe"
    }
  }
}
```

### Upload

#### POST `/api/upload/members`
Upload members via Excel/CSV file (Admin only).

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File types: `.xlsx`, `.xls`, `.csv`

**Response:**
```json
{
  "success": true,
  "message": "Import completed. 50 members imported successfully.",
  "summary": {
    "totalRows": 50,
    "parsed": 50,
    "imported": 50,
    "failed": 0
  },
  "data": {
    "importedMembers": [...],
    "errors": {}
  }
}
```

### Dashboard

#### GET `/api/dashboard/stats`
Get dashboard statistics (Admin/RegRep only).

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMembers": 100,
    "activeMembers": 95,
    "totalSessions": 50,
    "activeSessions": 5,
    "totalAttendance": 5000,
    "recentActivity": [
      {
        "type": "checkin",
        "memberName": "John Doe",
        "sessionTheme": "Sunday Service",
        "timestamp": "2024-01-20T10:30:00Z"
      }
    ]
  }
}
```

### Reports

#### GET `/api/reports/attendance`
Generate attendance reports (Admin/RegRep only).

**Query Parameters:**
- `sessionId` (string): Filter by session
- `memberId` (string): Filter by member
- `startDate`, `endDate`: Filter by date range
- `format` (string): "json", "csv", "xlsx", "pdf" (default: "json")

**Response (JSON):**
```json
{
  "success": true,
  "data": {
    "report": {
      "totalRecords": 150,
      "sessions": [...],
      "members": [...],
      "attendance": [...]
    }
  }
}
```

**Response (CSV/XLSX/PDF):**
Returns file download with appropriate Content-Type header.

### RegReps (Registration Representatives)

#### GET `/api/reg-reps`
Get all reg-reps (Admin only).

#### GET `/api/reg-reps/:id`
Get a single reg-rep (Admin only).

#### POST `/api/reg-reps`
Create a new reg-rep (Admin only).

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "securepassword123"
}
```

#### PATCH `/api/reg-reps/:id`
Update a reg-rep (Admin only).

#### DELETE `/api/reg-reps/:id`
Delete a reg-rep (Admin only).

## Error Responses

All errors follow this format:

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": "Additional error details (optional)"
}
```

### Common Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

### Common Error Messages

- `"Name already exists"` - Member name must be unique
- `"Email already exists"` - Email already registered
- `"PIN already exists"` - PIN collision (rare)
- `"Invalid credentials"` - Login failed
- `"Session not found"` - Session ID invalid
- `"Member not found"` - Member ID invalid
- `"Session is not active"` - Check-in outside time window
- `"Already checked in"` - Duplicate check-in attempt
- `"Invalid secret answer"` - Wrong answer to verification question

## Rate Limiting

Public check-in endpoints may have rate limiting applied in production. Check response headers for rate limit information.

## Pagination

Endpoints that support pagination return pagination metadata:

```json
{
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```
