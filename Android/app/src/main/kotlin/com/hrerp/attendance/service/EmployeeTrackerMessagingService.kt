package com.hrerp.attendance.service

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hrerp.attendance.util.NotificationManagerHelper
import timber.log.Timber

class EmployeeTrackerMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)

        Timber.d("FCM Message received from: ${remoteMessage.from}")

        // Handle data message
        if (remoteMessage.data.isNotEmpty()) {
            Timber.d("Message data payload: ${remoteMessage.data}")
            handleDataMessage(remoteMessage.data)
        }

        // Handle notification message
        remoteMessage.notification?.let {
            Timber.d("Message Notification Body: ${it.body}")
            NotificationManagerHelper.showCheckinNotification(
                context = this,
                title = it.title ?: "Notification",
                message = it.body ?: "",
                largeText = remoteMessage.data["details"]
            )
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Timber.d("Refreshed FCM token: $token")
        // Save token in preferences for later transmission to backend
        // This will be handled by the app when devices are registered
    }

    private fun handleDataMessage(data: Map<String, String>) {
        when (data["type"]) {
            "checkin_reminder" -> {
                NotificationManagerHelper.showCheckinNotification(
                    this,
                    "Check-in Reminder",
                    data["message"] ?: "Time to check in",
                    data["details"]
                )
            }
            "checkout_reminder" -> {
                NotificationManagerHelper.showCheckinNotification(
                    this,
                    "Check-out Reminder",
                    data["message"] ?: "Time to check out",
                    data["details"]
                )
            }
            "sync_status" -> {
                val message = data["message"] ?: "Sync completed"
                if (data["success"] == "true") {
                    NotificationManagerHelper.showCheckinNotification(
                        this,
                        "Sync Successful",
                        message
                    )
                } else {
                    NotificationManagerHelper.showErrorNotification(
                        this,
                        "Sync Failed",
                        message
                    )
                }
            }
            else -> {
                // Generic notification
                NotificationManagerHelper.showCheckinNotification(
                    this,
                    data["title"] ?: "Notification",
                    data["message"] ?: "New message received"
                )
            }
        }
    }
}
