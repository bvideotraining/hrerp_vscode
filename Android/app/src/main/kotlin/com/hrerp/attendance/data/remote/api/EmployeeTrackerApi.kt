package com.hrerp.attendance.data.remote.api

import retrofit2.http.*
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.annotations.JsonAdapter
import com.google.gson.annotations.SerializedName
import java.lang.reflect.Type
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Safely deserializes a field that the backend may return as either:
 *   - an ISO string  (backend serialized correctly)
 *   - a Firestore Timestamp object  { _seconds: N, _nanoseconds: N }
 *   - null / missing
 */
class FirestoreTimestampDeserializer : JsonDeserializer<String> {
    private val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }
    override fun deserialize(json: JsonElement, typeOfT: Type, ctx: JsonDeserializationContext): String {
        if (json.isJsonNull) return ""
        if (json.isJsonPrimitive) return json.asString
        if (json.isJsonObject) {
            val seconds = json.asJsonObject.get("_seconds")?.asLong ?: 0L
            if (seconds == 0L) return ""
            return fmt.format(Date(seconds * 1000))
        }
        return ""
    }
}

// ─── DTOs ───────────────────────────────────────────────────────────────

data class LoginRequest(
    @SerializedName("email")
    val email: String,
    @SerializedName("password")
    val password: String
)

data class SignupRequest(
    @SerializedName("email")
    val email: String,
    @SerializedName("password")
    val password: String,
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("employeeCode")
    val employeeCode: String? = null,
    @SerializedName("employeeId")
    val employeeId: String? = null
)

data class FirebaseTokenExchangeRequest(
    @SerializedName("idToken")
    val idToken: String
)

data class CheckinRequest(
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("branchId")
    val branchId: String,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
    @SerializedName("type")
    val type: String, // "check-in" or "check-out"
    @SerializedName("deviceId")
    val deviceId: String? = null,
    @SerializedName("accuracy")
    val accuracy: Float? = null
)

data class RegisterDeviceRequest(
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("fcmToken")
    val fcmToken: String? = null,
    @SerializedName("deviceModel")
    val deviceModel: String? = null,
    @SerializedName("osVersion")
    val osVersion: String? = null
)

// ─── Responses ──────────────────────────────────────────────────────────

data class AuthResponse(
    @SerializedName("id")
    val id: String,
    @SerializedName("email")
    val email: String,
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("role")
    val role: String,
    @SerializedName("accessType")
    val accessType: String,
    @SerializedName("employeeId")
    val employeeId: String? = null,
    @SerializedName("employeeCode")
    val employeeCode: String? = null,
    @SerializedName("roleName")
    val roleName: String? = null,
    @SerializedName("roleId")
    val roleId: String? = null
)

data class BranchInfo(
    @SerializedName("id")
    val id: String,
    @SerializedName("code")
    val code: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("latitude")
    val latitude: Double? = null,
    @SerializedName("longitude")
    val longitude: Double? = null,
    @SerializedName("radius")
    val radius: Int? = 50,
    @SerializedName("isActive")
    val isActive: Boolean = true
)

data class CheckinResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("type")
    val type: String,
    @SerializedName("time")
    val time: String,
    @SerializedName("distance")
    val distance: Int
)

data class TodayAttendanceResponse(
    @SerializedName("date")
    val date: String,
    @SerializedName("checkIn")
    val checkIn: String? = null,
    @SerializedName("checkOut")
    val checkOut: String? = null,
    @SerializedName("status")
    val status: String
)

