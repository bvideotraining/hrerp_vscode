# Android App Quick Start Guide

Complete your Android app setup in 5 minutes.

## Step 1: Firebase Setup (5 min)

1. Open [Firebase Console](https://console.firebase.google.com)
2. Create project or use existing HR ERP project
3. Download `google-services.json` from Project Settings
4. Place in `Android/app/` folder
5. Enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Messaging

## Step 2: Configure Backend URL (2 min)

Edit `app/src/main/kotlin/com/hrerp/attendance/di/AppModule.kt`:

```kotlin
private const val BASE_URL = "http://YOUR_BACKEND_URL:3001/api"
// OR for emulator:
private const val BASE_URL = "http://10.0.2.2:3001/api"
```

## Step 3: Open in Android Studio

```bash
cd E:\HR_Erp_vscode\Android
# Open with Android Studio
```

## Step 4: Build & Run

```bash
# Sync Gradle files (File → Sync Now in Android Studio)
# OR via terminal:
./gradlew build

# Run on emulator or device
./gradlew installDebug
```

## Step 5: Test Login

1. Open app on emulator/device
2. Enter test email: `test@company.com`
3. Enter password
4. Should redirect to Home dashboard

## Key Files to Know

| File | Purpose |
|------|---------|
| `di/AppModule.kt` | Dependency injection, API base URL |
| `data/remote/api/EmployeeTrackerApi.kt` | API endpoints definition |
| `data/remote/repositories/AttendanceRepository.kt` | Attendance business logic |
| `presentation/viewmodel/HomeViewModel.kt` | Check-in/out logic |
| `presentation/viewmodel/AuthViewModel.kt` | Login/auth logic |
| `ui/screens/Screens.kt` | All UI screens |

## Common Tasks

### Change API URL
- Settings button (gear icon) on any screen
- Input new URL: `http://your-ip:3001/api`
- Test connection automatically

### Enable/Disable Features
- Settings → Toggle biometric
- Settings → Adjust sync interval
- Settings → Toggle notifications

### View Logs
```bash
adb logcat | grep "EmployeeTrackerApplication\|EmployeeTracker"
```

### Clear App Data
```bash
adb shell pm clear com.hrerp.attendance
```

### Debug on Physical Device

1. Enable Developer Mode (tap Build Number 7 times)
2. Enable USB Debugging in Developer Options
3. Connect device via USB
4. Accept device fingerprint
5. Run: `./gradlew installDebug`

## Backend Running?

The app needs the backend running!

```bash
# From backend folder
npm install
npm run start
# Should output: "Server running on port 3001"
```

If using different machine:
- Update API URL in Settings
- Use machine IP instead of localhost
- Ensure firewall allows port 3001

## Emulator Network

For emulator to reach local backend:
- Use `10.0.2.2` instead of `localhost`
- Backend must be running on host machine
- Emulator has limited internet by default

## Troubleshooting

**"Failed to connect to backend"**
→ Check API URL in Settings, ensure backend is running

**"Firebase not initialized"**
→ Verify `google-services.json` is in app folder

**"Biometric not available"**
→ Some emulators don't support it, okay for testing

**Location Permission Denied**
→ Settings → Apps → Permissions → Allow Location

## IDE Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+A` | Find IDE action |
| `Ctrl+K` `Ctrl+C` | Comment code |
| `Alt+Enter` | Quick fixes |
| `Ctrl+Alt+L` | Format code |
| `Ctrl+Shift+T` | Create test |

## Next Steps

1. ✅ Firebase configured
2. ✅ Backend URL set
3. ✅ App running
4. → Create test employee in backend
5. → Login with test credentials
6. → Test check-in/out from Home screen
7. → Enable offline and test sync

## Document Links

- [Full README](README.md)
- [Backend API Docs](../backend/BACKEND_SETUP.md)
- [Phase 5 Details](../PHASE_3_DASHBOARD_NAVIGATION.md)

**Questions?** Check debug logs or create GitHub issue.
