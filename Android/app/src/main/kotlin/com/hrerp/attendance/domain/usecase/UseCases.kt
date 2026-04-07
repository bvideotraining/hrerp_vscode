package com.hrerp.attendance.domain.usecase

import com.hrerp.attendance.data.local.PendingCheckinEntity
import com.hrerp.attendance.data.remote.api.EmployeeTrackerApi
import com.hrerp.attendance.data.remote.api.LeaveResponse
import com.hrerp.attendance.data.remote.api.MobileCheckinDto
import com.hrerp.attendance.data.remote.api.MobileAttendanceRecord
import com.hrerp.attendance.data.remote.api.VerifyEmployeeCodeData
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import com.hrerp.attendance.data.remote.repositories.DeviceRepository
import com.hrerp.attendance.data.remote.repositories.LeaveRepository
import com.hrerp.attendance.util.DeviceUtils
import com.hrerp.attendance.util.MockLocationDetector
import retrofit2.HttpException
import timber.log.Timber
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.PI
import javax.inject.Inject

class ValidateLocationUseCase @Inject constructor(
    private val mockLocationDetector: MockLocationDetector
) {
    suspend operator fun invoke(
        latitude: Double,
        longitude: Double,
        branchLat: Double,
        branchLng: Double,
        radiusMeters: Float
    ): LocationValidationResult {
        // Check for mock location
        if (mockLocationDetector.isFromMockProvider()) {
            Timber.w("Mock location detected")
            return LocationValidationResult.MockLocationDetected
        }

        // Verify with Play Integrity
        val integrityResult = mockLocationDetector.verifyIntegrity()
        if (!integrityResult) {
            Timber.w("Device integrity check failed")
            return LocationValidationResult.IntegrityCheckFailed
        }

        // Calculate distance using Haversine formula
        val distance = calculateDistance(latitude, longitude, branchLat, branchLng)
        
        return if (distance <= radiusMeters) {
            Timber.d("Location valid. Distance: $distance meters, Radius: $radiusMeters")
            LocationValidationResult.Valid(distance)
        } else {
            Timber.d("Location outside radius. Distance: $distance meters, Radius: $radiusMeters")
            LocationValidationResult.OutOfRange(distance)
        }
    }

    private fun calculateDistance(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ): Float {
        val earthRadius = 6371000.0 // Radius of the earth in meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2) * sin(dLat / 2) +
                cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) *
                sin(dLon / 2) * sin(dLon / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1.0 - a))
        return (earthRadius * c).toFloat()
    }
}

sealed class LocationValidationResult {
    data class Valid(val distanceMeters: Float) : LocationValidationResult()
    data class OutOfRange(val distanceMeters: Float) : LocationValidationResult()
    object MockLocationDetected : LocationValidationResult()
    object IntegrityCheckFailed : LocationValidationResult()
}

class PerformCheckInUseCase @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val validateLocationUseCase: ValidateLocationUseCase,
    private val deviceUtils: DeviceUtils,
    private val appPreferences: com.hrerp.attendance.util.AppPreferences
) {
    suspend operator fun invoke(
        latitude: Double,
        longitude: Double,
        branchLat: Double,
        branchLng: Double,
        branchId: String,
        radiusMeters: Float,
        attendanceType: String
    ): CheckInResult {
        return try {
            // Validate location first
            val locationValidation = validateLocationUseCase(
                latitude, longitude, branchLat, branchLng, radiusMeters
            )

            when (locationValidation) {
                is LocationValidationResult.OutOfRange -> {
                    Timber.d("Check-in outside geofence")
                    CheckInResult.OutOfGeofence(locationValidation.distanceMeters)
                }
                is LocationValidationResult.MockLocationDetected -> {
                    Timber.w("Check-in with mock location")
                    CheckInResult.MockLocationDetected
                }
                is LocationValidationResult.IntegrityCheckFailed -> {
                    Timber.w("Check-in integrity check failed")
                    CheckInResult.IntegrityCheckFailed
                }
                is LocationValidationResult.Valid -> {
                    // Perform check-in
                    val employeeId = appPreferences.getEmployeeId() ?: appPreferences.getUserId() ?: ""
                    val dto = MobileCheckinDto(
                        employeeId = employeeId,
                        branchId = branchId,
                        type = attendanceType,
                        latitude = latitude,
                        longitude = longitude,
                        deviceId = deviceUtils.generateDeviceId(),
                        isMockLocation = false,
                        timestamp = System.currentTimeMillis()
                    )

                    val response = attendanceRepository.mobileCheckin(dto)
                    Timber.d("Check-in successful: ${response.message}")
                    CheckInResult.Success(response.data?.id ?: "", locationValidation.distanceMeters)
                }
            }
        } catch (e: Exception) {
            Timber.e(e, "Check-in failed with exception")
            CheckInResult.Error(parseErrorMessage(e))
        }
    }

    private fun parseErrorMessage(e: Exception): String {
        if (e is HttpException) {
            try {
                val body = e.response()?.errorBody()?.string() ?: ""
                val json = org.json.JSONObject(body)
                val msg = json.optString("message", "")
                if (msg.isNotEmpty()) {
                    return when {
                        msg.contains("Already checked in", ignoreCase = true) -> "You have already checked in today"
                        msg.contains("No check-in record", ignoreCase = true) -> "You have not checked in yet today"
                        msg.contains("Must check in before", ignoreCase = true) -> "Please check in before checking out"
                        msg.contains("outside", ignoreCase = true) || msg.contains("from the branch", ignoreCase = true) -> msg
                        else -> msg
                    }
                }
            } catch (_: Exception) {}
        }
        return e.message ?: "Unknown error"
    }
}