data class AttendanceRecord(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("branchId")
    val branchId: String,
    @SerializedName("date")
    val date: String,
    @SerializedName("checkIn")
    val checkIn: String? = null,
    @SerializedName("checkOut")
    val checkOut: String? = null,
    @SerializedName("checkInLat")
    val checkInLat: Double? = null,
    @SerializedName("checkInLon")
    val checkInLon: Double? = null,
    @SerializedName("checkOutLat")
    val checkOutLat: Double? = null,
    @SerializedName("checkOutLon")
    val checkOutLon: Double? = null,
    @SerializedName("checkInDistance")
    val checkInDistance: Int? = null,
    @SerializedName("checkOutDistance")
    val checkOutDistance: Int? = null,
    @SerializedName("status")
    val status: String? = null,
    @SerializedName("source")
    val source: String? = "mobile"
)

data class MobileDevice(
    @SerializedName("id")
    val id: String,
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("deviceModel")
    val deviceModel: String? = null,
    @SerializedName("osVersion")
    val osVersion: String? = null,
    @SerializedName("fcmToken")
    val fcmToken: String? = null,
    @SerializedName("isActive")
    val isActive: Boolean,
    @SerializedName("registeredAt")
    val registeredAt: String? = null,
    @SerializedName("revokedAt")
    val revokedAt: String? = null
)

data class ErrorResponse(
    @SerializedName("statusCode")
    val statusCode: Int,
    @SerializedName("message")
    val message: String,
    @SerializedName("timestamp")
    val timestamp: String? = null
)

// ─── New DTOs for mobile attendance flow ────────────────────────────────

data class ExchangeTokenDto(
    @SerializedName("idToken")
    val idToken: String
)

data class TokenData(
    @SerializedName("jwtToken")
    val jwtToken: String,
    @SerializedName("refreshToken")
    val refreshToken: String? = null,
    @SerializedName("expiresIn")
    val expiresIn: Int = 3600
)

data class TokenExchangeResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("data")
    val data: TokenData? = null
)

data class User(
    val id: String,
    val email: String,
    val name: String,
    val role: String
)

data class MobileCheckinDto(
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("branchId")
    val branchId: String,
    @SerializedName("type")
    val type: String,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("isMockLocation")
    val isMockLocation: Boolean,
    @SerializedName("timestamp")
    val timestamp: Long
)

data class MobileAttendanceData(
    @SerializedName("id")
    val id: String,
    @SerializedName("type")
    val type: String,
    @SerializedName("timestamp")
    val timestamp: String,
    @SerializedName("distance")
    val distance: Float? = null
)

data class MobileAttendanceResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("data")
    val data: MobileAttendanceData? = null
)

data class MobileAttendanceRecord(
    @SerializedName("id")
    val id: String? = null,
    @SerializedName("date")
    val date: String = "",
    @SerializedName("employeeId")
    val employeeId: String = "",
    @SerializedName("branchId")
    val branchId: String = "",
    @SerializedName("checkIn")
    val checkIn: String? = null,
    @SerializedName("checkOut")
    val checkOut: String? = null,
    @SerializedName("checkInDistance")
    val checkInDistance: Int? = null,
    @SerializedName("checkOutDistance")
    val checkOutDistance: Int? = null,
    @SerializedName("status")
    val status: String? = null,
    @SerializedName("source")
    val source: String? = null
)

data class BranchInfoData(
    @SerializedName("id")
    val id: String,
    @SerializedName("name")
    val name: String,
    @SerializedName("latitude")
    val latitude: Double,
    @SerializedName("longitude")
    val longitude: Double,
    @SerializedName("radiusMeters")
    val radiusMeters: Float,
    @SerializedName("address")
    val address: String = ""
)

data class BranchInfoResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("data")
    val data: BranchInfoData? = null
)

data class BranchAssignment(
    @SerializedName("branchId")
    val branchId: String,
    @SerializedName("branchName")
    val branchName: String,
    @SerializedName("employeeCode")
    val employeeCode: String,
    @SerializedName("isPrimary")
    val isPrimary: Boolean = false,
    @SerializedName("latitude")
    val latitude: Double? = null,
    @SerializedName("longitude")
    val longitude: Double? = null,
    @SerializedName("radiusMeters")
    val radiusMeters: Float = 50f,
    @SerializedName("address")
    val address: String = ""
)

