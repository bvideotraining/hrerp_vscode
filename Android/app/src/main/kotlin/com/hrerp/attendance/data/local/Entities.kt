package com.hrerp.attendance.data.local

import androidx.room.*

@Entity(tableName = "pending_checkins")
data class PendingCheckinEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    
    @ColumnInfo(name = "type")
    val type: String, // "check-in" or "check-out"
    
    @ColumnInfo(name = "employee_id")
    val employeeId: String = "",
    
    @ColumnInfo(name = "branch_id")
    val branchId: String = "",
    
    @ColumnInfo(name = "latitude")
    val latitude: Double,
    
    @ColumnInfo(name = "longitude")
    val longitude: Double,
    
    @ColumnInfo(name = "device_id")
    val deviceId: String,
    
    @ColumnInfo(name = "accuracy")
    val accuracy: Float? = null,
    
    @ColumnInfo(name = "is_mock_location")
    val isMockLocation: Boolean = false,
    
    @ColumnInfo(name = "timestamp")
    val timestamp: String,
    
    @ColumnInfo(name = "status")
    val status: String = "PENDING", // PENDING, SYNCED, FAILED
    
    @ColumnInfo(name = "error_message")
    val errorMessage: String? = null,
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis(),
    
    @ColumnInfo(name = "synced_at")
    val syncedAt: Long? = null
)

@Dao
interface PendingCheckinDao {
    
    @Insert
    suspend fun insert(entity: PendingCheckinEntity): Long
    
    @Update
    suspend fun update(entity: PendingCheckinEntity)
    
    @Delete
    suspend fun delete(entity: PendingCheckinEntity)
    
    @Query("SELECT * FROM pending_checkins WHERE status = 'PENDING' ORDER BY created_at ASC")
    suspend fun getPendingCheckins(): List<PendingCheckinEntity>
    
    @Query("SELECT * FROM pending_checkins WHERE status = 'FAILED' ORDER BY created_at DESC")
    suspend fun getFailedCheckins(): List<PendingCheckinEntity>
    
    @Query("SELECT * FROM pending_checkins WHERE id = :id")
    suspend fun getCheckinById(id: Int): PendingCheckinEntity?
    
    @Query("SELECT COUNT(*) FROM pending_checkins WHERE status = 'PENDING'")
    suspend fun getPendingCount(): Int
    
    @Query("DELETE FROM pending_checkins WHERE status = 'SYNCED' AND synced_at < :olderThanTimestamp")
    suspend fun deleteOldSyncedCheckins(olderThanTimestamp: Long)
    
    @Query("SELECT * FROM pending_checkins ORDER BY created_at DESC LIMIT :limit")
    suspend fun getRecentCheckins(limit: Int = 100): List<PendingCheckinEntity>
}

@Entity(tableName = "attendance_records")
data class AttendanceRecordEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    
    @ColumnInfo(name = "employee_id")
    val employeeId: String,
    
    @ColumnInfo(name = "branch_id")
    val branchId: String,
    
    @ColumnInfo(name = "date")
    val date: String,
    
    @ColumnInfo(name = "check_in")
    val checkIn: String? = null,
    
    @ColumnInfo(name = "check_out")
    val checkOut: String? = null,
    
    @ColumnInfo(name = "check_in_lat")
    val checkInLat: Double? = null,
    
    @ColumnInfo(name = "check_in_lon")
    val checkInLon: Double? = null,
    
    @ColumnInfo(name = "check_out_lat")
    val checkOutLat: Double? = null,
    
    @ColumnInfo(name = "check_out_lon")
    val checkOutLon: Double? = null,
    
    @ColumnInfo(name = "status")
    val status: String? = null,
    
    @ColumnInfo(name = "source")
    val source: String = "mobile",
    
    @ColumnInfo(name = "created_at")
    val createdAt: Long = System.currentTimeMillis()
)

@Dao
interface AttendanceRecordDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: AttendanceRecordEntity)
    
    @Query("SELECT * FROM attendance_records WHERE employee_id = :employeeId ORDER BY date DESC LIMIT :limit")
    suspend fun getRecordsByEmployee(employeeId: String, limit: Int = 30): List<AttendanceRecordEntity>
    
    @Query("SELECT * FROM attendance_records WHERE date = :date AND employee_id = :employeeId LIMIT 1")
    suspend fun getTodayRecord(date: String, employeeId: String): AttendanceRecordEntity?
    
    @Query("DELETE FROM attendance_records WHERE created_at < :olderThanTimestamp")
    suspend fun deleteOldRecords(olderThanTimestamp: Long)
}

@Entity(tableName = "branches")
data class BranchEntity(
    @PrimaryKey
    @ColumnInfo(name = "id")
    val id: String,
    
    @ColumnInfo(name = "code")
    val code: String,
    
    @ColumnInfo(name = "name")
    val name: String,
    
    @ColumnInfo(name = "latitude")
    val latitude: Double? = null,
    
    @ColumnInfo(name = "longitude")
    val longitude: Double? = null,
    
    @ColumnInfo(name = "radius")
    val radius: Int = 50,
    
    @ColumnInfo(name = "is_active")
    val isActive: Boolean = true,
    
    @ColumnInfo(name = "updated_at")
    val updatedAt: Long = System.currentTimeMillis()
)

@Dao
interface BranchDao {
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entity: BranchEntity)
    
    @Query("SELECT * FROM branches WHERE is_active = 1 ORDER BY name ASC")
    suspend fun getActiveBranches(): List<BranchEntity>
    
    @Query("SELECT * FROM branches WHERE id = :id")
    suspend fun getBranchById(id: String): BranchEntity?
    
    @Query("DELETE FROM branches")
    suspend fun deleteAll()
}
