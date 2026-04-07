# Android App - API Integration Guide

Complete reference for all API endpoints used by the Employee Tracker Android app.

## Base Configuration

```kotlin
// AppModule.kt
private const val BASE_URL = "http://localhost:3001/api"  // or your backend URL
private const val API_TIMEOUT = 30  // seconds
```

## Authentication & Token Management

### 1. Firebase Sign-In → JWT Token Exchange

**Flow:**
1. User enters email/password
2. Firebase authenticates and returns idToken
3. App exchanges idToken for JWT via backend
4. JWT used for all subsequent API calls

**Step 1: Firebase Authentication (Client-side)**
```
No API call - handled by FirebaseAuth SDK
```

**Step 2: Exchange Firebase Token for JWT**

```
POST /api/auth/firebase-token

Headers:
  Content-Type: application/json

Body:
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjExYTdjZWZhNDJl..."
}

Response: 200 OK
{
  "success": true,
  "message": "Token exchanged successfully",
  "data": {
    "jwtToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh-token-value",
    "expiresIn": 3600
  }
}

Error: 401 Unauthorized
{
  "success": false,
  "message": "Invalid or expired Firebase token"
}
```

**Implementation:**
```kotlin
// AuthRepository.kt
suspend fun exchangeFirebaseToken(idToken: String): TokenExchangeResponse {
    val dto = ExchangeTokenDto(idToken)
    val response = api.exchangeFirebaseToken(dto)
    response.data?.jwtToken?.let { prefs.setToken(it) }
    return response
}
```

## Mobile Attendance Endpoints

### 2. Check-In / Check-Out

```
POST /api/mobile-attendance/checkin

Headers:
  Authorization: Bearer {jwtToken}
  Content-Type: application/json

Body:
{
  "type": "IN",                    // "IN" or "OUT"
  "latitude": 28.6139,
  "longitude": 77.2090,
  "deviceId": "DEVICE-ABC123...",
  "isMockLocation": false,
  "timestamp": 1705123456789       // milliseconds since epoch
}

Response: 200 OK
{
  "success": true,
  "message": "Check-in recorded successfully",
  "data": {
    "id": "att-uuid-1234",
    "employeeId": "emp-001",
    "type": "IN",
    "timestamp": "2025-01-13T10:30:45Z",
    "location": {
      "latitude": 28.6139,
      "longitude": 77.2090
    },
    "distance": 45.32
  }
}

Errors:
401 - Unauthorized (invalid/expired token)
400 - Bad Request (invalid data)
403 - Forbidden (not checked out from previous shift)
{
  "success": false,
  "message": "Please check out before checking in again"
}
```

**Implementation:**
```kotlin
// EmployeeTrackerApi.kt
@POST("mobile-attendance/checkin")
suspend fun mobileCheckin(@Body dto: MobileCheckinDto): MobileAttendanceResponse

// AttendanceRepository.kt
suspend fun mobileCheckin(dto: MobileCheckinDto): MobileAttendanceResponse {
    val response = api.mobileCheckin(dto)
    Timber.d("Mobile checkin successful")
    return response
}

// HomeViewModel.kt
performCheckInUseCase(
    latitude = location.first,
    longitude = location.second,
    branchLat = branch.latitude,
    branchLng = branch.longitude,
    radiusMeters = branch.radiusMeters,
    attendanceType = type  // "IN" or "OUT"
)
```

### 3. Get Branch Information

```
GET /api/mobile-attendance/branch-info

Headers:
  Authorization: Bearer {jwtToken}

Parameters: (none)

Response: 200 OK
{
  "success": true,
  "message": "Branch info fetched successfully",
  "data": {
    "id": "branch-123",
    "name": "Head Office",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "radiusMeters": 100,
    "address": "123 Business Street",
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    }
  }
}

Error: 404 Not Found
{
  "success": false,
  "message": "Branch not found"
}
```

**Implementation:**
```kotlin
// BranchRepository.kt
suspend fun getBranchInfo(): BranchInfoResponse {
    val response = api.getBranchInfo()
    Timber.d("Fetched branch info: ${response.data?.name}")
    return response
}

// HomeViewModel.kt - used on app startup
loadBranchInfo()
```

### 4. Get Attendance History

