# 🔐 Authentication Testing Guide

## Quick Start

### 1️⃣ Test Credentials

Use these credentials to test the authentication flow:

```
Email: test@company.com
Password: TestPassword123!
Full Name: Test User
```

### 2️⃣ Create Test User (if not exists)

#### Option A: Via Frontend Signup Page
1. Go to `http://localhost:3000/login`
2. Click "Sign Up"
3. Enter the test credentials above
4. Click "Create Account"

#### Option B: Via Backend API (cURL)
```bash
curl -X POST http://localhost:3003/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "TestPassword123!",
    "fullName": "Test User"
  }'
```

#### Expected Response:
```json
{
  "id": "user-id-123",
  "email": "test@company.com",
  "fullName": "Test User",
  "role": "user",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer"
}
```

---

## 🧪 Testing Authentication Flow

### Test 1: Login via API

```bash
curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@company.com",
    "password": "TestPassword123!"
  }'
```

**What to check:**
- ✅ Status code `200`
- ✅ Response includes `accessToken`
- ✅ Token format: `Bearer eyJhbGc...`
- ✅ User data returned (email, role, etc.)

---

### Test 2: Decode JWT Token

Use an online JWT decoder: https://jwt.io/

Paste your token and verify:
```json
{
  "sub": "user-id-123",
  "email": "test@company.com",
  "role": "user",
  "iat": 1711190400,
  "exp": 1711276800
}
```

**What to check:**
- ✅ Token contains user ID
- ✅ Token includes email and role
- ✅ Expiration time is ~24 hours from now

---

### Test 3: Use Token to Access Protected Endpoint

```bash
curl -X GET http://localhost:3003/api/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

**What to check:**
- ✅ Status code `200`
- ✅ Returns list of employees (or empty array)
- ✅ No `401 Unauthorized` error

**If you get 401:**
```bash
# Token is invalid or expired - login again
```

---

### Test 4: Test Invalid Token

```bash
curl -X GET http://localhost:3003/api/employees \
  -H "Authorization: Bearer invalid-token-xyz"
```

**Expected:** `401 Unauthorized`

---

## 🌐 Test via Browser Console

Open your browser's DevTools (F12) and run these commands:

### Test Signup:
```javascript
import authTest from '@/lib/auth-test'
await authTest.testSignup()
```

### Test Login:
```javascript
import authTest from '@/lib/auth-test'
await authTest.testLogin()
```

### Validate JWT:
```javascript
import authTest from '@/lib/auth-test'
authTest.testJWTValidation()
```

### Test Protected Endpoint:
```javascript
import authTest from '@/lib/auth-test'
await authTest.testProtectedEndpoint()
```

### Run Full Test Suite:
```javascript
import authTest from '@/lib/auth-test'
await authTest.runFullAuthTestSuite()
```

---

## 🔍 Debugging

### Check Stored Token:
```javascript
localStorage.getItem('jwtToken')
```

### Check Stored User:
```javascript
JSON.parse(localStorage.getItem('user'))
```

### Clear Auth Storage:
```javascript
localStorage.removeItem('jwtToken')
localStorage.removeItem('user')
```

### Check API Response Headers:
```javascript
// In browser Network tab, look for:
// Authorization: Bearer eyJhb...
// X-Request-ID: ...
// Set-Cookie: ...
```

---

## 📊 Expected Behavior

### Successful Login Flow:
```
1. User enters email/password on /login page
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend verifies credentials
   ↓
4. Backend creates JWT token signed with JWT_SECRET
   ↓
5. Frontend stores token in localStorage
   ↓
6. Frontend redirects to /dashboard
   ↓
7. Dashboard uses token for authenticated requests
```

### Successful Signup Flow:
```
1. User enters email/password/name on signup form
   ↓
2. Frontend sends POST /api/auth/signup
   ↓
3. Backend creates user in Firestore USERS collection
   ↓
4. Backend generates JWT token
   ↓
5. Frontend stores token and redirects to /dashboard
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Invalid credentials"
**Solution:** 
- Ensure user exists in Firestore
- Check email spelling
- Verify password is correct

### Issue: "401 Unauthorized" on protected endpoints
**Solution:**
- Check token is in localStorage
- Verify token format starts with `Bearer `
- Check token expiration: `testTokenExpiration()`
- Try logging in again to get fresh token

### Issue: Token not stored
**Solution:**
- Check if localStorage is enabled
- Check browser console for errors
- Verify backend returned `accessToken` in response

### Issue: CORS errors
**Solution:**
- Verify backend has CORS enabled
- Check `CORS_ORIGIN` in backend `.env`
- Ensure frontend is using correct backend URL in `.env.local`

---

## 🚀 Next Steps After Testing

1. ✅ **Verify authentication works end-to-end**
2. ✅ **Test token refresh mechanism** (if implemented)
3. ✅ **Test logout and token cleanup**
4. ✅ **Test role-based access control (RBAC)**
5. ✅ **Implement protected routes in frontend**
6. ✅ **Add JWT token to all API requests**

---

## 📚 Reference

- **Backend Auth Code**: `backend/src/modules/auth/`
- **Frontend Auth Code**: `frontend/src/lib/services/backend-auth.service.ts`
- **Test Code**: `frontend/src/lib/auth-test.ts`
- **API Docs**: `http://localhost:3003/api/docs`
