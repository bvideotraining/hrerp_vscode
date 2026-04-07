package com.hrerp.attendance.presentation.viewmodel

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.firebase.FirebaseAuthHelper
import com.hrerp.attendance.data.remote.repositories.AuthRepository
import com.hrerp.attendance.util.AppPreferences
import com.hrerp.attendance.util.BiometricHelper
import com.hrerp.attendance.util.FaceIdHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = false,
    val profileImagePath: String? = null,
    val employeeCode: String = "",
    val employeeName: String = "",
    val email: String = "",
    val role: String = "",
    val roleName: String = "",
    val jobTitle: String = "",
    val biometricEnabled: Boolean = false,
    val biometricAvailable: Boolean = false,
    val faceIdAvailable: Boolean = false,
    val faceIdEnabled: Boolean = false,
    val faceIdSetUp: Boolean = false,
    val faceIdSetupLoading: Boolean = false,
    val faceIdSetupError: String? = null,
    val error: String? = null,
    val isUpdatingEmail: Boolean = false,
    val emailUpdateSuccess: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val appPreferences: AppPreferences,
    private val authRepository: AuthRepository,
    private val firebaseAuthHelper: FirebaseAuthHelper
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState

    init {
        val biometricAvailable = BiometricHelper.canAuthenticateWithBiometrics(context)
        val faceIdAvailable = BiometricHelper.canAuthenticateWithFace(context)
        _uiState.value = ProfileUiState(
            isLoading = true,
            profileImagePath = appPreferences.getProfileImagePath(),
            employeeName = appPreferences.getUserFullName() ?: "",
            email = appPreferences.getUserEmail() ?: "",
            role = appPreferences.getUserRole() ?: "",
            jobTitle = appPreferences.getJobTitle() ?: "",
            biometricEnabled = appPreferences.isBiometricEnabled(),
            biometricAvailable = biometricAvailable,
            faceIdAvailable = faceIdAvailable,
            faceIdEnabled = appPreferences.isFaceIdEnabled(),
            faceIdSetUp = appPreferences.getFaceImagePath() != null
        )
        loadProfile()
    }

    fun loadProfile() {
        viewModelScope.launch {
            try {
                val profile = authRepository.getProfile()
                if (profile.fullName.isNotBlank()) appPreferences.saveUserFullName(profile.fullName)
                if (profile.email.isNotBlank()) appPreferences.saveUserEmail(profile.email)
                if (profile.role.isNotBlank()) appPreferences.saveUserRole(profile.role)
                if (profile.jobTitle.isNotBlank()) appPreferences.saveJobTitle(profile.jobTitle)
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    employeeCode = profile.employeeCode,
                    employeeName = profile.fullName,
                    email = profile.email,
                    role = profile.role,
                    roleName = profile.roleName,
                    jobTitle = profile.jobTitle,
                    error = null
                )
                Timber.d("Profile loaded: ${profile.email}, job=${profile.jobTitle}")
            } catch (e: Exception) {
                Timber.e(e, "Failed to load profile — showing cached data")
                // Never log the user out from a profile refresh failure.
                // The profile screen always falls back to cached preferences data.
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = null   // silent failure — cached data is already shown
                )
            }
        }
    }

    fun updateProfileImage(uri: Uri) {
        viewModelScope.launch {
            try {
                val destFile = File(context.filesDir, "profile_image.jpg")
                context.contentResolver.openInputStream(uri)?.use { input ->
                    val bitmap = BitmapFactory.decodeStream(input)
                    FileOutputStream(destFile).use { out ->
                        bitmap.compress(Bitmap.CompressFormat.JPEG, 85, out)
                    }
                }
                appPreferences.saveProfileImagePath(destFile.absolutePath)
                _uiState.value = _uiState.value.copy(profileImagePath = destFile.absolutePath)
                Timber.d("Profile image saved: ${destFile.absolutePath}")
            } catch (e: Exception) {
                Timber.e(e, "Failed to save profile image")
                _uiState.value = _uiState.value.copy(error = "Failed to save image")
            }
        }
    }

    fun updateEmail(newEmail: String) {
        if (newEmail.isBlank() || newEmail == _uiState.value.email) return
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isUpdatingEmail = true, error = null, emailUpdateSuccess = false)
                firebaseAuthHelper.updateEmail(newEmail)
                appPreferences.saveUserEmail(newEmail)
                _uiState.value = _uiState.value.copy(
                    isUpdatingEmail = false,
                    email = newEmail,
                    emailUpdateSuccess = true
                )
                Timber.d("Email updated to $newEmail")
            } catch (e: Exception) {
                Timber.e(e, "Failed to update email")
                _uiState.value = _uiState.value.copy(
                    isUpdatingEmail = false,
                    error = e.message ?: "Failed to update email"
                )
            }
        }
    }

    fun setBiometricEnabled(enabled: Boolean) {
        appPreferences.setBiometricEnabled(enabled)
        _uiState.value = _uiState.value.copy(biometricEnabled = enabled)
    }

    fun setFaceIdEnabled(enabled: Boolean) {
        appPreferences.saveFaceIdEnabled(enabled)
        _uiState.value = _uiState.value.copy(faceIdEnabled = enabled)
    }

    fun saveFaceIdImage(bitmap: Bitmap) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(faceIdSetupLoading = true, faceIdSetupError = null)
            FaceIdHelper.validateFace(bitmap) { valid, message ->
                if (valid) {
                    val path = FaceIdHelper.saveFaceImage(bitmap, context)
                    appPreferences.saveFaceImagePath(path)
                    appPreferences.saveFaceIdEnabled(true)
                    _uiState.value = _uiState.value.copy(
                        faceIdSetupLoading = false,
                        faceIdSetUp = true,
                        faceIdEnabled = true,
                        faceIdSetupError = null
                    )
                } else {
                    _uiState.value = _uiState.value.copy(
                        faceIdSetupLoading = false,
                        faceIdSetupError = message
                    )
                }
            }
        }
    }

    fun clearFaceId() {
        FaceIdHelper.clearFaceImage(context)
        appPreferences.clearFaceImagePath()
        appPreferences.saveFaceIdEnabled(false)
        _uiState.value = _uiState.value.copy(faceIdSetUp = false, faceIdEnabled = false)
    }

    fun logout() {
        viewModelScope.launch {
            try {
                firebaseAuthHelper.logout()
                appPreferences.clearJwtToken()
            } catch (e: Exception) {
                Timber.e(e, "Logout error")
            }
        }
    }

    fun dismissError() {
        _uiState.value = _uiState.value.copy(error = null, emailUpdateSuccess = false)
    }
}
