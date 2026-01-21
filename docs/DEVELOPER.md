# Developer Guide

Complete developer guide for contributing to the Church Attendance Management System.

## Table of Contents

- [Project Structure](#project-structure)
- [Development Setup](#development-setup)
- [Architecture Overview](#architecture-overview)
- [Code Standards](#code-standards)
- [API Development](#api-development)
- [Database Development](#database-development)
- [Frontend Development](#frontend-development)
- [Testing](#testing)
- [Performance Optimization](#performance-optimization)

## Project Structure

```
reg-system/
├── server/                 # Backend application
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/         # API route definitions
│   │   ├── config/         # Configuration files
│   │   ├── utils/          # Utility functions
│   │   ├── scripts/        # Database scripts
│   │   └── index.js        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Database migrations
│   └── package.json
├── src/                    # Frontend application
│   ├── pages/             # Page components
│   ├── components/        # Reusable components
│   ├── contexts/          # React contexts
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   └── App.jsx            # Root component
├── docs/                  # Documentation
├── package.json          # Root package.json
└── README.md
```

## Development Setup

### Prerequisites

- Node.js 18+ LTS
- PostgreSQL 14+
- npm or yarn
- Git

### Initial Setup

1. **Clone the repository**
```bash
git clone https://github.com/Najnomics/reg-system.git
cd reg-system
```

2. **Backend Setup**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your database credentials
npx prisma migrate dev
npm run dev
```

3. **Frontend Setup**
```bash
cd ..
npm install
cp .env.example .env
# Edit .env with your API URL
npm run dev
```

### Environment Variables

**Backend (.env)**
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/church_attendance"
DIRECT_URL="postgresql://user:password@localhost:5432/church_attendance"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=5000
NODE_ENV=development

# Email (Nodemailer)
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASS=your-sendgrid-api-key
EMAIL_FROM=noreply@yourchurch.com
```

**Frontend (.env)**
```env
VITE_API_URL=http://localhost:5000/api
```

## Architecture Overview

### Backend Architecture

The backend follows a **MVC (Model-View-Controller)** pattern:

- **Models**: Prisma schema defines database models
- **Controllers**: Handle business logic and request/response
- **Routes**: Define API endpoints and middleware chain
- **Middleware**: Authentication, validation, error handling

### Frontend Architecture

The frontend uses **React** with:
- **Context API**: Global state management
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls
- **TailwindCSS**: Utility-first CSS framework

### Data Flow

1. **User Action** → Frontend component
2. **API Call** → Axios service
3. **HTTP Request** → Express route
4. **Middleware** → Authentication & validation
5. **Controller** → Business logic
6. **Database** → Prisma ORM
7. **Response** → JSON back to frontend
8. **State Update** → React context/component state

## Code Standards

### JavaScript/Node.js

- Use **ES6+** syntax
- Follow **async/await** pattern (avoid callbacks)
- Use **const** by default, **let** when reassignment needed
- Use **arrow functions** for callbacks
- Use **template literals** for strings
- Use **destructuring** for objects/arrays

**Example:**
```javascript
// Good
const getMembers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const members = await prisma.member.findMany({
      skip: (page - 1) * limit,
      take: limit,
    });
    res.json({ success: true, data: { members } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Bad
function getMembers(req, res) {
  var page = req.query.page || 1;
  prisma.member.findMany().then(members => {
    res.json({ members: members });
  });
}
```

### React

- Use **functional components** with hooks
- Use **PascalCase** for component names
- Use **camelCase** for variables/functions
- Extract reusable logic into **custom hooks**
- Keep components small and focused

**Example:**
```jsx
// Good
const MemberCard = ({ member, onEdit }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = async () => {
    setIsLoading(true);
    await onEdit(member.id);
    setIsLoading(false);
  };

  return (
    <div className="member-card">
      <h3>{member.name}</h3>
      <button onClick={handleEdit} disabled={isLoading}>
        Edit
      </button>
    </div>
  );
};

// Bad
class MemberCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { loading: false };
  }
  // ...
}
```

### File Naming

- **Components**: `PascalCase.jsx` (e.g., `MemberCard.jsx`)
- **Utilities**: `camelCase.js` (e.g., `formatDate.js`)
- **Constants**: `UPPER_SNAKE_CASE.js` (e.g., `API_CONSTANTS.js`)
- **Routes**: `camelCase.js` (e.g., `memberRoutes.js`)

## API Development

### Creating a New Endpoint

1. **Define Route** (`server/src/routes/`)
```javascript
router.get('/:id', 
  authenticateUser,
  validate(schemas.memberId, 'params'),
  memberController.getMember
);
```

2. **Create Controller** (`server/src/controllers/`)
```javascript
exports.getMember = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await prisma.member.findUnique({
      where: { id },
    });
    
    if (!member) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Member not found',
      });
    }
    
    res.json({ success: true, data: { member } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

3. **Add Validation Schema** (`server/src/middleware/validate.js`)
```javascript
memberId: Joi.object({
  id: Joi.string().uuid().required(),
}),
```

### Error Handling

Always use try-catch blocks and return appropriate HTTP status codes:

```javascript
try {
  // Operation
  res.status(200).json({ success: true, data: result });
} catch (error) {
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Conflict',
      message: 'Duplicate entry',
    });
  }
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
  });
}
```

### Authentication

Use middleware to protect routes:

```javascript
// Admin only
router.post('/members', authenticateAdmin, memberController.createMember);

// Admin or RegRep
router.get('/members', authenticateUser, memberController.getMembers);
```

## Database Development

### Creating a Migration

1. **Modify Schema** (`server/prisma/schema.prisma`)
```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

2. **Create Migration**
```bash
npx prisma migrate dev --name add_new_model
```

3. **Generate Prisma Client**
```bash
npx prisma generate
```

### Query Best Practices

- Use **select** to limit fields returned
- Use **include** for relations (avoid N+1 queries)
- Use **pagination** for large datasets
- Use **transactions** for multi-step operations

```javascript
// Good - Paginated query
const members = await prisma.member.findMany({
  skip: (page - 1) * limit,
  take: limit,
  select: {
    id: true,
    name: true,
    email: true,
  },
  orderBy: { name: 'asc' },
});

// Good - Transaction
await prisma.$transaction(async (tx) => {
  const member = await tx.member.create({ data: memberData });
  await tx.attendance.create({ data: attendanceData });
});
```

## Frontend Development

### Creating a New Page

1. **Create Component** (`src/pages/`)
```jsx
import { useState, useEffect } from 'react';
import { useApp } from '../contexts/SimpleAppContext';

const NewPage = () => {
  const { apiService } = useApp();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.get('/endpoint');
        setData(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      {/* Page content */}
    </div>
  );
};

export default NewPage;
```

2. **Add Route** (`src/App.jsx`)
```jsx
<Route path="/new-page" element={<NewPage />} />
```

### Using Context

```jsx
import { useApp } from '../contexts/SimpleAppContext';

const MyComponent = () => {
  const { 
    members, 
    sessions, 
    createMember, 
    updateMember 
  } = useApp();

  const handleCreate = async (data) => {
    try {
      await createMember(data);
      // Success handling
    } catch (error) {
      // Error handling
    }
  };

  return <div>...</div>;
};
```

### Styling with TailwindCSS

```jsx
// Utility classes
<div className="container mx-auto p-4 bg-white rounded-lg shadow-md">
  <h1 className="text-2xl font-bold text-gray-800 mb-4">Title</h1>
  <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
    Click Me
  </button>
</div>
```

## Testing

### Backend Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**Example Test:**
```javascript
const request = require('supertest');
const app = require('../src/index');

describe('GET /api/members', () => {
  it('should return members list', async () => {
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.members)).toBe(true);
  });
});
```

### Frontend Testing

```bash
npm test
```

## Performance Optimization

### Backend

- Use **database indexes** on frequently queried fields
- Implement **pagination** for large datasets
- Use **caching** for frequently accessed data
- Optimize **database queries** (avoid N+1)
- Use **connection pooling**

### Frontend

- **Code splitting** with React.lazy()
- **Memoization** with useMemo/useCallback
- **Image optimization**
- **Bundle size** optimization
- **Lazy loading** for routes

### Database

- **Indexes** on foreign keys and search fields
- **Composite indexes** for multi-field queries
- **Query optimization** (use EXPLAIN ANALYZE)
- **Connection pooling**

## Git Workflow

1. **Create feature branch**
```bash
git checkout -b feature/new-feature
```

2. **Make changes and commit**
```bash
git add .
git commit -m "feat: add new feature"
```

3. **Push and create PR**
```bash
git push origin feature/new-feature
```

### Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code refactoring
- `test:` Tests
- `chore:` Maintenance

## Debugging

### Backend Debugging

```javascript
// Use console.log for debugging
console.log('Debug:', { variable });

// Use debugger in VS Code
debugger;
```

### Frontend Debugging

- Use **React DevTools**
- Use **Browser DevTools**
- Check **Network** tab for API calls
- Check **Console** for errors

## Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)
