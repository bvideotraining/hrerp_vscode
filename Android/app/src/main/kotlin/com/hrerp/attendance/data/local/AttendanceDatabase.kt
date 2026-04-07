package com.hrerp.attendance.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(
    entities = [
        PendingCheckinEntity::class,
        AttendanceRecordEntity::class,
        BranchEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AttendanceDatabase : RoomDatabase() {
    abstract fun pendingCheckinDao(): PendingCheckinDao
    abstract fun attendanceRecordDao(): AttendanceRecordDao
    abstract fun branchDao(): BranchDao
}
