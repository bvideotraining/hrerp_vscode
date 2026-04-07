# Employee Tracker - Android Application

A complete Android application for GPS-based employee attendance tracking with offline support, biometric authentication, and real-time synchronization.

## Project Overview

Employee Tracker is a mobile application designed to:
- Track employee attendance using GPS location verification
- Support offline check-in/check-out with automatic sync when online
- Implement geofence-based location validation
- Detect and prevent mock location spoofing
- Provide biometric authentication
- Maintain offline records in local database

## Technology Stack

### Architecture
- **Pattern**: MVVM (Model-View-ViewModel) with Clean Architecture principles
- **Dependency Injection**: Hilt
- **Data Layer**: Retrofit (networking) + Room (local database)
- **UI Framework**: Jetpack Compose with Material3

### Core Libraries
- **Firebase**: Auth, Firestore, Cloud Messaging
- **Google Play Services**: Location, Maps, Integrity API
- **Networking**: Retrofit + Gson + OkHttp
- **Local Database**: Room + Coroutines
- **Background Tasks**: WorkManager
- **Security**: EncryptedSharedPreferences
- **Biometric**: AndroidX Biometric
- **Logging**: Timber

## Project Structure

```
Android/
├── app/
│   ├── build.gradle.kts                 # App-level dependencies
│   ├── proguard-rules.pro              # Code obfuscation rules
│   ├── google-services.json.template   # Firebase config template
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   │   └── com/hrerp/attendance/
│   │   │   │       ├── EmployeeTrackerApplication.kt       # Hilt setup
│   │   │   │       ├── MainActivity.kt                     # Compose entry point
│   │   │   │       ├── di/                # Dependency Injection
│   │   │   │       │   └── AppModule.kt
│   │   │   │       ├── data/              # Data Layer
│   │   │   │       │   ├── local/         # Room database
│   │   │   │       │   │   ├── AttendanceDatabase.kt
│   │   │   │       │   │   ├── Entities.kt
│   │   │   │       │   │   └── DAOs
│   │   │   │       │   ├── remote/        # API & Repositories
│   │   │   │       │   │   ├── api/
│   │   │   │       │   │   │   └── EmployeeTrackerApi.kt
│   │   │   │       │   │   ├── dto/       # Data Transfer Objects
│   │   │   │       │   │   ├── firebase/
│   │   │   │       │   │   │   └── FirebaseAuthHelper.kt
│   │   │   │       │   │   └── repositories/
│   │   │   │       │   │       ├── AuthRepository.kt
│   │   │   │       │   │       ├── AttendanceRepository.kt
│   │   │   │       │   │       ├── BranchRepository.kt
│   │   │   │       │   │       └── DeviceRepository.kt
│   │   │   │       ├── domain/           # Business Logic
│   │   │   │       │   └── usecase/
│   │   │   │       │       ├── ValidateLocationUseCase.kt
│   │   │   │       │       ├── PerformCheckInUseCase.kt
│   │   │   │       │       ├── SyncPendingCheckinsUseCase.kt
│   │   │   │       │       ├── RegisterDeviceUseCase.kt
│   │   │   │       │       └── [more use cases]
│   │   │   │       ├── presentation/    # UI Layer
│   │   │   │       │   ├── viewmodel/   # ViewModels
│   │   │   │       │   │   ├── AuthViewModel.kt
│   │   │   │       │   │   ├── HomeViewModel.kt
│   │   │   │       │   │   ├── HistoryViewModel.kt
│   │   │   │       │   │   ├── SettingsViewModel.kt
│   │   │   │       │   │   ├── ProfileViewModel.kt
│   │   │   │       │   │   └── SyncViewModel.kt
│   │   │   │       ├── ui/              # UI Components
│   │   │   │       │   ├── navigation/
│   │   │   │       │   │   └── NavGraph.kt
│   │   │   │       │   ├── screens/
│   │   │   │       │   │   └── Screens.kt  # All screen composables
│   │   │   │       │   └── theme/
│   │   │   │       │       ├── Theme.kt
│   │   │   │       │       ├── Color.kt
│   │   │   │       │       └── Type.kt
│   │   │   │       ├── util/            # Utilities
│   │   │   │       │   ├── LocationHelper.kt
│   │   │   │       │   ├── MockLocationDetector.kt
│   │   │   │       │   ├── BiometricHelper.kt
│   │   │   │       │   ├── DeviceUtils.kt
│   │   │   │       │   ├── NetworkMonitor.kt
│   │   │   │       │   ├── AppPreferences.kt
│   │   │   │       │   └── NotificationManager.kt
│   │   │   │       ├── worker/          # Background Tasks
│   │   │   │       │   └── SyncWorker.kt
│   │   │   │       └── service/         # Services
│   │   │   │           └── EmployeeTrackerMessagingService.kt
│   │   │   ├── res/                     # Resources
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── colors.xml
│   │   │   │   │   └── dimens.xml
│   │   │   │   └── drawable/            # Add icons here
│   │   │   └── AndroidManifest.xml      # App manifest
│   ├── settings.gradle.kts              # Gradle configuration
│   └── gradle.properties                # Build properties
├── build.gradle.kts                     # Root gradle configuration
└── README.md                            # This file
```

