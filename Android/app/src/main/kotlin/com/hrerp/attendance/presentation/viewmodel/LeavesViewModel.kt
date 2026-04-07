package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.api.LeaveResponse
import com.hrerp.attendance.domain.usecase.CreateLeaveUseCase
import com.hrerp.attendance.domain.usecase.DeleteLeaveUseCase
import com.hrerp.attendance.domain.usecase.GetMyLeavesUseCase
import com.hrerp.attendance.util.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class LeavesUiState(
    val isLoading: Boolean = false,
    val leaves: List<LeaveResponse> = emptyList(),
    val error: String? = null,
    val successMessage: String? = null,
    val isSubmitting: Boolean = false,
    val isSessionExpired: Boolean = false
)

@HiltViewModel
class LeavesViewModel @Inject constructor(
    private val getMyLeavesUseCase: GetMyLeavesUseCase,
    private val createLeaveUseCase: CreateLeaveUseCase,
    private val deleteLeaveUseCase: DeleteLeaveUseCase,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(LeavesUiState())
    val uiState: StateFlow<LeavesUiState> = _uiState

    init {
        loadLeaves()
    }

    fun loadLeaves() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                val leaves = getMyLeavesUseCase()
                _uiState.value = _uiState.value.copy(isLoading = false, leaves = leaves)
                Timber.d("Loaded ${leaves.size} leave records")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load leaves")
                val isAuth = e.message?.contains("401") == true
                    || e.message?.contains("Unauthorized", ignoreCase = true) == true
                if (isAuth) appPreferences.clearJwtToken()
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load leaves",
                    isSessionExpired = isAuth
                )
            }
        }
    }

    fun createLeave(
        leaveType: String,
        startDate: String,
        endDate: String,
        totalDays: Double,
        reason: String,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSubmitting = true, error = null)
                createLeaveUseCase(leaveType, startDate, endDate, totalDays, reason)
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    successMessage = "Leave request submitted successfully"
                )
                Timber.d("Leave request created")
                loadLeaves()
                onSuccess()
            } catch (e: Exception) {
                Timber.e(e, "Failed to create leave")
                val isAuth = e.message?.contains("401") == true
                    || e.message?.contains("Unauthorized", ignoreCase = true) == true
                if (isAuth) appPreferences.clearJwtToken()
                _uiState.value = _uiState.value.copy(
                    isSubmitting = false,
                    error = e.message ?: "Failed to submit leave request",
                    isSessionExpired = isAuth
                )
            }
        }
    }

    fun deleteLeave(id: String) {
        viewModelScope.launch {
            try {
                deleteLeaveUseCase(id)
                _uiState.value = _uiState.value.copy(
                    successMessage = "Leave request cancelled"
                )
                loadLeaves()
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete leave")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to cancel leave request"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(error = null, successMessage = null, isSessionExpired = false)
    }
}
