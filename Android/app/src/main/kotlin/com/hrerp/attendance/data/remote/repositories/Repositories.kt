package com.hrerp.attendance.data.remote.repositories

import com.hrerp.attendance.data.local.AttendanceDatabase
import com.hrerp.attendance.data.local.PendingCheckinEntity
import com.hrerp.attendance.data.remote.api.*
import com.hrerp.attendance.data.remote.firebase.FirebaseAuthHelper
import com.hrerp.attendance.util.AppPreferences
import com.hrerp.attendance.util.DeviceUtils
import com.hrerp.attendance.util.LocationHelper
import com.hrerp.attendance.util.MockLocationDetector
import timber.log.Timber
import javax.inject.Inject

class AuthRepository @Inject constructor(
    private val api: EmployeeTrackerApi,
    private val firebaseAuthHelper: FirebaseAuthHelper,
    private val prefs: AppPreferences,
    private val deviceUtils: DeviceUtils
) {

    suspend fun loginWithEmail(email: String, password: String): AuthResponse {
        return try {
            val response = api.login(LoginRequest(email, password))
            saveUserData(response)
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to login")
            throw e
        }
    }

    suspend fun signupWithEmail(email: String, password: String, fullName: String, employeeCode: String? = null, employeeId: String? = null): AuthResponse {
        return try {
            val response = api.signup(SignupRequest(email, password, fullName, employeeCode, employeeId))
            saveUserData(response)
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to signup")
            throw e
        }
    }

    suspend fun exchangeFirebaseToken(idToken: String? = null): TokenExchangeResponse {
        return try {
            val token = idToken ?: firebaseAuthHelper.getIdToken(forceRefresh = true)
            val response = api.exchangeFirebaseToken(ExchangeTokenDto(token))
            response.data?.jwtToken?.let { prefs.setToken(it) }
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to exchange Firebase token")
            throw e
        }
    }

    suspend fun logout() {
        try {
            firebaseAuthHelper.logout()
            prefs.clearAll()
            Timber.d("User logged out")
        } catch (e: Exception) {
            Timber.e(e, "Failed to logout")
        }
    }

    fun isUserLoggedIn(): Boolean {
        return firebaseAuthHelper.isUserLoggedIn() && prefs.getJwtToken() != null
    }

    suspend fun getProfile(): ProfileResponse {
        return try {
            api.getProfile()
        } catch (e: Exception) {
            Timber.e(e, "Failed to get profile")
            throw e
        }
    }

    private fun saveUserData(response: AuthResponse) {
        prefs.saveUserId(response.id)
        prefs.saveUserEmail(response.email)
        prefs.saveUserFullName(response.fullName)
        prefs.saveUserRole(response.role)
        response.employeeId?.let { prefs.saveEmployeeId(it) }
        Timber.d("User data saved: ${response.email}")
    }

    suspend fun resetPassword(email: String) {
        firebaseAuthHelper.resetPassword(email)
    }
}

