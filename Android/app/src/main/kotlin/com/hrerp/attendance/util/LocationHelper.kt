package com.hrerp.attendance.util

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import androidx.core.content.ContextCompat
import com.google.android.gms.location.*
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.suspendCancellableCoroutine
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

@Singleton

class LocationHelper @Inject constructor(@ApplicationContext private val context: Context) {
    private val fusedLocationClient = LocationServices.getFusedLocationProviderClient(context)

    suspend fun getCurrentLocation(): Location? {
        return suspendCancellableCoroutine { continuation ->
            try {
                // Check permissions
                if (ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.ACCESS_FINE_LOCATION
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    continuation.resume(null)
                    return@suspendCancellableCoroutine
                }

                fusedLocationClient.getCurrentLocation(
                    Priority.PRIORITY_HIGH_ACCURACY,
                    null
                ).addOnSuccessListener { location ->
                    if (location != null) {
                        Timber.d("Location obtained: ${location.latitude}, ${location.longitude}")
                        continuation.resume(location)
                    } else {
                        Timber.w("Location is null")
                        continuation.resume(null)
                    }
                }.addOnFailureListener { exception ->
                    Timber.e(exception, "Failed to get current location")
                    continuation.resumeWithException(exception)
                }
            } catch (e: Exception) {
                Timber.e(e, "Exception in getCurrentLocation")
                continuation.resumeWithException(e)
            }
        }
    }

    suspend fun requestLocationUpdates(
        interval: Long = 5000,
        onLocationUpdate: (Location) -> Unit
    ) {
        try {
            if (ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.ACCESS_FINE_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
            ) {
                return
            }

            val locationRequest = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, interval)
                .setMinUpdateDistanceMeters(10f)
                .build()

            val locationCallback = object : LocationCallback() {
                override fun onLocationResult(result: LocationResult) {
                    for (location in result.locations) {
                        onLocationUpdate(location)
                    }
                }
            }

            fusedLocationClient.requestLocationUpdates(
                locationRequest,
                locationCallback,
                null
            )
        } catch (e: Exception) {
            Timber.e(e, "Exception in requestLocationUpdates")
        }
    }

    companion object {
        fun calculateDistance(
            lat1: Double,
            lon1: Double,
            lat2: Double,
            lon2: Double
        ): Int {
            val result = FloatArray(1)
            Location.distanceBetween(lat1, lon1, lat2, lon2, result)
            return result[0].toInt()
        }
    }
}
