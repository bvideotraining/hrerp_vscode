package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.api.MobileAttendanceRecord
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import com.hrerp.attendance.util.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject

data class HistoryUiState(
    val isLoading: Boolean = false,
    val records: List<MobileAttendanceRecord> = emptyList(),
    val startDate: Long = 0L,
    val endDate: Long = 0L,
    val error: String? = null,
    val isSessionExpired: Boolean = false,
    val selectedRecord: MobileAttendanceRecord? = null,
    val isFiltering: Boolean = false
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(HistoryUiState())
    val uiState: StateFlow<HistoryUiState> = _uiState

    init {
        // Load records for the current month by default
        loadRecordsForCurrentMonth()
    }

    fun loadRecordsForCurrentMonth() {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_MONTH, 1)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startDate = calendar.timeInMillis

        calendar.set(Calendar.DAY_OF_MONTH, calendar.getActualMaximum(Calendar.DAY_OF_MONTH))
        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        val endDate = calendar.timeInMillis

        loadRecords(startDate, endDate)
    }

    fun loadRecords(startDate: Long, endDate: Long) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(
                    isLoading = true,
                    error = null,
                    startDate = startDate,
                    endDate = endDate
                )

                Timber.d("Loading attendance records from $startDate to $endDate")
                val records = attendanceRepository.getMyHistory(startDate, endDate)

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    records = records
                )
                Timber.d("Loaded ${records.size} records")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load attendance records")
                val isAuth = e.message?.contains("401") == true
                    || e.message?.contains("Unauthorized", ignoreCase = true) == true
                if (isAuth) {
                    appPreferences.clearJwtToken()
                }
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Failed to load records",
                    isSessionExpired = isAuth
                )
            }
        }
    }

    fun filterByDate(startDate: Long, endDate: Long) {
        loadRecords(startDate, endDate)
    }

    fun loadLastNDays(days: Int) {
        val calendar = Calendar.getInstance()
        val endDate = calendar.timeInMillis

        calendar.add(Calendar.DAY_OF_MONTH, -days)
        val startDate = calendar.timeInMillis

        loadRecords(startDate, endDate)
    }

    fun loadToday() {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        calendar.set(Calendar.MILLISECOND, 0)
        val startDate = calendar.timeInMillis

        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        val endDate = calendar.timeInMillis

        loadRecords(startDate, endDate)
    }

    fun loadThisWeek() {
        val calendar = Calendar.getInstance()
        calendar.set(Calendar.DAY_OF_WEEK, Calendar.MONDAY)
        calendar.set(Calendar.HOUR_OF_DAY, 0)
        calendar.set(Calendar.MINUTE, 0)
        calendar.set(Calendar.SECOND, 0)
        val startDate = calendar.timeInMillis

        calendar.set(Calendar.DAY_OF_WEEK, Calendar.SUNDAY)
        calendar.set(Calendar.HOUR_OF_DAY, 23)
        calendar.set(Calendar.MINUTE, 59)
        calendar.set(Calendar.SECOND, 59)
        val endDate = calendar.timeInMillis

        loadRecords(startDate, endDate)
    }

    fun selectRecord(record: MobileAttendanceRecord) {
        _uiState.value = _uiState.value.copy(selectedRecord = record)
        Timber.d("Record selected: ${record.id}")
    }

    fun clearSelection() {
        _uiState.value = _uiState.value.copy(selectedRecord = null)
    }

    fun formatDate(timestamp: Long): String {
        val formatter = SimpleDateFormat("MMM dd, yyyy HH:mm", Locale.getDefault())
        return formatter.format(timestamp)
    }

    fun formatTime(timestamp: Long): String {
        val formatter = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        return formatter.format(timestamp)
    }
}
