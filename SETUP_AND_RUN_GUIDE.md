# HR ERP System - Complete Setup & Running Guide

## 🚀 Quick Overview

Your HR ERP system is a **full-stack application** with:
- **Frontend**: Next.js 14 + React 18 (running on `http://localhost:3000`)
- **Backend**: NestJS 10 API (running on `http://localhost:3001`)
- **Database**: Firebase Firestore (cloud-hosted)

---

## 📋 Prerequisites

Before running the application, ensure you have:
- **Node.js 20 LTS** installed ([download](https://nodejs.org))
- **npm** (comes with Node.js)
- **Git** (optional, for version control)
- **Firebase Project** with credentials

---

## 🔧 Firebase Setup (One-time Setup)

### Step 1: Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or use existing one
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key** (for backend)
5. Copy the JSON file contents

### Step 2: Backend Firebase Setup

1. Navigate to `e:\HR_Erp_vscode\backend`
2. Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

3. Edit `.env` and fill in Firebase credentials:

```env
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Firebase Credentials (from Service Account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@appname.iam.gserviceaccount.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com

# JWT Configuration
JWT_SECRET=your-super-secret-key-min-32-chars-long-change-this
JWT_EXPIRATION=24h

# Logging & API
LOG_LEVEL=debug
API_TITLE=HR ERP Backend API
API_DESCRIPTION=Enterprise HR Management System
API_VERSION=1.0.0
```

### Step 3: Frontend Firebase Setup

1. Navigate to `e:\HR_Erp_vscode\frontend`
2. Create `.env.local` file:

```bash
# Copy the .env.local.example if it exists, or create new
```

3. Edit `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## ⚡ Running the Application

### Terminal 1: Start Backend API

```bash
cd e:\HR_Erp_vscode\backend

# Install dependencies (one-time)
npm install

# Start development server (watch mode - auto reload on file change)
npm run start:dev

# Expected output:
# ✓ Firebase Admin SDK initialized
# 🚀 HR ERP Backend running on port 3001
# 📖 API Documentation available at http://localhost:3001/api/docs
```

**Backend is now running!** ✅

### Terminal 2: Start Frontend Application

```bash
cd e:\HR_Erp_vscode\frontend

# Install dependencies (one-time)
npm install

# Start development server
npm run dev

# Expected output:
# ▲ Next.js 14.0.0
# - Local:        http://localhost:3000
# - Environments: .env.local
```

**Frontend is now running!** ✅

---

## 🌐 Access the Application

### Frontend
- **URL**: [http://localhost:3000](http://localhost:3000)
- **Landing Page**: See all 11 HR modules
- **Demo Mode**: Works with mock data without Firebase

### Backend API Documentation
- **Swagger UI**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
- **Health Check**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 📚 API Endpoints Available

### Health & Info
- `GET /` - Welcome message
- `GET /health` - API health status

### Authentication (Public)
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user (returns JWT token)

### Employees (Protected - Requires JWT Token)
- `GET /api/employees` - List all employees with filters
- `POST /api/employees` - Create new employee
- `GET /api/employees/:id` - Get single employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `GET /api/employees/search/:term` - Search employees
- `GET /api/employees/department/:dept` - Filter by department
- `GET /api/employees/branch/:branch` - Filter by branch
- `GET /api/employees/stats/active-count` - Count active employees
- `POST /api/employees/batch/create` - Batch create employees

---

## 🧪 Testing the Application

### Test Using Swagger UI

1. Visit [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
2. Click on `POST /api/auth/signup`
3. Click "Try it out"
4. Enter sample data:

```json
{
  "email": "john@example.com",
  "password": "Password123!",
  "fullName": "John Doe"
}
```

5. Copy the returned `token`
6. Click the **Authorize** button at the top
7. Paste: `Bearer your-token-here`
8. Now test protected endpoints!

### Test Using Frontend

1. Visit [http://localhost:3000](http://localhost:3000)
2. Click "Dashboard" or "Login"
3. Create account or login
4. Navigate to "Employees" section
5. Create, view, edit, delete employees
6. All changes sync with backend & Firebase Firestore

---

## 🛠️ Development Workflows

### Frontend Development

```bash
cd frontend

# Development (hot reload enabled)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production build
npm run start
```

### Backend Development

```bash
cd backend

# Development (watch mode - auto reload)
npm run start:dev

# Debug mode (with inspector)
npm run start:debug

# Type checking
npm run build

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# E2E tests
npm run test:e2e

# Production build
npm run build
npm run start:prod
```

---

## 📁 Project Structure

```
HR_Erp_vscode/
├── frontend/                          # Next.js 14 Frontend
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   ├── components/               # React components
│   │   ├── context/                  # Auth context
│   │   ├── hooks/                    # Custom hooks
│   │   ├── lib/
│   │   │   ├── firebase.ts          # Firebase config
│   │   │   ├── services/            # API services
│   │   │   └── validation/          # Zod schemas
│   │   └── types/                   # TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── .env.local.example
│
├── backend/                           # NestJS Backend
│   ├── src/
│   │   ├── main.ts                  # Bootstrap
│   │   ├── app.module.ts            # Root module
│   │   ├── config/
│   │   │   └── firebase/            # Firebase service
│   │   ├── modules/
│   │   │   ├── auth/               # Authentication
│   │   │   ├── employees/          # Employee CRUD
│   │   │   └── common/             # Shared utilities
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   └── docker-compose.yml
│
└── Documentation files
```

---

## 🔑 Key Credentials to Set

| Item | Where | Format |
|------|-------|--------|
| JWT Secret | `backend/.env` | Min 32 chars, random string |
| Firebase Project ID | Both `.env` files | From Firebase console |
| Firebase Private Key | `backend/.env` | From service account JSON |
| Firebase API Key | `frontend/.env.local` | From Firebase config |
| CORS Origin | `backend/.env` | Frontend URL (http://localhost:3000) |

---

## 🚢 Production Deployment

### Backend Deployment (Docker)

```bash
cd backend

# Build Docker image
docker build -t hr-erp-backend .

# Run container
docker run -p 3001:3001 --env-file .env hr-erp-backend

# Or use Docker Compose
docker-compose up -d
```

### Frontend Deployment (Vercel - Recommended)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Connect your GitHub repo
4. Set environment variables in Vercel dashboard
5. Deploy!

### Backend Deployment (Railway/Render)

1. Set environment variables
2. Connect GitHub repo
3. Deploy!

---

## 🔍 Troubleshooting

### Backend won't start

```bash
# Check if port 3001 is in use
netstat -ano | findstr :3001

# Kill process using port
taskkill /PID <PID> /F

# Restart backend
npm run start:dev
```

### Frontend won't start

```bash
# Clear Next.js cache
rm -r frontend/.next

# Reinstall dependencies
rm -r frontend/node_modules
npm install

# Try again
npm run dev
```

### Firebase connection errors

```
Error: Firebase initialization error
```

- Verify `.env` credentials are correct
- Check `FIREBASE_PRIVATE_KEY` has `\n` properly escaped
- Verify project ID matches between service account and app config

### TypeScript errors in editor

```bash
# Run type check
npm run type-check

# If still issues, clear TypeScript cache
rm -r dist
npm run build
```

---

## 📊 Useful Commands Quick Reference

| Task | Frontend | Backend |
|------|----------|---------|
| Start Dev | `npm run dev` | `npm run start:dev` |
| Type Check | `npm run type-check` | `npm run build` |
| Lint | `npm run lint` | `npm run lint` |
| Format | `npm run format` | `npm run format` |
| Build | `npm run build` | `npm run build` |
| Test | N/A | `npm run test` |

---

## ✨ Next Steps

1. **Run the application** using the commands above
2. **Test with Swagger UI** at [http://localhost:3001/api/docs](http://localhost:3001/api/docs)
3. **Create test data** via frontend
4. **Add remaining 10 modules** (Attendance, Leaves, Payroll, etc.)
5. **Deploy to production** (Vercel + Railway/Render)

---

## 📖 Documentation Links

- [NestJS Docs](https://docs.nestjs.com)
- [Next.js Docs](https://nextjs.org/docs)
- [Firebase Docs](https://firebase.google.com/docs)
- [Swagger/OpenAPI](https://swagger.io)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

---

## 🆘 Need Help?

- Check the Swagger UI at `http://localhost:3001/api/docs`
- Review backend logs in terminal
- Check browser console (F12) for frontend errors
- Verify `.env` files have correct credentials
- Ensure both servers are running on separate terminals

**Happy coding! 🎉**
