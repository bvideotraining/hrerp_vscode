# ProGuard rules for Employee Tracker application

# Keep Android framework classes
-keep public class android.** { *; }
-keep public class javax.** { *; }

# Keep Kotlin metadata
-keepattributes *Annotation*
-keep class kotlin.** { *; }
-keep class kotlin.Metadata { *; }
-keepclassmembers class kotlin.Metadata {
    public <methods>;
}

# Keep Hilt generated classes
-keep class **_Factory { *; }
-keep class **_MembersInjector { *; }
-keep class dagger.** { *; }
-keep class javax.inject.** { *; }
-keep class h { *; }

# Keep Firebase classes
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-keepattributes *Annotation*
-keepattributes Exceptions

# Keep Retrofit interfaces and models
-keep interface com.hrerp.attendance.data.remote.api.** { *; }
-keep class com.hrerp.attendance.data.remote.dto.** { *; }
-keep class com.hrerp.attendance.data.remote.api.** { *; }
-keepclassmembers class com.hrerp.attendance.data.remote.dto.** { *; }

# Keep Room database classes
-keep class com.hrerp.attendance.data.local.** { *; }
-keep class androidx.room.** { *; }
-keepclassmembers class com.hrerp.attendance.data.local.** { *; }

# Keep Repositories
-keep class com.hrerp.attendance.data.remote.repositories.** { *; }
-keep class com.hrerp.attendance.data.local.** { *; }

# Keep ViewModels
-keep class com.hrerp.attendance.presentation.viewmodel.** { *; }

# Keep Use Cases
-keep class com.hrerp.attendance.domain.usecase.** { *; }

# Keep Utility classes
-keep class com.hrerp.attendance.util.** { *; }

# Keep Composables
-keep class com.hrerp.attendance.ui.** { *; }
-keep class androidx.compose.** { *; }

# Gson rules
-keepattributes Signature
-keep class com.google.gson.** { *; }
-keep class com.google.gson.stream.** { *; }
-keep class * extends com.google.gson.TypeAdapter
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# OkHttp rules
-dontwarn okhttp3.**
-dontwarn okio.**
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Retrofit rules
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepclasseswithmembers class retrofit2.** { *; }

# Timber logging
-keep class timber.log.** { *; }
-keepclassmembers class timber.log.** { *; }

# Keep data classes (important for Kotlin)
-keepclassmembers class com.hrerp.attendance.** {
    <fields>;
    <methods>;
}

# Keep enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep default constructors
-keepconstructors class com.hrerp.attendance.** { *; }

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Optimization settings
-optimizationpasses 5
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-dontpreverify
-verbose