sealed class CheckInResult {
    data class Success(val recordId: String, val distanceMeters: Float) : CheckInResult()
    data class OutOfGeofence(val distanceMeters: Float) : CheckInResult()
    object MockLocationDetected : CheckInResult()
    object IntegrityCheckFailed : CheckInResult()
    data class Error(val message: String) : CheckInResult()
}

class SyncPendingCheckinsUseCase @Inject constructor(
    private val attendanceRepository: AttendanceRepository
) {
    suspend operator fun invoke(): SyncResult {
        return try {
            Timber.d("Starting sync of pending checkins")
            attendanceRepository.syncPendingCheckins()
            Timber.d("Sync completed successfully")
            SyncResult.Success
        } catch (e: Exception) {
            Timber.e(e, "Sync failed")
            SyncResult.Error(e.message ?: "Sync failed")
        }
    }
}

sealed class SyncResult {
    object Success : SyncResult()
    data class Error(val message: String) : SyncResult()
}

class VerifyEmployeeCodeUseCase @Inject constructor(
    private val api: EmployeeTrackerApi
) {
    suspend operator fun invoke(code: String): VerifyEmployeeCodeData {
        val response = api.verifyEmployeeCode(mapOf("employeeCode" to code))
        if (!response.success || response.data == null) throw Exception("Employee code not found")
        return response.data
    }
}

class RegisterDeviceUseCase @Inject constructor(
    private val deviceRepository: DeviceRepository,
    private val deviceUtils: DeviceUtils
) {
    suspend operator fun invoke(fcmToken: String): DeviceRegistrationResult {
        return try {
            Timber.d("Registering device")
            val deviceId = deviceUtils.generateDeviceId()
            val response = deviceRepository.registerDevice(
                deviceId = deviceId,
                deviceName = deviceUtils.getDeviceName(),
                osVersion = deviceUtils.getOsVersion(),
                fcmToken = fcmToken
            )
            Timber.d("Device registered successfully")
            DeviceRegistrationResult.Success(deviceId)
        } catch (e: Exception) {
            Timber.e(e, "Device registration failed")
            DeviceRegistrationResult.Error(e.message ?: "Registration failed")
        }
    }
}

sealed class DeviceRegistrationResult {
    data class Success(val deviceId: String) : DeviceRegistrationResult()
    data class Error(val message: String) : DeviceRegistrationResult()
}

class GetAttendanceHistoryUseCase @Inject constructor(
    private val attendanceRepository: AttendanceRepository
) {
    suspend operator fun invoke(
        startDate: Long,
        endDate: Long
    ): AttendanceHistoryResult {
        return try {
            Timber.d("Fetching attendance history")
            val history = attendanceRepository.getMyHistory(startDate, endDate)
            AttendanceHistoryResult.Success(history)
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch attendance history")
            AttendanceHistoryResult.Error(e.message ?: "Failed to fetch history")
        }
    }
}

sealed class AttendanceHistoryResult {
    data class Success(val records: List<MobileAttendanceRecord>) : AttendanceHistoryResult()
    data class Error(val message: String) : AttendanceHistoryResult()
}

class SavePendingCheckinUseCase @Inject constructor(
    private val attendanceRepository: AttendanceRepository
) {
    suspend operator fun invoke(
        type: String,
        latitude: Double,
        longitude: Double,
        deviceId: String,
        isMockLocation: Boolean
    ): SavePendingResult {
        return try {
            val entity = PendingCheckinEntity(
                type = type,
                latitude = latitude,
                longitude = longitude,
                deviceId = deviceId,
                isMockLocation = isMockLocation,
                timestamp = System.currentTimeMillis().toString(),
                status = "PENDING"
            )
            attendanceRepository.savePendingCheckin(entity)
            Timber.d("Pending check-in saved")
            SavePendingResult.Success
        } catch (e: Exception) {
            Timber.e(e, "Failed to save pending check-in")
            SavePendingResult.Error(e.message ?: "Save failed")
        }
    }
}

sealed class SavePendingResult {
    object Success : SavePendingResult()
    data class Error(val message: String) : SavePendingResult()
}

class GetMyLeavesUseCase @Inject constructor(
    private val leaveRepository: LeaveRepository
) {
    suspend operator fun invoke(): List<LeaveResponse> = leaveRepository.getMyLeaves()
}

class CreateLeaveUseCase @Inject constructor(
    private val leaveRepository: LeaveRepository
) {
    suspend operator fun invoke(
        leaveType: String,
        startDate: String,
        endDate: String,
        totalDays: Double,
        reason: String
    ): LeaveResponse = leaveRepository.createLeave(leaveType, startDate, endDate, totalDays, reason)
}

class DeleteLeaveUseCase @Inject constructor(
    private val leaveRepository: LeaveRepository
) {
    suspend operator fun invoke(id: String) = leaveRepository.deleteLeave(id)
}