```
GET /api/mobile-attendance/my-history

Headers:
  Authorization: Bearer {jwtToken}

Query Parameters:
  ?startDate=2025-01-01&endDate=2025-01-31

Response: 200 OK
{
  "success": true,
  "message": "Attendance history retrieved",
  "data": [
    {
      "id": "att-001",
      "date": "2025-01-13",
      "checkInTime": "2025-01-13T09:30:00Z",
      "checkOutTime": "2025-01-13T17:45:00Z",
      "checkInLocation": {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "distance": 45.32
      },
      "checkOutLocation": {
        "latitude": 28.6140,
        "longitude": 77.2091,
        "distance": 48.12
      },
      "workingHours": "8h 15m",
      "status": "PRESENT"
    }
  ]
}

Error: 400 Bad Request
{
  "success": false,
  "message": "Start date must be before end date"
}
```

**Implementation:**
```kotlin
// EmployeeTrackerApi.kt
@GET("mobile-attendance/my-history")
suspend fun getMyHistory(
    @Query("startDate") startDate: String,
    @Query("endDate") endDate: String
): List<MobileAttendanceRecord>

// HistoryViewModel.kt
fun loadRecords(startDate: Long, endDate: Long) {
    val records = attendanceRepository.getMyHistory(startDate, endDate)
    // Display in calendar/table
}
```

## Device Management Endpoints

### 5. Register Device

```
POST /api/mobile-attendance/register-device

Headers:
  Authorization: Bearer {jwtToken}
  Content-Type: application/json

Body:
{
  "deviceId": "DEVICE-ABC123DEF456",
  "deviceName": "Samsung Galaxy S23",
  "osVersion": "14.0",
  "fcmToken": "eFsTNQrWrJA5VEYPsC1r1m:APA91bFz..."
}

Response: 201 Created
{
  "success": true,
  "message": "Device registered successfully",
  "data": {
    "deviceId": "DEVICE-ABC123DEF456",
    "deviceName": "Samsung Galaxy S23",
    "osVersion": "14.0",
    "registeredAt": "2025-01-13T10:30:00Z",
    "fcmToken": "eFsTNQrWrJA5VEYPsC1r1m:APA91bFz...",
    "lastHeardFrom": "2025-01-13T10:30:00Z"
  }
}

Error: 409 Conflict (device already registered)
{
  "success": false,
  "message": "Device already registered. Use heartbeat for updates."
}
```

**Implementation:**
```kotlin
// EmployeeTrackerApplication.kt (init)
// Called once on first launch
RegisterDeviceUseCase()(fcmToken = getFcmToken())

// DeviceRepository.kt
suspend fun registerDevice(
    deviceId: String,
    deviceName: String,
    osVersion: String,
    fcmToken: String?
): RegisterDeviceResponse {
    val request = RegisterDeviceDto(...)
    return api.registerDevice(request)
}
```

### 6. Device Heartbeat Update

```
PATCH /api/mobile-attendance/device-heartbeat/{deviceId}

Headers:
  Authorization: Bearer {jwtToken}

Path Parameters:
  deviceId: DEVICE-ABC123DEF456

Response: 200 OK
{
  "success": true,
  "message": "Device heartbeat updated",
  "data": {
    "deviceId": "DEVICE-ABC123DEF456",
    "lastHeardFrom": "2025-01-13T10:35:00Z",
    "status": "ACTIVE"
  }
}
```

**Implementation:**
```kotlin
// SyncWorker.kt (runs every 15 minutes)
suspend fun updateHeartbeat(deviceId: String) {
    api.updateDeviceHeartbeat(deviceId)
}
```

### 7. Get All Devices (Admin)

```
GET /api/mobile-attendance/admin/devices

Headers:
  Authorization: Bearer {jwtToken}
  Role: ADMIN (verified server-side)

Response: 200 OK
{
  "success": true,
  "message": "Devices retrieved",
  "data": [
    {
      "deviceId": "DEVICE-001",
      "employeeId": "emp-001",
      "deviceName": "Samsung S23",
      "osVersion": "14.0",
      "lastHeardFrom": "2025-01-13T10:35:00Z",
      "registeredAt": "2025-01-01T08:00:00Z",
      "status": "ACTIVE"
    }
  ]
}

Error: 403 Forbidden
{
  "success": false,
  "message": "Only admins can view devices"
}
```

### 8. Delete Device (Admin)