data class RegisterDeviceDto(
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("deviceName")
    val deviceName: String,
    @SerializedName("osVersion")
    val osVersion: String,
    @SerializedName("fcmToken")
    val fcmToken: String? = null,
    @SerializedName("employeeId")
    val employeeId: String = "",
    @SerializedName("deviceModel")
    val deviceModel: String? = null
)

data class VerifyEmployeeCodeData(
    @SerializedName("id")
    val id: String,
    @SerializedName("fullName")
    val fullName: String,
    @SerializedName("employeeCode")
    val employeeCode: String,
    @SerializedName("branch")
    val branch: String = "",
    @SerializedName("department")
    val department: String = "",
    @SerializedName("jobTitle")
    val jobTitle: String = "",
    @SerializedName("accountExists")
    val accountExists: Boolean = false
)

data class VerifyEmployeeCodeResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("data")
    val data: VerifyEmployeeCodeData? = null
)

data class RegisterDeviceData(
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("registeredAt")
    val registeredAt: String
)

data class RegisterDeviceResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String,
    @SerializedName("data")
    val data: RegisterDeviceData? = null
)

data class HeartbeatResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String
)

data class MobileDeviceResponse(
    @SerializedName("deviceId")
    val deviceId: String,
    @SerializedName("employeeId")
    val employeeId: String,
    @SerializedName("deviceName")
    val deviceName: String,
    @SerializedName("osVersion")
    val osVersion: String,
    @SerializedName("lastHeardFrom")
    val lastHeardFrom: String? = null,
    @SerializedName("registeredAt")
    val registeredAt: String? = null
)

data class DeleteResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("message")
    val message: String
)

data class MemberResponse(
    @SerializedName("employeeId") val employeeId: String = "",
    @SerializedName("fullName") val fullName: String = "",
    @SerializedName("email") val email: String = "",
    @SerializedName("role") val role: String = "employee",
    @SerializedName("branch") val branch: String = "",
    @SerializedName("department") val department: String = "",
    @SerializedName("jobTitle") val jobTitle: String = "",
    @SerializedName("deviceModel") val deviceModel: String = "",
    @SerializedName("osVersion") val osVersion: String = "",
    @SerializedName("registeredAt") val registeredAt: String? = null,
    @SerializedName("isActive") val isActive: Boolean = true
)

// ─── API Interface ──────────────────────────────────────────────────────

interface EmployeeTrackerApi {