class AttendanceRepository @Inject constructor(
    private val api: EmployeeTrackerApi,
    private val database: AttendanceDatabase,
    private val locationHelper: LocationHelper,
    private val mockLocationDetector: MockLocationDetector,
    private val prefs: AppPreferences,
    private val deviceUtils: DeviceUtils
) {

    suspend fun checkin(branchId: String): CheckinResponse {
        return try {
            val employeeId = prefs.getEmployeeId()
                ?: throw Exception("Employee ID not found")
            val location = locationHelper.getCurrentLocation()
                ?: throw Exception("Location not available")

            val isMock = mockLocationDetector.isMockLocation(location)

            val request = CheckinRequest(
                employeeId = employeeId,
                branchId = branchId,
                latitude = location.latitude,
                longitude = location.longitude,
                type = "check-in",
                deviceId = deviceUtils.getOrGenerateDeviceId(),
                accuracy = location.accuracy
            )

            api.checkin(request)
        } catch (e: Exception) {
            Timber.e(e, "Failed to checkin online, saving to queue")
            savePendingCheckin(PendingCheckinEntity(
                type = "check-in",
                branchId = branchId,
                latitude = 0.0,
                longitude = 0.0,
                deviceId = deviceUtils.getOrGenerateDeviceId(),
                timestamp = System.currentTimeMillis().toString()
            ))
            throw e
        }
    }

    suspend fun checkout(branchId: String): CheckinResponse {
        return try {
            val employeeId = prefs.getEmployeeId()
                ?: throw Exception("Employee ID not found")
            val location = locationHelper.getCurrentLocation()
                ?: throw Exception("Location not available")

            val request = CheckinRequest(
                employeeId = employeeId,
                branchId = branchId,
                latitude = location.latitude,
                longitude = location.longitude,
                type = "check-out",
                deviceId = deviceUtils.getOrGenerateDeviceId(),
                accuracy = location.accuracy
            )

            api.checkin(request)
        } catch (e: Exception) {
            Timber.e(e, "Failed to checkout online, saving to queue")
            savePendingCheckin(PendingCheckinEntity(
                type = "check-out",
                branchId = branchId,
                latitude = 0.0,
                longitude = 0.0,
                deviceId = deviceUtils.getOrGenerateDeviceId(),
                timestamp = System.currentTimeMillis().toString()
            ))
            throw e
        }
    }

    suspend fun getTodayAttendance(): TodayAttendanceResponse {
        val employeeId = prefs.getEmployeeId() ?: prefs.getUserId()
            ?: throw Exception("Employee ID not found")
        return api.getTodayAttendance(employeeId)
    }

    suspend fun mobileCheckin(dto: MobileCheckinDto): MobileAttendanceResponse {
        return try {
            val response = api.mobileCheckin(dto)
            Timber.d("Mobile checkin successful")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to perform mobile checkin")
            // Save to local database for offline sync
            val employeeId = prefs.getEmployeeId() ?: ""
            val pendingEntity = PendingCheckinEntity(
                type = dto.type,
                employeeId = employeeId,
                branchId = "",
                latitude = dto.latitude,
                longitude = dto.longitude,
                deviceId = dto.deviceId,
                isMockLocation = dto.isMockLocation,
                timestamp = dto.timestamp.toString(),
                status = "PENDING"
            )
            savePendingCheckin(pendingEntity)
            throw e
        }
    }

    suspend fun getMyHistory(startDate: Long, endDate: Long): List<MobileAttendanceRecord> {
        return try {
            val response = api.getMyHistory(
                startDate.toString(),
                endDate.toString()
            )
            Timber.d("Fetched ${response.size} attendance records")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch attendance history")
            throw e
        }
    }

    suspend fun savePendingCheckin(entity: PendingCheckinEntity) {
        try {
            database.pendingCheckinDao().insert(entity)
            Timber.d("Pending checkin saved locally")
        } catch (e: Exception) {
            Timber.e(e, "Failed to save pending checkin")
            throw e
        }
    }

    suspend fun getPendingCheckins(): List<PendingCheckinEntity> {
        return try {
            database.pendingCheckinDao().getPendingCheckins()
        } catch (e: Exception) {
            Timber.e(e, "Failed to get pending checkins")
            emptyList()
        }
    }

    suspend fun syncPendingCheckins() {
        val pending = getPendingCheckins()
        Timber.d("Syncing ${pending.size} pending checkins")

        for (entity in pending) {
            try {
                val dto = MobileCheckinDto(
                    employeeId = entity.employeeId ?: "",
                    branchId = entity.branchId ?: "",
                    type = entity.type,
                    latitude = entity.latitude,
                    longitude = entity.longitude,
                    deviceId = entity.deviceId,
                    isMockLocation = entity.isMockLocation,
                    timestamp = entity.timestamp.toLongOrNull() ?: System.currentTimeMillis()
                )

                api.mobileCheckin(dto)
                // Remove synced record from local database
                database.pendingCheckinDao().delete(entity)
                Timber.d("Synced checkin: ${entity.id}")
            } catch (e: Exception) {
                Timber.e(e, "Failed to sync checkin: ${entity.id}")
            }
        }
    }

    suspend fun getPendingCheckinsCount(): Int {
        return database.pendingCheckinDao().getPendingCount()
    }

    suspend fun getMembers(): List<MemberResponse> {
        return try {
            val result = api.getAdminMembers()
            Timber.d("Fetched ${result.size} members")
            result
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch members")
            throw e
        }
    }
}

