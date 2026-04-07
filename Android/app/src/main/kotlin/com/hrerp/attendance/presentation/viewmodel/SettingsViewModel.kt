package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.util.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class SettingsUiState(
    val apiUrl: String = "http://10.238.253.33:3003",
    val syncInterval: Int = 15, // minutes
    val notificationsEnabled: Boolean = true,
    val biometricEnabled: Boolean = false,
    val offlineStorageUsage: String = "0 MB",
    val lastSyncTime: Long = 0L,
    val isSaving: Boolean = false,
    val error: String? = null,
    val success: String? = null,
    val appVersion: String = "1.0.0",
    val buildVersion: String = "1"
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState

    init {
        loadSettings()
    }

    private fun loadSettings() {
        viewModelScope.launch {
            try {
                Timber.d("Loading settings")
                val apiUrl = appPreferences.getApiUrl()
                val syncInterval = appPreferences.getSyncInterval()
                val notificationsEnabled = appPreferences.areNotificationsEnabled()
                val biometricEnabled = appPreferences.isBiometricEnabled()
                val lastSyncTime = appPreferences.getLastSyncTime()

                _uiState.value = SettingsUiState(
                    apiUrl = apiUrl,
                    syncInterval = syncInterval,
                    notificationsEnabled = notificationsEnabled,
                    biometricEnabled = biometricEnabled,
                    lastSyncTime = lastSyncTime
                )
            } catch (e: Exception) {
                Timber.e(e, "Failed to load settings")
                _uiState.value = _uiState.value.copy(
                    error = e.message ?: "Failed to load settings"
                )
            }
        }
    }

    fun updateApiUrl(newUrl: String) {
        if (!isValidUrl(newUrl)) {
            _uiState.value = _uiState.value.copy(
                error = "Invalid URL format"
            )
            return
        }

        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSaving = true, error = null)
                appPreferences.setApiUrl(newUrl)
                _uiState.value = _uiState.value.copy(
                    apiUrl = newUrl,
                    isSaving = false,
                    success = "API URL updated successfully"
                )
                Timber.d("API URL updated to: $newUrl")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update API URL")
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    error = e.message ?: "Failed to update API URL"
                )
            }
        }
    }

    fun updateSyncInterval(newInterval: Int) {
        if (newInterval < 5 || newInterval > 120) {
            _uiState.value = _uiState.value.copy(
                error = "Sync interval must be between 5 and 120 minutes"
            )
            return
        }

        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSaving = true, error = null)
                appPreferences.setSyncInterval(newInterval)
                _uiState.value = _uiState.value.copy(
                    syncInterval = newInterval,
                    isSaving = false,
                    success = "Sync interval updated to ${newInterval} minutes"
                )
                Timber.d("Sync interval updated to: $newInterval minutes")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update sync interval")
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    error = e.message ?: "Failed to update sync interval"
                )
            }
        }
    }

    fun toggleNotifications(enabled: Boolean) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSaving = true, error = null)
                appPreferences.setNotificationsEnabled(enabled)
                _uiState.value = _uiState.value.copy(
                    notificationsEnabled = enabled,
                    isSaving = false,
                    success = if (enabled) "Notifications enabled" else "Notifications disabled"
                )
                Timber.d("Notifications toggled: $enabled")
            } catch (e: Exception) {
                Timber.e(e, "Failed to toggle notifications")
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    error = e.message ?: "Failed to toggle notifications"
                )
            }
        }
    }

    fun toggleBiometric(enabled: Boolean) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isSaving = true, error = null)
                appPreferences.setBiometricEnabled(enabled)
                _uiState.value = _uiState.value.copy(
                    biometricEnabled = enabled,
                    isSaving = false,
                    success = if (enabled) "Biometric authentication enabled" else "Biometric authentication disabled"
                )
                Timber.d("Biometric toggled: $enabled")
            } catch (e: Exception) {
                Timber.e(e, "Failed to toggle biometric")
                _uiState.value = _uiState.value.copy(
                    isSaving = false,
                    error = e.message ?: "Failed to toggle biometric"
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

    private fun isValidUrl(url: String): Boolean {
        return try {
            url.startsWith("http://") || url.startsWith("https://")
        } catch (e: Exception) {
            false
        }
    }

    fun getOfflineStorageSize(): String {
        // This would calculate actual size from Room database
        return "2.5 MB"
    }

    fun getLastSyncTimeFormatted(): String {
        val lastSync = _uiState.value.lastSyncTime
        if (lastSync == 0L) {
            return "Never"
        }
        
        val formatter = java.text.SimpleDateFormat(
            "MMM dd, yyyy HH:mm",
            java.util.Locale.getDefault()
        )
        return formatter.format(lastSync)
    }
}
