package com.hrerp.attendance.di

import android.content.Context
import androidx.room.Room
import com.hrerp.attendance.data.local.AttendanceDatabase
import com.hrerp.attendance.data.remote.api.EmployeeTrackerApi
import com.hrerp.attendance.util.AppPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(appPreferences: AppPreferences): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .addInterceptor { chain ->
                // Dynamically rewrite the host/port from the stored API URL on every request
                // so that changes made in Settings are picked up without restarting the app.
                val storedUrl = appPreferences.getApiUrl().trimEnd('/')
                val original = chain.request()
                val newRequest = try {
                    val parsed = java.net.URL(storedUrl)
                    val port = if (parsed.port == -1) {
                        if (parsed.protocol == "https") 443 else 80
                    } else parsed.port
                    val rewritten = original.url.newBuilder()
                        .scheme(parsed.protocol)
                        .host(parsed.host)
                        .port(port)
                        .build()
                    original.newBuilder().url(rewritten).build()
                } catch (_: Exception) {
                    original
                }
                chain.proceed(newRequest)
            }
            .addInterceptor { chain ->
                val token = appPreferences.getJwtToken()
                val request = if (token != null) {
                    chain.request().newBuilder()
                        .addHeader("Authorization", "Bearer $token")
                        .build()
                } else {
                    chain.request()
                }
                chain.proceed(request)
            }
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        // Base URL is a placeholder — the host/port are overridden per-request by the URL interceptor
        return Retrofit.Builder()
            .baseUrl("http://placeholder.local/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideEmployeeTrackerApi(retrofit: Retrofit): EmployeeTrackerApi {
        return retrofit.create(EmployeeTrackerApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAttendanceDatabase(
        @ApplicationContext context: Context
    ): AttendanceDatabase {
        return Room.databaseBuilder(
            context,
            AttendanceDatabase::class.java,
            "attendance_db"
        )
            .fallbackToDestructiveMigration()
            .build()
    }
}
