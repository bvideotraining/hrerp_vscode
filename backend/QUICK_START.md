# Quick Start - HR ERP Backend

## 60-Second Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Start development server
npm run start:dev

# 4. Visit API docs
http://localhost:3001/api/docs
```

## Key Endpoints

**Health Check**
```bash
curl http://localhost:3001
```

**Login**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@company.com","password":"password123"}'
```

**Get Employees** (with JWT token)
```bash
curl -X GET http://localhost:3001/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Environment Setup

Edit `.env` file with:
```
PORT=3001
FIREBASE_PROJECT_ID=your_id
FIREBASE_PRIVATE_KEY=your_key
FIREBASE_CLIENT_EMAIL=your_email
JWT_SECRET=your_secret_min_32_chars
```

## Development

```bash
npm run start:dev          # Watch mode
npm test                   # Run tests
npm run lint              # Check code
npm run format            # Fix formatting
```

## Production

```bash
npm run build             # Build TypeScript
npm run start:prod        # Run production build
docker-compose up -d      # Run with Docker
```

## Documentation

- See `BACKEND_SETUP.md` for complete guide
- See `PHASE_6_ARCHITECTURE.md` for architecture
- Visit `http://localhost:3001/api/docs` for API docs

## Quick Tips

✅ JWT tokens expire in 24 hours
✅ Token needed for/employees endpoints (except auth)
✅ All endpoints return consistent JSON format
✅ Errors include statusCode, message, timestamp
✅ Frontend at http://localhost:3000 connects to http://localhost:3001

## Support

Frontend: `../frontend` directory
Database: Firebase Firestore (configured in .env)
API: Swagger UI at http://localhost:3001/api/docs
