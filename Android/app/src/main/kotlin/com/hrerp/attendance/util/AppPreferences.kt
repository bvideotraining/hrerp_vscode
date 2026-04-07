package com.hrerp.attendance.util

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton

class AppPreferences @Inject constructor(@ApplicationContext context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val prefs = EncryptedSharedPreferences.create(
        context,
        "app_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    private val gson = Gson()

    // JWT Token
    fun saveJwtToken(token: String) {
        prefs.edit().putString(KEY_JWT_TOKEN, token).apply()
        Timber.d("JWT token saved")
    }

    fun getJwtToken(): String? = prefs.getString(KEY_JWT_TOKEN, null)

    fun setToken(token: String) {
        prefs.edit().putString(KEY_JWT_TOKEN, token).apply()
        Timber.d("Token saved")
    }

    fun getToken(): String? = prefs.getString(KEY_JWT_TOKEN, null)

    fun clearJwtToken() {
        prefs.edit().remove(KEY_JWT_TOKEN).apply()
    }

    // User Info
    fun saveUserId(userId: String) {
        prefs.edit().putString(KEY_USER_ID, userId).apply()
    }

    fun getUserId(): String? = prefs.getString(KEY_USER_ID, null)

    fun saveUserEmail(email: String) {
        prefs.edit().putString(KEY_USER_EMAIL, email).apply()
    }

    fun getUserEmail(): String? = prefs.getString(KEY_USER_EMAIL, null)

    fun saveUserFullName(fullName: String) {
        prefs.edit().putString(KEY_USER_FULL_NAME, fullName).apply()
    }

    fun getUserFullName(): String? = prefs.getString(KEY_USER_FULL_NAME, null)

    fun saveUserRole(role: String) {
        prefs.edit().putString(KEY_USER_ROLE, role).apply()
    }

    fun getUserRole(): String? = prefs.getString(KEY_USER_ROLE, null)

    fun saveEmployeeId(employeeId: String) {
        prefs.edit().putString(KEY_EMPLOYEE_ID, employeeId).apply()
    }

    fun getEmployeeId(): String? = prefs.getString(KEY_EMPLOYEE_ID, null)

    // Branch Info
    fun saveBranchId(branchId: String) {
        prefs.edit().putString(KEY_BRANCH_ID, branchId).apply()
    }

    fun getBranchId(): String? = prefs.getString(KEY_BRANCH_ID, null)

    fun saveBranchName(branchName: String) {
        prefs.edit().putString(KEY_BRANCH_NAME, branchName).apply()
    }

    fun getBranchName(): String? = prefs.getString(KEY_BRANCH_NAME, null)

    // Settings
    fun setApiUrl(url: String) {
        prefs.edit().putString(KEY_API_URL, url).apply()
        Timber.d("API URL updated: $url")
    }

    fun getApiUrl(): String = prefs.getString(KEY_API_URL, "http://10.238.253.33:3003") ?: "http://10.238.253.33:3003"

    fun setDeviceId(deviceId: String) {
        prefs.edit().putString(KEY_DEVICE_ID, deviceId).apply()
    }

    fun getDeviceId(): String? = prefs.getString(KEY_DEVICE_ID, null)

    fun setSyncInterval(minutes: Int) {
        prefs.edit().putInt(KEY_SYNC_INTERVAL, minutes).apply()
        Timber.d("Sync interval set to $minutes minutes")
    }

    fun saveSyncInterval(minutes: Int) {
        prefs.edit().putInt(KEY_SYNC_INTERVAL, minutes).apply()
    }

    fun getSyncInterval(): Int = prefs.getInt(KEY_SYNC_INTERVAL, 15)

    fun setSyncEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_SYNC_ENABLED, enabled).apply()
    }

    fun isSyncEnabled(): Boolean = prefs.getBoolean(KEY_SYNC_ENABLED, true)

    fun setNotificationsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_NOTIFICATIONS_ENABLED, enabled).apply()
        Timber.d("Notifications enabled: $enabled")
    }

    fun areNotificationsEnabled(): Boolean = prefs.getBoolean(KEY_NOTIFICATIONS_ENABLED, true)

    fun setBiometricEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
        Timber.d("Biometric enabled: $enabled")
    }

    fun isBiometricEnabled(): Boolean = prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false)

    fun saveFaceIdEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_FACE_ID_ENABLED, enabled).apply()
    }

    fun isFaceIdEnabled(): Boolean = prefs.getBoolean(KEY_FACE_ID_ENABLED, false)

    fun setLastSyncTime(timestamp: Long) {
        prefs.edit().putLong(KEY_LAST_SYNC_TIME, timestamp).apply()
    }

    fun getLastSyncTime(): Long = prefs.getLong(KEY_LAST_SYNC_TIME, 0)

    fun saveAutoSyncEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_AUTO_SYNC_ENABLED, enabled).apply()
    }

    fun isAutoSyncEnabled(): Boolean = prefs.getBoolean(KEY_AUTO_SYNC_ENABLED, true)

    fun saveWiFiOnlySync(wiFiOnly: Boolean) {
        prefs.edit().putBoolean(KEY_WIFI_ONLY_SYNC, wiFiOnly).apply()
    }

    fun isWiFiOnlySync(): Boolean = prefs.getBoolean(KEY_WIFI_ONLY_SYNC, false)

    fun saveBiometricEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
    }

    fun saveCheckInReminderEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_CHECKIN_REMINDER, enabled).apply()
    }

    fun isCheckInReminderEnabled(): Boolean = prefs.getBoolean(KEY_CHECKIN_REMINDER, true)

    fun saveCheckInReminderTime(time: String) {
        prefs.edit().putString(KEY_CHECKIN_REMINDER_TIME, time).apply()
    }

    fun getCheckInReminderTime(): String = prefs.getString(KEY_CHECKIN_REMINDER_TIME, "08:00") ?: "08:00"

    fun saveCheckOutReminderEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_CHECKOUT_REMINDER, enabled).apply()
    }

    fun isCheckOutReminderEnabled(): Boolean = prefs.getBoolean(KEY_CHECKOUT_REMINDER, true)

    fun saveCheckOutReminderTime(time: String) {
        prefs.edit().putString(KEY_CHECKOUT_REMINDER_TIME, time).apply()
    }

    fun getCheckOutReminderTime(): String = prefs.getString(KEY_CHECKOUT_REMINDER_TIME, "17:00") ?: "17:00"

    fun saveUserAccessType(accessType: String) {
        prefs.edit().putString(KEY_USER_ACCESS_TYPE, accessType).apply()
    }

    fun getUserAccessType(): String? = prefs.getString(KEY_USER_ACCESS_TYPE, null)

    fun savePassword(password: String) {
        prefs.edit().putString(KEY_USER_PASSWORD, password).apply()
    }

    fun getPassword(): String? = prefs.getString(KEY_USER_PASSWORD, null)

    // Check-in state persistence (survives app restarts)
    fun saveIsCheckedIn(checkedIn: Boolean) {
        prefs.edit().putBoolean(KEY_IS_CHECKED_IN, checkedIn).apply()
    }

    fun getIsCheckedIn(): Boolean = prefs.getBoolean(KEY_IS_CHECKED_IN, false)

    // Profile image — local file path stored on device
    fun saveProfileImagePath(path: String) { prefs.edit().putString(KEY_PROFILE_IMAGE_PATH, path).apply() }
    fun getProfileImagePath(): String? = prefs.getString(KEY_PROFILE_IMAGE_PATH, null)

    // Face ID image — local file path stored on device
    fun saveFaceImagePath(path: String) { prefs.edit().putString(KEY_FACE_IMAGE_PATH, path).apply() }
    fun getFaceImagePath(): String? = prefs.getString(KEY_FACE_IMAGE_PATH, null)
    fun clearFaceImagePath() { prefs.edit().remove(KEY_FACE_IMAGE_PATH).apply() }

    // Job title (cached from backend)
    fun saveJobTitle(title: String) { prefs.edit().putString(KEY_JOB_TITLE, title).apply() }
    fun getJobTitle(): String? = prefs.getString(KEY_JOB_TITLE, null)

    // Clear all (logout)
    fun clearAll() {
        prefs.edit().clear().apply()
        Timber.d("All preferences cleared")
    }

    companion object {
        private const val KEY_JWT_TOKEN = "jwt_token"
        private const val KEY_API_URL = "api_url"
        private const val KEY_DEVICE_ID = "device_id"
        private const val KEY_USER_ID = "user_id"
        private const val KEY_USER_EMAIL = "user_email"
        private const val KEY_USER_FULL_NAME = "user_full_name"
        private const val KEY_USER_ROLE = "user_role"
        private const val KEY_EMPLOYEE_ID = "employee_id"
        private const val KEY_BRANCH_ID = "branch_id"
        private const val KEY_BRANCH_NAME = "branch_name"
        private const val KEY_SYNC_INTERVAL = "sync_interval"
        private const val KEY_SYNC_ENABLED = "sync_enabled"
        private const val KEY_AUTO_SYNC_ENABLED = "auto_sync_enabled"
        private const val KEY_WIFI_ONLY_SYNC = "wifi_only_sync"
        private const val KEY_NOTIFICATIONS_ENABLED = "notifications_enabled"
        private const val KEY_BIOMETRIC_ENABLED = "biometric_enabled"
        private const val KEY_FACE_ID_ENABLED = "face_id_enabled"
        private const val KEY_CHECKIN_REMINDER = "checkin_reminder"
        private const val KEY_CHECKIN_REMINDER_TIME = "checkin_reminder_time"
        private const val KEY_CHECKOUT_REMINDER = "checkout_reminder"
        private const val KEY_CHECKOUT_REMINDER_TIME = "checkout_reminder_time"
        private const val KEY_LAST_SYNC_TIME = "last_sync_time"
        private const val KEY_IS_CHECKED_IN = "is_checked_in"
        private const val KEY_USER_ACCESS_TYPE = "user_access_type"
        private const val KEY_USER_PASSWORD = "user_password"
        private const val KEY_PROFILE_IMAGE_PATH = "profile_image_path"
        private const val KEY_FACE_IMAGE_PATH = "face_image_path"
        private const val KEY_JOB_TITLE = "job_title"
    }
}
