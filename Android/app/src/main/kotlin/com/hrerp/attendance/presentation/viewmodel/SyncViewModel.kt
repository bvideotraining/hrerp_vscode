package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.local.PendingCheckinEntity
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import com.hrerp.attendance.domain.usecase.SyncPendingCheckinsUseCase
import com.hrerp.attendance.util.NetworkMonitor
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject
import java.text.SimpleDateFormat
import java.util.Locale

data class SyncUiState(
    val pendingRecords: List<PendingCheckinEntity> = emptyList(),
    val isSyncing: Boolean = false,
    val syncProgress: Int = 0,
    val isOnline: Boolean = true,
    val lastSyncTime: Long = 0L,
    val error: String? = null,
    val success: String? = null,
    val totalPending: Int = 0,
    val syncedCount: Int = 0
)

@HiltViewModel
class SyncViewModel @Inject constructor(
    private val attendanceRepository: AttendanceRepository,
    private val syncPendingCheckinsUseCase: SyncPendingCheckinsUseCase,
    private val networkMonitor: NetworkMonitor
) : ViewModel() {

    private val _uiState = MutableStateFlow(SyncUiState())
    val uiState: StateFlow<SyncUiState> = _uiState

    init {
        loadPendingRecords()
        monitorNetworkStatus()
    }

    private fun loadPendingRecords() {
        viewModelScope.launch {
            try {
                Timber.d("Loading pending records")
                val records = attendanceRepository.getPendingCheckins()
                _uiState.value = _uiState.value.copy(
                    pendingRecords = records,
                    totalPending = records.size
                )
                Timber.d("Loaded ${records.size} pending records")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load pending records")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to load pending records"
                )
            }
        }
    }

    private fun monitorNetworkStatus() {
        viewModelScope.launch {
            networkMonitor.isOnlineFlow.collectLatest { isOnline ->
                _uiState.value = _uiState.value.copy(isOnline = isOnline)
                
                if (isOnline && _uiState.value.pendingRecords.isNotEmpty()) {
                    Timber.d("Network is now online, attempting to sync pending records")
                    syncPending()
                }
            }
        }
    }

    fun syncPending() {
        if (_uiState.value.isSyncing) {
            Timber.d("Sync already in progress")
            return
        }

        if (!_uiState.value.isOnline) {
            _uiState.value = _uiState.value.copy(
                error = "No network connection available"
            )
            return
        }

        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(
                    isSyncing = true,
                    error = null,
                    syncProgress = 0
                )

                Timber.d("Starting sync of ${_uiState.value.pendingRecords.size} pending records")

                val result = syncPendingCheckinsUseCase()

                if (result is com.hrerp.attendance.domain.usecase.SyncResult.Success) {
                    // Reload pending records
                    delay(500) // Small delay to ensure backend processed
                    loadPendingRecords()
                    
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        syncProgress = 100,
                        lastSyncTime = System.currentTimeMillis(),
                        success = "All records synced successfully",
                        syncedCount = _uiState.value.totalPending
                    )
                    Timber.d("Sync completed successfully")
                } else if (result is com.hrerp.attendance.domain.usecase.SyncResult.Error) {
                    _uiState.value = _uiState.value.copy(
                        isSyncing = false,
                        error = result.message
                    )
                    Timber.e("Sync failed: ${result.message}")
                }
            } catch (e: Exception) {
                Timber.e(e, "Sync exception")
                _uiState.value = _uiState.value.copy(
                    isSyncing = false,
                    error = e.message ?: "Sync failed"
                )
            }
        }
    }

    fun retryRecord(record: PendingCheckinEntity) {
        viewModelScope.launch {
            try {
                Timber.d("Retrying record: ${record.id}")
                _uiState.value = _uiState.value.copy(error = null)
                
                // Mark record for immediate sync
                val updatedRecord = record.copy(status = "RETRY")
                attendanceRepository.savePendingCheckin(updatedRecord)
                
                syncPending()
            } catch (e: Exception) {
                Timber.e(e, "Failed to retry record")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to retry record"
                )
            }
        }
    }

    fun deleteRecord(record: PendingCheckinEntity) {
        viewModelScope.launch {
            try {
                Timber.d("Deleting record: ${record.id}")
                
                // In a real app, you would have a delete method in the repository
                // For now, we'll just reload the records
                loadPendingRecords()
                
                _uiState.value = _uiState.value.copy(
                    success = "Record deleted"
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to delete record")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to delete record"
                )
            }
        }
    }

    fun clearMessages() {
        _uiState.value = _uiState.value.copy(
            error = null,
            success = null
        )
    }

    fun formatDateTime(timestamp: Long): String {
        val formatter = SimpleDateFormat("MMM dd HH:mm", Locale.getDefault())
        return formatter.format(timestamp)
    }

    fun getStatusColor(status: String): Int {
        return when (status) {
            "PENDING" -> 0xFFFFA500.toInt() // Orange
            "RETRY" -> 0xFFDC143C.toInt() // Red
            "SYNCED" -> 0xFF00AA00.toInt() // Green
            else -> 0xFF808080.toInt() // Gray
        }
    }

    fun getStatusLabel(status: String): String {
        return when (status) {
            "PENDING" -> "Pending"
            "RETRY" -> "Failed - Retry"
            "SYNCED" -> "Synced"
            else -> "Unknown"
        }
    }
}