class BranchRepository @Inject constructor(
    private val api: EmployeeTrackerApi,
    private val database: AttendanceDatabase
) {

    suspend fun getBranchInfo(): BranchInfoResponse {
        return try {
            val response = api.getBranchInfo()
            Timber.d("Fetched branch info: ${response.data?.name}")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch branch info")
            throw e
        }
    }

    suspend fun getMyBranches(): List<com.hrerp.attendance.data.remote.api.BranchAssignment> {
        return try {
            val branches = api.getMyBranches()
            Timber.d("Fetched ${branches.size} assigned branches")
            branches
        } catch (e: Exception) {
            Timber.w(e, "Failed to fetch assigned branches, falling back to branch-info")
            // Fallback: use the single assigned branch
            try {
                val info = api.getBranchInfo()
                val d = info.data ?: return emptyList()
                listOf(
                    com.hrerp.attendance.data.remote.api.BranchAssignment(
                        branchId = d.id,
                        branchName = d.name,
                        employeeCode = "",
                        isPrimary = true,
                        latitude = d.latitude,
                        longitude = d.longitude,
                        radiusMeters = d.radiusMeters,
                        address = d.address
                    )
                )
            } catch (e2: Exception) {
                Timber.e(e2, "Fallback branch-info also failed")
                emptyList()
            }
        }
    }

    suspend fun getActiveBranches(): List<BranchInfo> {
        return try {
            val branches = api.getActiveBranches()
            // Cache branches locally
            database.branchDao().deleteAll()
            branches.forEach { branch ->
                database.branchDao().insert(
                    com.hrerp.attendance.data.local.BranchEntity(
                        id = branch.id,
                        code = branch.code,
                        name = branch.name,
                        latitude = branch.latitude,
                        longitude = branch.longitude,
                        radius = branch.radius ?: 50,
                        isActive = branch.isActive
                    )
                )
            }
            Timber.d("Loaded and cached ${branches.size} branches")
            branches
        } catch (e: Exception) {
            Timber.e(e, "Failed to load branches, using cache")
            database.branchDao().getActiveBranches().map { entity ->
                BranchInfo(
                    id = entity.id,
                    code = entity.code,
                    name = entity.name,
                    latitude = entity.latitude,
                    longitude = entity.longitude,
                    radius = entity.radius,
                    isActive = entity.isActive
                )
            }
        }
    }

    suspend fun getBranchById(branchId: String): BranchInfo? {
        return try {
            api.getActiveBranches().find { it.id == branchId }
        } catch (e: Exception) {
            database.branchDao().getBranchById(branchId)?.let {
                BranchInfo(
                    id = it.id,
                    code = it.code,
                    name = it.name,
                    latitude = it.latitude,
                    longitude = it.longitude,
                    radius = it.radius,
                    isActive = it.isActive
                )
            }
        }
    }
}

class DeviceRepository @Inject constructor(
    private val api: EmployeeTrackerApi,
    private val prefs: AppPreferences,
    private val deviceUtils: DeviceUtils
) {

    suspend fun registerDevice(
        deviceId: String,
        deviceName: String,
        osVersion: String,
        fcmToken: String? = null
    ): RegisterDeviceResponse {
        return try {
            val request = RegisterDeviceDto(
                deviceId = deviceId,
                deviceName = deviceName,
                osVersion = osVersion,
                fcmToken = fcmToken,
                employeeId = prefs.getEmployeeId() ?: "",
                deviceModel = deviceUtils.getDeviceModel()
            )
            val response = api.registerDevice(request)
            Timber.d("Device registered: $deviceId")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to register device")
            throw e
        }
    }

    suspend fun getDeviceHeartbeat(deviceId: String): HeartbeatResponse {
        return try {
            val response = api.updateDeviceHeartbeat(deviceId)
            Timber.d("Device heartbeat updated: $deviceId")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to update device heartbeat")
            throw e
        }
    }

    suspend fun getAllDevices(): List<MobileDeviceResponse> {
        return try {
            val response = api.getAllDevices()
            Timber.d("Fetched ${response.size} devices")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to fetch devices")
            throw e
        }
    }

    suspend fun deleteDevice(deviceId: String): DeleteResponse {
        return try {
            val response = api.deleteDevice(deviceId)
            Timber.d("Device deleted: $deviceId")
            response
        } catch (e: Exception) {
            Timber.e(e, "Failed to delete device")
            throw e
        }
    }
}

class LeaveRepository @Inject constructor(
    private val api: EmployeeTrackerApi,
    private val prefs: AppPreferences
) {
    suspend fun getMyLeaves(): List<LeaveResponse> {
        val employeeId = prefs.getEmployeeId() ?: throw Exception("Employee ID not found")
        return api.getMyLeaves(employeeId)
    }

    suspend fun createLeave(
        leaveType: String,
        startDate: String,
        endDate: String,
        totalDays: Double,
        reason: String
    ): LeaveResponse {
        val employeeId = prefs.getEmployeeId() ?: throw Exception("Employee ID not found")
        val employeeName = prefs.getUserFullName() ?: ""
        val dto = CreateLeaveRequest(
            employeeId = employeeId,
            employeeName = employeeName,
            leaveType = leaveType,
            startDate = startDate,
            endDate = endDate,
            totalDays = totalDays,
            reason = reason
        )
        return api.createLeave(dto)
    }

    suspend fun deleteLeave(id: String): DeleteResponse {
        return api.deleteLeave(id)
    }
}