    // Authentication
    @POST("/api/auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    @POST("/api/auth/signup")
    suspend fun signup(@Body request: SignupRequest): AuthResponse

    @POST("/api/auth/firebase-token")
    suspend fun exchangeFirebaseToken(@Body request: ExchangeTokenDto): TokenExchangeResponse

    @GET("/api/auth/me")
    suspend fun getProfile(): ProfileResponse

    // Legacy checkin (kept for compatibility)
    @POST("/api/mobile-attendance/checkin")
    suspend fun checkin(@Body request: CheckinRequest): CheckinResponse

    @GET("/api/mobile-attendance/today/{employeeId}")
    suspend fun getTodayAttendance(@Path("employeeId") employeeId: String): TodayAttendanceResponse

    @GET("/api/mobile-attendance/history/{employeeId}")
    suspend fun getAttendanceHistory(
        @Path("employeeId") employeeId: String,
        @Query("limit") limit: Int = 30
    ): List<AttendanceRecord>

    @GET("/api/mobile-attendance/branches")
    suspend fun getActiveBranches(): List<BranchInfo>

    // Mobile attendance (new endpoints)
    @POST("/api/mobile-attendance/mobile/checkin")
    suspend fun mobileCheckin(@Body dto: MobileCheckinDto): MobileAttendanceResponse

    @GET("/api/mobile-attendance/branch-info")
    suspend fun getBranchInfo(): BranchInfoResponse

    @GET("/api/mobile-attendance/my-branches")
    suspend fun getMyBranches(): List<BranchAssignment>

    @GET("/api/mobile-attendance/my-history")
    suspend fun getMyHistory(
        @Query("startDate") startDate: String,
        @Query("endDate") endDate: String
    ): List<MobileAttendanceRecord>

    @POST("/api/mobile-attendance/register-device")
    suspend fun registerDevice(@Body dto: RegisterDeviceDto): RegisterDeviceResponse

    @POST("/api/mobile-attendance/verify-employee-code")
    suspend fun verifyEmployeeCode(@Body body: Map<String, String>): VerifyEmployeeCodeResponse

    @PATCH("/api/mobile-attendance/device-heartbeat/{deviceId}")
    suspend fun updateDeviceHeartbeat(@Path("deviceId") deviceId: String): HeartbeatResponse

    // Admin endpoints
    @GET("/api/mobile-attendance/admin/records")
    suspend fun getAdminRecords(@Query("date") date: String? = null): List<AttendanceRecord>

    @GET("/api/mobile-attendance/admin/devices")
    suspend fun getAllDevices(): List<MobileDeviceResponse>

    @DELETE("/api/mobile-attendance/admin/devices/{deviceId}")
    suspend fun deleteDevice(@Path("deviceId") deviceId: String): DeleteResponse

    @GET("/api/mobile-attendance/admin/members")
    suspend fun getAdminMembers(): List<MemberResponse>

    // Leave endpoints
    @POST("/api/leaves")
    suspend fun createLeave(@Body dto: CreateLeaveRequest): LeaveResponse

    @GET("/api/leaves")
    suspend fun getMyLeaves(@Query("employeeId") employeeId: String): List<LeaveResponse>

    @DELETE("/api/leaves/{id}")
    suspend fun deleteLeave(@Path("id") id: String): DeleteResponse
}

// ─── PROFILE DTOs ─────────────────────────────────────────────────────────────

data class ProfileResponse(
    @SerializedName("id") val id: String = "",
    @SerializedName("email") val email: String = "",
    @SerializedName("fullName") val fullName: String = "",
    @SerializedName("role") val role: String = "",
    @SerializedName("roleName") val roleName: String = "",
    @SerializedName("employeeId") val employeeId: String = "",
    @SerializedName("employeeCode") val employeeCode: String = "",
    @SerializedName("jobTitle") val jobTitle: String = "",
    @SerializedName("accessType") val accessType: String = ""
)

// ─── LEAVE DTOs ───────────────────────────────────────────────────────────────

data class CreateLeaveRequest(
    @SerializedName("employeeId") val employeeId: String,
    @SerializedName("employeeName") val employeeName: String,
    @SerializedName("leaveType") val leaveType: String,
    @SerializedName("startDate") val startDate: String,
    @SerializedName("endDate") val endDate: String,
    @SerializedName("totalDays") val totalDays: Double,
    @SerializedName("reason") val reason: String = "",
    @SerializedName("employeeBranch") val employeeBranch: String = "",
    @SerializedName("source") val source: String = "android"
)

data class LeaveResponse(
    @SerializedName("id") val id: String,
    @SerializedName("employeeId") val employeeId: String = "",
    @SerializedName("employeeName") val employeeName: String = "",
    @SerializedName("leaveType") val leaveType: String = "",
    @SerializedName("startDate") val startDate: String = "",
    @SerializedName("endDate") val endDate: String = "",
    @SerializedName("totalDays") val totalDays: Double = 0.0,
    @SerializedName("reason") val reason: String = "",
    @SerializedName("status") val status: String = "pending",
    @SerializedName("createdAt") @JsonAdapter(FirestoreTimestampDeserializer::class)
    val createdAt: String = "",
    @SerializedName("updatedAt") @JsonAdapter(FirestoreTimestampDeserializer::class)
    val updatedAt: String = ""
)
