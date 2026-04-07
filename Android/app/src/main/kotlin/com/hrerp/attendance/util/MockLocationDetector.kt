package com.hrerp.attendance.util

import android.content.Context
import android.location.Location
import android.location.LocationManager
import android.os.Build
import android.provider.Settings
import dagger.hilt.android.qualifiers.ApplicationContext
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class MockLocationDetector @Inject constructor(@ApplicationContext private val context: Context) {

    fun isMockLocation(location: Location?): Boolean {
        if (location == null) return false
        
        // Method 1: Check isMock flag (API 31+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val isMock = location.isMock
            if (isMock) {
                Timber.w("Mock location detected (isMock flag)")
                return true
            }
        }

        // Method 2: Check location provider
        if (isMockProvider(location.provider)) {
            Timber.w("Mock location detected (mock provider: ${location.provider})")
            return true
        }

        // Method 3: Check accuracy vs speed (heuristic)
        if (isUnrealisticLocation(location)) {
            Timber.w("Unrealistic location detected (accuracy: ${location.accuracy}, speed: ${location.speed})")
            return true
        }

        return false
    }

    private fun isMockProvider(provider: String?): Boolean {
        return provider == LocationManager.PASSIVE_PROVIDER ||
               provider == "mock" ||
               provider == "gps_mock"
    }

    private fun isUnrealisticLocation(location: Location): Boolean {
        // Accuracy > 100m and speed > 100 m/s is unrealistic for foot traffic
        return location.accuracy > 100 && location.speed > 100
    }

    fun checkMockLocationSettings(): Boolean {
        return try {
            Settings.Secure.getInt(
                context.contentResolver,
                Settings.Secure.ALLOW_MOCK_LOCATION
            ) == 1
        } catch (e: Settings.SettingNotFoundException) {
            false
        }
    }

    fun isFromMockProvider(): Boolean = checkMockLocationSettings()

    fun verifyIntegrity(): Boolean = true
}
