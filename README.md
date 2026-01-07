# Church Attendance Management System

A comprehensive web-based attendance tracking system designed for churches and religious organizations to manage member registration and session-based attendance with secure verification.

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [System Architecture](#️-system-architecture)
- [Technology Stack](#️-technology-stack)
- [Database Schema](#️-database-schema)
- [API Documentation](#-api-documentation)
- [Installation & Setup](#-installation--setup)
- [Usage Guide](#-usage-guide)
- [Security Features](#-security-features)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 Overview

The Church Attendance Management System streamlines the process of tracking member attendance across multiple church sessions. The system features a dual-interface design:

- **Admin Panel**: For managing members, creating sessions, and viewing attendance reports
- **Member Check-in**: A mobile-friendly interface for members to sign their attendance

### Key Workflow

1. **One-Time Registration**: Admin uploads member data via Excel; each member receives a permanent 5-digit PIN via email
2. **Session Creation**: Admin creates sessions with themes, time windows, security questions, and generates QR codes
3. **Attendance Check-in**: Members scan QR codes, answer location-verification questions, and enter their PINs
4. **Reporting**: Admin views real-time attendance and exports reports

## ✨ Features

### Admin Features

#### Member Management
- Bulk upload via Excel (supports .xlsx, .xls, .csv)
- Add/edit individual members
- Advanced search (by name, email, phone, PIN)
- View member attendance history
- Resend PIN emails
- Deactivate/reactivate members

#### Session Management
- Create sessions with custom themes
- Set start/end datetime for check-in windows
- Configure location-verification questions
- Auto-generate unique QR codes per session
- Edit/delete sessions
- View live attendance counts

#### Reporting & Analytics
- Real-time attendance dashboard
- Export reports (Excel/CSV)
- Filter by session, date range, member
- Attendance statistics and trends
- Member participation metrics

### Member Features

#### Simple Check-in Flow
- Scan QR code or click session link
- Answer verification question (proves physical presence)
- Enter 5-digit PIN
- Instant confirmation
- View personal attendance history (optional)

## 🔒 Security Features

- Unique, permanent 5-digit PINs per member
- Location-verification questions per session
- Time-window validation (check-in only during active sessions)
- Duplicate check-in prevention
- Rate limiting on PIN attempts
- Secure PIN storage (hashed/encrypted)
- Admin authentication with JWT
- CSRF protection
- Input sanitization

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.x
- **State Management**: React Context API / Redux Toolkit
- **Routing**: React Router v6
- **Styling**: TailwindCSS 3.x
- **UI Components**: shadcn/ui
- **QR Code**: qrcode.react
- **Forms**: React Hook Form + Yup validation
- **HTTP Client**: Axios
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+ LTS
- **Framework**: Express.js 4.x
- **Database ORM**: Prisma
- **Authentication**: jsonwebtoken (JWT)
- **File Upload**: Multer
- **Excel Parsing**: xlsx / exceljs
- **Email**: Nodemailer + SendGrid
- **Job Queue**: Bull + Redis
- **QR Generation**: qrcode
- **Validation**: Joi
- **Security**: helmet, cors, express-rate-limit

### Database
- **Primary**: PostgreSQL 14+
- **Cache/Queue**: Redis 7+
- **Migrations**: Prisma Migrate

### DevOps & Infrastructure
- **Containerization**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Hosting (Backend)**: Railway / Render
- **Hosting (Frontend)**: Vercel / Netlify
- **File Storage**: AWS S3
- **Monitoring**: Sentry

## 🚀 Installation & Setup

### Prerequisites
- Node.js 18+ LTS
- PostgreSQL 14+
- Redis 7+ (optional, for job queues)
- npm or yarn

### 1. Clone Repository
```bash
git clone https://github.com/yourchurch/attendance-system.git
cd attendance-system
```

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Run database migrations
npx prisma migrate dev

# Seed initial admin user (optional)
npm run seed

# Start development server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../client

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Start development server
npm run dev
```

### 4. Access the Application
- **Admin Dashboard**: http://localhost:3000/admin
- **Member Check-in**: http://localhost:3000/checkin/:sessionId
- **API**: http://localhost:5000/api

**Default Admin Credentials:**
```
Email: admin@church.com
Password: admin123
⚠️ Change these immediately in production!
```

## 📖 Usage Guide

### For Administrators

1. **First-Time Setup**
   - Login to admin dashboard
   - Upload Members via Excel template
   - Configure Email Settings

2. **Creating a Session**
   - Navigate to Sessions page
   - Fill in theme, datetime, and security question
   - Download/Print QR Code for venue

3. **During the Event**
   - Display QR code at entrance
   - Monitor Live Attendance on dashboard

4. **After the Event**
   - View Attendance Report
   - Export to Excel/CSV if needed

### For Members

1. **First-Time Setup**
   - Check email for PIN
   - Save your 5-digit PIN securely

2. **Checking In**
   - Scan QR Code at venue
   - Answer Verification Question
   - Enter Your PIN
   - See Confirmation Message

## 🗄️ Database Schema

### Core Tables
- **Members**: Store member information and PINs
- **Sessions**: Session details with QR codes and questions
- **Attendance**: Junction table linking members to sessions

```sql
-- Key relationships
Members (1) ←→ (Many) Attendance (Many) ←→ (1) Sessions
```

## 📡 API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://api.yourchurch.com/api
```

### Authentication
All admin endpoints require JWT authentication:
```
Authorization: Bearer <token>
```

### Key Endpoints
- `POST /api/auth/login` - Admin login
- `POST /api/members/upload` - Bulk upload members
- `POST /api/sessions` - Create session
- `POST /api/checkin/:sessionId/submit` - Member check-in

## 🌐 Deployment

### Option 1: Railway (Recommended for MVP)
1. Create Railway project with PostgreSQL
2. Set environment variables
3. Deploy backend with `railway up`
4. Deploy frontend to Vercel

### Option 2: Docker Compose (Self-Hosted)
```bash
docker-compose up -d
```

### Option 3: AWS (Production)
- EC2 for backend
- RDS for PostgreSQL
- S3 + CloudFront for frontend

## 🧪 Testing

```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test

# E2E tests
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with love for the church community
- Inspired by modern attendance tracking systems
- Special thanks to all contributors

## 📞 Support

For support, email support@yourchurch.com or open an issue on GitHub.

## 🗺️ Roadmap

### Version 1.0 (Current)
- ✅ Member management
- ✅ Session creation
- ✅ QR-based check-in
- ✅ Basic reporting

### Version 1.1 (Planned)
- 🔄 SMS notifications
- 🔄 WhatsApp PIN delivery
- 🔄 Member self-service portal
- 🔄 Advanced analytics dashboard

### Version 2.0 (Future)
- 🔄 Multi-church support
- 🔄 Offline check-in (PWA)
- 🔄 Facial recognition check-in
- 🔄 Integration with church management systems

---

Made with ❤️ for the church community