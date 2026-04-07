package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.api.MobileCheckinDto
import com.hrerp.attendance.data.remote.api.BranchAssignment
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import com.hrerp.attendance.data.remote.repositories.BranchRepository
import com.hrerp.attendance.domain.usecase.PerformCheckInUseCase
import com.hrerp.attendance.domain.usecase.ValidateLocationUseCase
import com.hrerp.attendance.domain.usecase.CheckInResult
import com.hrerp.attendance.domain.usecase.LocationValidationResult
import com.hrerp.attendance.util.LocationHelper
import com.hrerp.attendance.util.DeviceUtils
import com.hrerp.attendance.util.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class BranchInfo(
    val id: String,
    val name: String,
    val latitude: Double,
    val longitude: Double,
    val radiusMeters: Float,
    val address: String
)

data class HomeUiState(
    val isLoading: Boolean = false,
    val branchInfo: BranchInfo? = null,
    // Multi-branch support
    val assignedBranches: List<BranchAssignment> = emptyList(),
    val selectedBranch: BranchAssignment? = null,
    val branchDistances: Map<String, Float> = emptyMap(),
    val currentLocation: Pair<Double, Double>? = null,
    val distanceMeters: Float = 0f,
    val isCheckedIn: Boolean = false,
    val lastCheckinTime: Long = 0L,
    val isWithinGeofence: Boolean = false,
    val error: String? = null,
    val checkingIn: Boolean = false,
    val userEmail: String = "",
    val userName: String = "",
    val userRole: String = "employee",
    val userAccessType: String = "",
    val profileImagePath: String? = null
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val branchRepository: BranchRepository,
    private val locationHelper: LocationHelper,
    private val performCheckInUseCase: PerformCheckInUseCase,
    private val deviceUtils: DeviceUtils,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState

    init {
        // Immediately restore check-in state and user identity from local prefs (no network needed)
        _uiState.value = _uiState.value.copy(
            isCheckedIn = appPreferences.getIsCheckedIn(),
            userEmail = appPreferences.getUserEmail() ?: "",
            userName = appPreferences.getUserFullName() ?: "",
            userRole = appPreferences.getUserRole() ?: "employee",
            userAccessType = appPreferences.getUserAccessType() ?: "",
            profileImagePath = appPreferences.getProfileImagePath()
        )
        loadAssignedBranches()
        loadTodayStatus()
    }

    private fun loadTodayStatus() {
        viewModelScope.launch {
            try {
                val record = attendanceRepository.getTodayAttendance()
                val checkedIn = record.checkIn != null && record.checkOut == null
                appPreferences.saveIsCheckedIn(checkedIn)
                _uiState.value = _uiState.value.copy(isCheckedIn = checkedIn)
            } catch (e: Exception) {
                Timber.w(e, "Could not load today attendance status — using cached state")
                // Keep the prefs-restored value; don't overwrite it
            }
        }
    }

    fun refreshProfileImage() {
        val newPath = appPreferences.getProfileImagePath()
        if (newPath != _uiState.value.profileImagePath) {
            _uiState.value = _uiState.value.copy(profileImagePath = newPath)
        }
    }

    private fun loadAssignedBranches() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                val branches = branchRepository.getMyBranches()
                if (branches.isEmpty()) {
                    _uiState.value = _uiState.value.copy(isLoading = false, error = "No branches assigned to your account")
                    return@launch
                }
                _uiState.value = _uiState.value.copy(assignedBranches = branches, isLoading = false)
                Timber.d("Loaded ${branches.size} assigned branches")
                // Auto-select will run after location is available
                if (branches.size == 1) {
                    selectBranchInternal(branches[0])
                }
                updateLocation()
            } catch (e: Exception) {
                Timber.e(e, "Failed to load assigned branches")
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message ?: "Failed to load branch info")
            }
        }
    }

    /** Called from UI when the user manually picks a branch from the switcher. */
    fun selectBranch(branchId: String) {
        val branch = _uiState.value.assignedBranches.find { it.branchId == branchId } ?: return
        selectBranchInternal(branch)
    }

    private fun selectBranchInternal(branch: BranchAssignment) {
        val branchInfo = BranchInfo(
            id = branch.branchId,
            name = branch.branchName,
            latitude = branch.latitude ?: 0.0,
            longitude = branch.longitude ?: 0.0,
            radiusMeters = branch.radiusMeters,
            address = branch.address
        )
        _uiState.value = _uiState.value.copy(selectedBranch = branch, branchInfo = branchInfo)
        Timber.d("Selected branch: ${branch.branchName}")
    }

    private fun autoSelectNearestBranch() {
        val location = _uiState.value.currentLocation ?: return
        val branches = _uiState.value.assignedBranches
        if (branches.isEmpty()) return

        val distances = branches.associateBy({ it.branchId }) { branch ->
            if (branch.latitude != null && branch.longitude != null)
                calculateDistance(location.first, location.second, branch.latitude, branch.longitude)
            else Float.MAX_VALUE
        }
        _uiState.value = _uiState.value.copy(branchDistances = distances)

        // Prefer the nearest branch that is within its geofence; fallback to absolute nearest
        val withinGeofence = branches.filter { b ->
            val d = distances[b.branchId] ?: Float.MAX_VALUE
            d <= b.radiusMeters
        }
        val nearest = (withinGeofence.minByOrNull { distances[it.branchId] ?: Float.MAX_VALUE }
            ?: branches.minByOrNull { distances[it.branchId] ?: Float.MAX_VALUE })
            ?: return

        // Only switch if not manually overridden or different
        if (_uiState.value.selectedBranch?.branchId != nearest.branchId) {
            selectBranchInternal(nearest)
        }
    }

    fun updateLocation() {
        viewModelScope.launch {
            try {
                Timber.d("Updating current location")
                val location = locationHelper.getCurrentLocation()
                
                if (location != null) {
                    val currentLat = location.latitude
                    val currentLng = location.longitude

                    val branch = _uiState.value.branchInfo
                    val distToSelected = if (branch != null && branch.latitude != 0.0)
                        calculateDistance(currentLat, currentLng, branch.latitude, branch.longitude)
                    else 0f
                    val isWithin = branch != null && distToSelected <= branch.radiusMeters

                    _uiState.value = _uiState.value.copy(
                        currentLocation = Pair(currentLat, currentLng),
                        distanceMeters = distToSelected,
                        isWithinGeofence = isWithin,
                        error = null
                    )

                    // Auto-select nearest branch if multiple are assigned
                    if (_uiState.value.assignedBranches.size > 1) {
                        autoSelectNearestBranch()
                    }

                    Timber.d("Location updated. Distance to selected branch: $distToSelected meters")
                } else {
                    throw Exception("Unable to get location. Check permissions.")
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to update location")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to get location"
                )
            }
        }
    }

    fun performCheckIn(type: String) {
        if (_uiState.value.currentLocation == null || _uiState.value.branchInfo == null) {
            _uiState.value = _uiState.value.copy(
                error = "Location or branch info not available"
            )
            return
        }

        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(checkingIn = true, error = null)

                val location = _uiState.value.currentLocation!!
                val branch = _uiState.value.branchInfo!!

                Timber.d("Performing check-in: $type at branch: ${branch.name}")
                
                val result = performCheckInUseCase(
                    latitude = location.first,
                    longitude = location.second,
                    branchLat = branch.latitude,
                    branchLng = branch.longitude,
                    branchId = branch.id,
                    radiusMeters = branch.radiusMeters,
                    attendanceType = type
                )

                when (result) {
                    is CheckInResult.Success -> {
                        Timber.d("Check-in successful")
                        val newCheckedIn = type == "check-in"
                        appPreferences.saveIsCheckedIn(newCheckedIn)
                        _uiState.value = _uiState.value.copy(
                            isCheckedIn = newCheckedIn,
                            lastCheckinTime = System.currentTimeMillis(),
                            checkingIn = false,
                            error = null
                        )
                    }
                    is CheckInResult.OutOfGeofence -> {
                        Timber.w("Check-in out of geofence: ${result.distanceMeters}m")
                        _uiState.value = _uiState.value.copy(
                            checkingIn = false,
                            error = "You are ${result.distanceMeters.toInt()}m away from the branch. Please move closer."
                        )
                    }
                    is CheckInResult.MockLocationDetected -> {
                        Timber.w("Mock location detected during check-in")
                        _uiState.value = _uiState.value.copy(
                            checkingIn = false,
                            error = "Mock location detected. Check-in cannot be processed."
                        )
                    }
                    is CheckInResult.IntegrityCheckFailed -> {
                        Timber.w("Device integrity check failed")
                        _uiState.value = _uiState.value.copy(
                            checkingIn = false,
                            error = "Device integrity check failed. Check-in cannot be processed."
                        )
                    }
                    is CheckInResult.Error -> {
                        Timber.e("Check-in error: ${result.message}")
                        _uiState.value = _uiState.value.copy(
                            checkingIn = false,
                            error = result.message
                        )
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Check-in exception")
                _uiState.value = _uiState.value.copy(
                    checkingIn = false,
                    error = e.message ?: "Check-in failed"
                )
            }
        }
    }

    private fun calculateDistance(
        lat1: Double, lon1: Double,
        lat2: Double, lon2: Double
    ): Float {
        val earthRadius = 6371000.0 // meters
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2)
        val c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a))
        return (earthRadius * c).toFloat()
    }
}
