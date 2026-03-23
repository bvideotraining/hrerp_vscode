#!/bin/bash

# HR ERP Frontend - Firebase Integration Setup Guide

## 1. Environment Setup

### Create .env.local file
```bash
cp .env.local.example .env.local
```

### Add your Firebase credentials to .env.local
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_value
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_value.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXX
```

## 2. Firebase Console Configuration

### Enable Authentication
1. Go to Firebase Console > Authentication
2. Enable Email/Password provider
3. Enable Google OAuth provider (optional)
4. Set up authorized domains

### Create Firestore Database
1. Go to Firebase Console > Firestore Database
2. Create database in production mode
3. Set security rules (see security-rules.txt)

### Create Storage Bucket
1. Go to Firebase Console > Storage
2. Create bucket for employee documents
3. Set up storage rules

## 3. Firestore Security Rules

Create these rules in Firestore:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authenticate user
    function isAuthenticated() {
      return request.auth != null;
    }

    // Employee Collection
    match /EMPLOYEES/{document=**} {
      allow read: if isAuthenticated();
      allow write: if isAuthenticated() && request.auth.token.admin == true;
      allow delete: if isAuthenticated() && request.auth.token.admin == true;
    }

    // Audit Logs Collection
    match /AUDIT_LOGS/{document=**} {
      allow read: if isAuthenticated() && request.auth.token.admin == true;
      allow write: if isAuthenticated();
    }

    // Other collections - follow same pattern
  }
}
```

## 4. Install Dependencies

```bash
npm install firebase
```

## 5. Running the Application

```bash
# Development
npm run dev

# Build
npm run build

# Production
npm run start
```

## 6. Testing Firebase Integration

### Test Employee CRUD
```bash
# Login to the dashboard
# Navigate to Employees
# Try: Add, Edit, View, Delete operations
```

### View Firestore Data
- Open Firebase Console > Firestore Database
- Check the EMPLOYEES collection for new records

### Check Audit Logs
- Open Firebase Console > Firestore Database
- Check the AUDIT_LOGS collection for action records

## 7. Verification Checklist

- [ ] Firebase SDK initialized without errors
- [ ] Login/logout working with Firebase Auth
- [ ] Employees appear in Firestore when created
- [ ] Edit updates show in Firestore
- [ ] Delete removes from Firestore
- [ ] Audit logs recorded for all operations
- [ ] Toast notifications showing
- [ ] Form validation working

## 8. Next Steps

1. **Add Real-time Listeners**: Update employee pages to show live updates
2. **Implement Offline Support**: Enable Firestore offline persistence
3. **Create Services for Other Modules**: Use employee service as template
4. **Add Firebase File Upload**: For employee documents
5. **Phase 6**: Build NestJS backend API

## Common Issues & Solutions

### "Firebase not configured"
- Check .env.local file exists
- Verify all 7 Firebase env variables are set

### "Permission denied" errors
- Check Firestore security rules
- Ensure user is authenticated
- Check user role permissions

### "Connection refused"
- Verify Firebase project is active
- Check internet connection
- Review firebaserc configuration

## Documentation Files

- **src/lib/firebase.ts** - Firebase service initialization
- **src/lib/firestore-schema.ts** - Firestore collections schema
- **src/lib/services/employee.service.ts** - Employee data operations
- **src/lib/services/auth.service.ts** - Authentication service
- **src/lib/services/audit-logging.service.ts** - Audit operations
- **src/lib/services/firestore.service.ts** - Generic Firestore CRUD
- **src/hooks/use-auth.ts** - Auth hook
- **src/hooks/use-employee.ts** - Employee hook
- **src/hooks/use-firestore.ts** - Generic Firestore hook

## Support & Troubleshooting

For issues, check:
1. Firebase Console > Realtime Database > Rules (security)
2. Browser DevTools > Console (errors)
3. Firebase > Logs (admin SDK errors)
4. .env.local file (config errors)