## Setup Instructions

### Prerequisites
- Android Studio (latest version)
- Android SDK 34+
- Kotlin 1.9+
- Gradle 8.1+
- Firebase project setup
- Google Play Services configured

###Installation

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd Android
   ```

2. **Configure Firebase**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Create a new project or use existing one
   - Download `google-services.json`
   - Place it in `app/` directory
   - Enable Authentication, Firestore, Cloud Messaging

3. **Build Configuration**
   - Open `local.properties` and ensure Android SDK path is correct
   - Sync Gradle files (File → Sync Now)

4. **Build the Project**
   ```bash
   ./gradlew build
   ```

5. **Run on Emulator or Device**
   ```bash
   ./gradlew installDebug
   ```

## API Integration

### Backend Base URL
- Default: `http://localhost:3001/api`
- Configurable in Settings screen

### Authentication Flow

1. **Firebase Email/Password Sign-In**
   ```kotlin
   firebaseAuthHelper.signIn(email, password)
   ```

2. **Token Exchange**
   ```
   POST /api/auth/firebase-token
   Body: { "idToken": "firebase-id-token" }
   ```

3. **Subsequent Requests**
   - JWT token attached via OkHttp interceptor
   - Header: `Authorization: Bearer <jwt-token>`

### Available Endpoints

#### Attendance
- `POST /api/mobile-attendance/checkin` - Record check-in/out
- `GET /api/mobile-attendance/branch-info` - Get current branch geofence
- `GET /api/mobile-attendance/my-history` - Fetch attendance records
- `GET /api/mobile-attendance/admin/devices` - List devices (admin)
- `DELETE /api/mobile-attendance/admin/devices/{id}` - Delete device (admin)

#### Device Management
- `POST /api/mobile-attendance/register-device` - Register device
- `PATCH /api/mobile-attendance/device-heartbeat/{id}` - Update device status

#### Settings
- `POST /api/auth/firebase-token` - Exchange tokens

## Features

### Core Functionality

#### 1. **Authentication**
- Firebase Email/Password authentication
- JWT token-based API access
- Biometric login support
- Automatic token refresh

#### 2. **Attendance Tracking**
- Real-time GPS location tracking
- Geofence-based check-in validation
- Mock location detection via Play Integrity API
- Distance calculation using Haversine formula
- Offline check-in with automatic sync

#### 3. **Offline Support**
- Local Room database for pending records
- Automatic sync when network is restored
- WorkManager for periodic sync (15-minute intervals)
- Network status monitoring

#### 4. **Device Management**
- Device registration with backend
- Device heartbeat updates
- Admin view of registered devices
- Remote device management

#### 5. **User Interface**
- Material3 design
- Dark mode support
- Responsive Compose layouts
- Bottom navigation with 4 main screens

### Screens

#### Login Screen
- Email/password input
- Firebase authentication
- Password reset functionality
- Sign-up link

#### Home Screen (Dashboard)
- Branch geofence map display
- Real-time distance to branch
- Check-in/out buttons
- Today's attendance summary
- Location status indicator

#### History Screen
- Attendance records list
- Date range filtering (Today, Week, Month, Custom)
- Record details view
- Pagination support

