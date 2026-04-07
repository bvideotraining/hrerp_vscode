package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.api.MemberResponse
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class MembersUiState(
    val isLoading: Boolean = false,
    val members: List<MemberResponse> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class MembersViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(MembersUiState())
    val uiState: StateFlow<MembersUiState> = _uiState

    init {
        loadMembers()
    }

    fun loadMembers() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                val members = attendanceRepository.getMembers()
                _uiState.value = _uiState.value.copy(isLoading = false, members = members)
                Timber.d("Loaded ${members.size} members")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load members")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load members"
                )
            }
        }
    }
}
