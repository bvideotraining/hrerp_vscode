package com.hrerp.attendance.util

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.provider.Settings
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import dagger.hilt.android.qualifiers.ApplicationContext
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

@Singleton

class DeviceUtils @Inject constructor(@ApplicationContext private val context: Context) {

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "device_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    fun getOrGenerateDeviceId(): String {
        var deviceId = prefs.getString("device_id", null)
        if (deviceId == null) {
            deviceId = buildDeviceId()
            prefs.edit().putString("device_id", deviceId).apply()
        }
        return deviceId
    }

    fun generateDeviceId(): String = getOrGenerateDeviceId()

    private fun buildDeviceId(): String {
        val android_id = Settings.Secure.getString(
            context.contentResolver,
            Settings.Secure.ANDROID_ID
        )
        val deviceName = Build.DEVICE
        val serialNumber = Build.SERIAL
        return "$android_id-$deviceName-$serialNumber"
    }

    fun getDeviceModel(): String {
        return Build.MODEL
    }

    fun getDeviceBrand(): String {
        return Build.BRAND
    }

    fun getDeviceName(): String = "${getDeviceBrand()} ${getDeviceModel()}"

    fun getOsVersion(): String {
        return "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
    }

    fun getDeviceInfo(): DeviceInfo {
        return DeviceInfo(
            deviceId = getOrGenerateDeviceId(),
            model = getDeviceModel(),
            brand = getDeviceBrand(),
            osVersion = getOsVersion(),
            appVersion = getAppVersion()
        )
    }

    private fun getAppVersion(): String {
        return try {
            val packageInfo = context.packageManager.getPackageInfo(context.packageName, 0)
            packageInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    fun saveDeviceInfo(deviceId: String, model: String, brand: String, osVersion: String) {
        prefs.edit().apply {
            putString("device_id", deviceId)
            putString("device_model", model)
            putString("device_brand", brand)
            putString("os_version", osVersion)
        }.apply()
    }

    data class DeviceInfo(
        val deviceId: String,
        val model: String,
        val brand: String,
        val osVersion: String,
        val appVersion: String
    )
}
