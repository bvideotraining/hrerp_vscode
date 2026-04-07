package com.hrerp.attendance.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.hrerp.attendance.R
import timber.log.Timber

object NotificationManagerHelper {

    const val CHANNEL_ID_SYNC = "sync_notifications"
    const val CHANNEL_ID_CHECKIN = "checkin_notifications"
    const val NOTIFICATION_ID_SYNC = 1
    const val NOTIFICATION_ID_CHECKIN = 2
    const val NOTIFICATION_ID_FCM = 102

    fun createNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val syncChannel = NotificationChannel(
                CHANNEL_ID_SYNC,
                "Synchronization",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for background sync status"
                enableVibration(false)
            }

            val checkinChannel = NotificationChannel(
                CHANNEL_ID_CHECKIN,
                "Check-in Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for attendance check-ins"
                enableVibration(true)
                enableLights(true)
            }

            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(syncChannel)
            notificationManager.createNotificationChannel(checkinChannel)
            Timber.d("Notification channels created")
        }
    }

    fun showSyncNotification(
        context: Context,
        title: String,
        message: String,
        ongoing: Boolean = true
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_SYNC)
            .setSmallIcon(R.drawable.ic_sync) // You need to add this icon
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(!ongoing)
            .setOngoing(ongoing)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        notificationManager.notify(NOTIFICATION_ID_SYNC, notification)
        Timber.d("Sync notification shown: $title")
    }

    fun showCheckinNotification(
        context: Context,
        title: String,
        message: String,
        largeText: String? = null
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_CHECKIN)
            .setSmallIcon(R.drawable.ic_checkin) // You need to add this icon
            .setContentTitle(title)
            .setContentText(message)
            .apply {
                if (largeText != null) {
                    setStyle(NotificationCompat.BigTextStyle().bigText(largeText))
                }
            }
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0, 250, 250, 250))
            .setLights(0xFF0066CC.toInt(), 1000, 1000)
            .build()

        notificationManager.notify(NOTIFICATION_ID_CHECKIN, notification)
        Timber.d("Check-in notification shown: $title")
    }

    fun cancelSyncNotification(context: Context) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        notificationManager.cancel(NOTIFICATION_ID_SYNC)
        Timber.d("Sync notification cancelled")
    }

    fun showProgressNotification(
        context: Context,
        title: String,
        progress: Int = 0,
        max: Int = 100
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_SYNC)
            .setSmallIcon(R.drawable.ic_sync)
            .setContentTitle(title)
            .setProgress(max, progress, progress == 0)
            .setOngoing(true)
            .build()

        notificationManager.notify(NOTIFICATION_ID_SYNC, notification)
    }

    fun showErrorNotification(
        context: Context,
        title: String,
        message: String
    ) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val notification = NotificationCompat.Builder(context, CHANNEL_ID_CHECKIN)
            .setSmallIcon(R.drawable.ic_error) // You need to add this icon
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVibrate(longArrayOf(0, 150, 100, 150))
            .build()

        notificationManager.notify(NOTIFICATION_ID_CHECKIN, notification)
        Timber.d("Error notification shown: $title")
    }
}
