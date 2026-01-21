# Church Attendance Management System

A comprehensive web-based attendance tracking system designed for churches and religious organizations to manage member registration and session-based attendance with secure verification.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [User Roles](#-user-roles)
- [Technology Stack](#️-technology-stack)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## Overview

The Church Attendance Management System streamlines the process of tracking member attendance across multiple church sessions. The system features a multi-role design:

- **Admin Panel**: Full system access for managing members, sessions, reg-reps, and viewing reports
- **RegRep Panel**: Registration Representatives with read-only access to members, sessions, and attendance
- **Member Check-in**: A mobile-friendly public interface for members to sign their attendance using PINs

### Key Workflow

1. **One-Time Registration**: Admin uploads member data via Excel; each member receives a permanent 5-digit PIN via email
2. **Session Creation**: Admin creates sessions with themes, time windows, security questions, and generates QR codes
3. **Attendance Check-in**: Members scan QR codes, answer location-verification questions, and enter their PINs
4. **Reporting**: Admin and RegReps can view real-time attendance and export reports

## Features

### Admin Features

#### Member Management
- Bulk upload via Excel (supports .xlsx, .xls, .csv)
- Add/edit individual members
- Advanced search (by name, email, phone, PIN)
- View member attendance history
- Resend PIN emails
- Deactivate/reactivate members
- Mark members present manually

#### Session Management
- Create sessions with custom themes
- Set start/end datetime for check-in windows
- Configure location-verification questions
- Auto-generate unique QR codes per session
- Edit/delete sessions
- View live attendance counts
- Activate/deactivate sessions

#### RegRep Management
- Create Registration Representative accounts
- Manage RegRep access and permissions
- View RegRep activity

#### Reporting & Analytics
- Real-time attendance dashboard
- Export reports (JSON, CSV, XLSX, PDF)
- Filter by session, date range, member
- Attendance statistics and trends
- Member participation metrics

### RegRep Features

- View all members (read-only)
- Search members
- View all sessions
- View session attendance
- Generate attendance reports
- View dashboard statistics

### Member Features

#### Simple Check-in Flow
- Scan QR code or click session link
- Answer verification question (proves physical presence)
- Enter 5-digit PIN
- Instant confirmation
- No account required

## User Roles

The system supports three user types:

1. **Admin**: Full system access
   - Manage members, sessions, and reg-reps
   - Create, edit, delete records
   - View all reports and statistics
   - Bulk upload members

2. **RegRep (Registration Representative)**: Limited access
   - View members and sessions (read-only)
   - View attendance records
   - Generate reports
   - Cannot create or modify records

3. **Members**: Public check-in
   - No account required
   - Use PIN for check-in
   - Access via QR code or direct link

## 🔒 Security Features

- Unique, permanent 5-digit PINs per member
- Location-verification questions per session
- Time-window validation (check-in only during active sessions)
- Duplicate check-in prevention
- Rate limiting on API endpoints
- Secure password storage (bcrypt hashing)
- JWT-based authentication
- Role-based access control (Admin, RegRep, Public)
- CORS protection
- Input validation and sanitization
- Row Level Security (RLS) enabled on database

## Technology Stack

### Frontend
- **Framework**: React 19.x
- **State Management**: React Context API
- **Routing**: React Router v7
- **Styling**: TailwindCSS 3.x
- **QR Code**: qrcode.react, html5-qrcode
- **Forms**: React Hook Form + Yup validation
- **HTTP Client**: Axios
- **Build Tool**: Vite 7.x
- **Icons**: Heroicons, Lucide React

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **Database ORM**: Prisma 5.x
- **Authentication**: jsonwebtoken (JWT)
- **File Upload**: Multer
- **Excel Parsing**: xlsx
- **Email**: Nodemailer (SendGrid compatible)
- **QR Generation**: qrcode
- **Validation**: Joi
- **Security**: helmet, cors, express-rate-limit
- **Password Hashing**: bcryptjs

### Database
- **Primary**: PostgreSQL 14+
- **Migrations**: Prisma Migrate
- **Schema Management**: Prisma Schema

### DevOps & Infrastructure
- **Hosting (Backend)**: Railway, Render, Heroku, VPS
- **Hosting (Frontend)**: Vercel, Netlify, GitHub Pages
- **Email Service**: SendGrid (or any SMTP)

## Quick Start

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/Najnomics/reg-system.git
cd reg-system
```

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your database credentials
# DATABASE_URL="postgresql://user:password@localhost:5432/church_attendance"
# JWT_SECRET="your-secret-key"
# EMAIL_HOST="smtp.sendgrid.net"
# EMAIL_USER="apikey"
# EMAIL_PASS="your-sendgrid-api-key"

# Run database migrations
npx prisma migrate dev

# Generate Prisma Client
npx prisma generate

# Seed initial admin user (optional)
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
# From project root
npm install

# Create .env file
cp .env.example .env

# Edit .env with your API URL
# VITE_API_URL=http://localhost:5000/api

# Start development server
npm run dev
```

### 4. Access the Application
- **Admin Dashboard**: http://localhost:5173/admin
- **RegRep Dashboard**: http://localhost:5173/admin (login as RegRep)
- **Member Check-in**: http://localhost:5173/checkin/:sessionId
- **API**: http://localhost:5000/api

**Note:** Default admin credentials depend on your seed script. Check `server/src/scripts/seed.js` for details.

##  Documentation

Comprehensive documentation is available in the `docs/` folder:

- **[API Documentation](docs/API.md)** - Complete API reference with all endpoints
- **[Database Schema](docs/DATABASE.md)** - Database structure and relationships
- **[User Guide](docs/USER_GUIDE.md)** - End-user documentation for all roles
- **[Developer Guide](docs/DEVELOPER.md)** - Development setup and guidelines
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Security Guide](docs/SECURITY.md)** - Security best practices and guidelines

### Quick Links

- **API Base URL**: `http://localhost:5000/api` (development)
- **Authentication**: JWT tokens (Bearer token in Authorization header)
- **Database**: PostgreSQL with Prisma ORM
- **Key Endpoints**:
  - `POST /api/auth/login` - Admin/RegRep login
  - `GET /api/members` - Get members (paginated)
  - `POST /api/members` - Create member (Admin only)
  - `POST /api/upload/members` - Bulk upload (Admin only)
  - `GET /api/sessions` - Get sessions
  - `POST /api/sessions` - Create session (Admin only)
  - `POST /api/checkin/:sessionId` - Public check-in
  - `GET /api/dashboard/stats` - Dashboard statistics

For detailed API documentation, see [docs/API.md](docs/API.md).

## Testing

```bash
# Backend tests
cd server && npm test

# Frontend tests (if configured)
npm test
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [docs/DEVELOPER.md](docs/DEVELOPER.md) for development guidelines.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with love for the church community
- Special thanks to all contributors

## Support

For support or questions:
- Check the [documentation](docs/) folder
- Open an issue on [GitHub](https://github.com/Najnomics/reg-system/issues)

## 🗺️ Project Status

### Current Features
- ✅ Member management (CRUD operations)
- ✅ Bulk member upload (Excel/CSV)
- ✅ Session creation and management
- ✅ QR code generation for sessions
- ✅ PIN-based check-in system
- ✅ Attendance tracking
- ✅ Role-based access control (Admin, RegRep)
- ✅ Reporting and exports (JSON, CSV, XLSX, PDF)
- ✅ Email notifications (PIN delivery)
- ✅ Dashboard with statistics

### Future Enhancements
- 🔄 SMS notifications
- 🔄 WhatsApp integration
- 🔄 Member self-service portal
- 🔄 Advanced analytics
- 🔄 Mobile app
- 🔄 Offline check-in (PWA)

---

**Made with love for the church community**