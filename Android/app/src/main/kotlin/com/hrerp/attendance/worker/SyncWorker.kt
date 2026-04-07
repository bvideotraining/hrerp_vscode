package com.hrerp.attendance.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.*
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import com.hrerp.attendance.data.remote.repositories.AttendanceRepository
import com.hrerp.attendance.util.NetworkMonitor
import timber.log.Timber
import java.util.concurrent.TimeUnit

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val attendanceRepository: AttendanceRepository,
    private val networkMonitor: NetworkMonitor
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return try {
            // Check network connectivity
            if (!networkMonitor.isOnline()) {
                Timber.d("No network available, retrying later")
                return Result.retry()
            }

            Timber.d("Starting sync of pending checkins")
            attendanceRepository.syncPendingCheckins()
            Timber.d("Sync completed successfully")
            Result.success()
        } catch (e: Exception) {
            Timber.e(e, "Sync failed, will retry")
            Result.retry()
        }
    }

    companion object {
        const val WORK_TAG = "sync_checkins"

        fun schedule(context: Context) {
            val syncRequest = PeriodicWorkRequestBuilder<SyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setBackoffCriteria(
                    BackoffPolicy.EXPONENTIAL,
                    15, TimeUnit.MINUTES
                )
                .addTag(WORK_TAG)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_TAG,
                ExistingPeriodicWorkPolicy.KEEP,
                syncRequest
            )

            Timber.d("Sync worker scheduled to run every 15 minutes")
        }

        fun cancel(context: Context) {
            WorkManager.getInstance(context).cancelAllWorkByTag(WORK_TAG)
            Timber.d("Sync worker cancelled")
        }
    }
}