#### Profile Screen
- User information display
- Profile editing
- Biometric authentication toggle
- User preferences

#### Settings Screen
- API URL configuration
- Sync interval adjustment (5-120 minutes)
- Notifications toggle
- Offline storage info
- Last sync timestamp

## Configuration

### API URL Setup
Settings → API Settings → Enter Backend URL

Example:
```
http://192.168.1.100:3001/api
```

### Sync Configuration
Settings → Synchronization Settings → Set Interval (minutes)

### Preferences
- Notifications: Toggle push notifications
- Biometric: Enable/disable fingerprint login
- Storage: View offline data size

## Security Features

1. **Location Validation**
   - Play Integrity API for device attestation
   - Mock location detection
   - Haversine distance verification

2. **Data Security**
   - EncryptedSharedPreferences for sensitive data
   - HTTPS for all API communications
   - JWT token-based authentication

3. **Device Security**
   - Device binding and registration
   - Device ID generation
   - Biometric authentication support

4. **Code Protection**
   - ProGuard/R8 obfuscation in release builds
   - Sensitive logs removed in production

## Testing

### Unit Tests
```bash
./gradlew test
```

### Instrumentation Tests
```bash
./gradlew connectedAndroidTest
```

### Build APK
```bash
./gradlew assembleDebug    # Debug APK
./gradlew assembleRelease  # Release APK
```

## Troubleshooting

### Build Issues

**Gradle Sync Fails**
- Delete `.gradle` and `build` folders
- File → Invalidate Caches/Restart
- Try syncing again

**Firebase Missing**
- Verify `google-services.json` is in `app/` directory
- Check Firebase project is active
- Rebuild project

### Runtime Issues

**Location Permission Denied**
- Settings → Apps → EmployeeTracker → Permissions → Location → Allow
- Ensure location is enabled on device
- High accuracy location mode required

**API Connection Errors**
- Verify backend is running
- Check API URL in Settings
- Test with `http://localhost:3001/api` on emulator or correct IP on device
- Ensure device/emulator has internet access

**Mock Location Detected**
- Disable mock location in Developer Options
- Some emulators may trigger this
- Use Play Store build of Google Play Services

**Sync Not Working**
- Check internet connection
- Verify API URL is correct
- Check WorkManager logs: `adb logcat | grep WorkManager`

## Development

### Adding New Features

1. **Create Use Cases**
   ```kotlin
   class MyUseCase(private val repository: MyRepository) {
       suspend operator fun invoke(...): Result { ... }
   }
   ```

2. **Create ViewModel**
   ```kotlin
   @HiltViewModel
   class MyViewModel @Inject constructor(
       private val useCase: MyUseCase
   ) : ViewModel() { ... }
   ```

3. **Create UI Screen**
   ```kotlin
   @Composable
   fun MyScreen(viewModel: MyViewModel) {
       val state by viewModel.state.collectAsState()
       // UI implementation
   }
   ```

4. **Add to Navigation**
   ```kotlin
   composable(route = "my_route") {
       MyScreen(viewModel = hiltViewModel())
   }
   ```

### Logging
Uses Timber for logging. Logs filtered by tag:
```bash
adb logcat | grep "EmployeeTrackerApplication"
```

### Database Migration
Room auto-migrates schema. To add columns:
```kotlin
@Entity
data class MyEntity(
    // ... existing fields
    @ColumnInfo(name = "new_field")
    val newField: String? = null  // Nullable for migration
)
```

## Performance Optimization

- **Location Updates**: 5-second intervals with high accuracy
- **Sync Interval**: 15 minutes (configurable)
- **Database**: Indexes on frequently queried columns
- **Images**: Lazy loading in Compose
- **Networking**: Connection pooling with OkHttp

## Version History

- **v1.0.0** - Initial release with core features

##  Contributing

Follow these guidelines:
1. Create feature branch: `git checkout -b feature/xyz`
2. Implement feature with tests
3. Commit with descriptive message
4. Submit pull request

## License

[Your License Here]

## Support

For issues and support:
- Create GitHub issue
- Contact dev team
- Check documentation in `/Ai_prompt` directory

---

**Last Updated**: 2025-01-XX  
**Min SDK**: 24  
**Target SDK**: 34  
**Build Tools**: 34.0.0