```
DELETE /api/mobile-attendance/admin/devices/{deviceId}

Headers:
  Authorization: Bearer {jwtToken}
  Role: ADMIN

Path Parameters:
  deviceId: DEVICE-ABC123DEF456

Response: 200 OK
{
  "success": true,
  "message": "Device deleted successfully"
}

Error: 404 Not Found
{
  "success": false,
  "message": "Device not found"
}
```

## Error Handling

### Common HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response data |
| 201 | Created | Device/record created |
| 400 | Bad Request | Fix request data |
| 401 | Unauthorized | Refresh login with Firebase |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Handle gracefully |
| 500 | Server Error | Retry after delay |

### Error Response Format

```json
{
  "success": false,
  "message": "User-friendly error message",
  "error": {
    "code": "ERROR_CODE",
    "details": "Technical details if available"
  }
}
```

**Handling in ViewModel:**
```kotlin
try {
    val result = repository.mobileCheckin(dto)
    // Success
} catch (e: HttpException) {
    when (e.code()) {
        401 -> handleUnauthorized()  // Re-login
        403 -> handleForbidden()      // Permission error
        else -> handleGenericError(e)
    }
} catch (e: IOException) {
    handleNetworkError()  // No internet
}
```

## Request/Response DTOs

### Check-In DTO
```kotlin
data class MobileCheckinDto(
    val type: String,              // "IN" or "OUT"
    val latitude: Double,
    val longitude: Double,
    val deviceId: String,
    val isMockLocation: Boolean,
    val timestamp: Long           // ms since epoch
)
```

### Token Exchange DTO
```kotlin
data class ExchangeTokenDto(
    val idToken: String            // Firebase ID token
)

data class TokenExchangeResponse(
    val success: Boolean,
    val message: String,
    val data: TokenData?
)

data class TokenData(
    val jwtToken: String,
    val refreshToken: String?,
    val expiresIn: Int            // seconds
)
```

### Register Device DTO
```kotlin
data class RegisterDeviceDto(
    val deviceId: String,
    val deviceName: String,
    val osVersion: String,
    val fcmToken: String?
)
```

## Offline Queue

When offline, check-ins are queued locally:

```kotlin
// Automatically saved to Room
database.pendingCheckinDao().insert(
    PendingCheckinEntity(
        type = "IN",
        latitude = 28.6139,
        longitude = 77.2090,
        // ... other fields
        status = "PENDING",
        timestamp = System.currentTimeMillis()
    )
)

// SyncWorker syncs every 15 minutes when online
// OR user can manually tap "Sync Now" button
```

## Testing Endpoints

### Using cURL

```bash
# Exchange Firebase token
curl -X POST http://localhost:3001/api/auth/firebase-token \
  -H "Content-Type: application/json" \
  -d '{"idToken": "firebase-token-here"}'

# Get branch info
curl -X GET http://localhost:3001/api/mobile-attendance/branch-info \
  -H "Authorization: Bearer jwt-token-here"

# Check-in
curl -X POST http://localhost:3001/api/mobile-attendance/checkin \
  -H "Authorization: Bearer jwt-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "IN",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "deviceId": "test-device",
    "isMockLocation": false,
    "timestamp": 1705123456789
  }'
```

### Using Postman

1. Create collection "HR ERP Mobile"
2. Set base URL: `{{base_url}}/api`
3. Add pre-request script for auto-token refresh
4. Create requests for each endpoint
5. Use environment variables for tokens

### App Debugging

Enable Network Inspection:
```bash
# In AppModule.kt, add logging interceptor
.addInterceptor(HttpLoggingInterceptor().apply {
    level = HttpLoggingInterceptor.Level.BODY
})
```

View logs:
```bash
adb logcat | grep "OkHttp"
```

## Rate Limiting

- Check-in: Max 1 per minute
- History fetch: Max 10 per minute
- Device heartbeat: Once every 5 minutes

Exceeded limits return 429 Too Many Requests

## Security Notes

1. **JWT Token Storage**: Encrypted SharedPreferences
2. **HTTPS**: All production endpoints must use HTTPS
3. **Device ID**: Unique per device, sent with every request
4. **Location**: Never sent unencrypted over HTTP

---

**Last Updated**: 2025-01-13  
**API Version**: 1.0.0  
**Android Min SDK**: 24  
**Target SDK**: 34
