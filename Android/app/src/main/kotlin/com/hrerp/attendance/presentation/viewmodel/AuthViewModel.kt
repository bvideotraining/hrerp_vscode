package com.hrerp.attendance.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hrerp.attendance.data.remote.api.User
import com.hrerp.attendance.data.remote.api.VerifyEmployeeCodeData
import com.hrerp.attendance.data.remote.repositories.AuthRepository
import com.hrerp.attendance.data.remote.firebase.FirebaseAuthHelper
import com.hrerp.attendance.domain.usecase.RegisterDeviceUseCase
import com.hrerp.attendance.domain.usecase.VerifyEmployeeCodeUseCase
import com.hrerp.attendance.util.AppPreferences
import com.hrerp.attendance.util.BiometricHelper
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import timber.log.Timber
import javax.inject.Inject

data class AuthUiState(
    val isLoading: Boolean = false,
    val user: User? = null,
    val error: String? = null,
    val isLoggedIn: Boolean = false,
    val idToken: String? = null,
    val biometricRequired: Boolean = false,
    val faceIdSetUp: Boolean = false,
    val employeeCodeVerified: Boolean = false,
    val verifiedEmployeeName: String = "",
    val verifiedEmployeeId: String = "",
    val accountExists: Boolean = false,
    val verifyLoading: Boolean = false,
    val verifyError: String? = null
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val firebaseAuthHelper: FirebaseAuthHelper,
    private val authRepository: AuthRepository,
    private val appPreferences: AppPreferences,
    private val registerDeviceUseCase: RegisterDeviceUseCase,
    private val verifyEmployeeCodeUseCase: VerifyEmployeeCodeUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState: StateFlow<AuthUiState> = _uiState

    init {
        // Start in loading so the Login screen shows a spinner while we check
        // for an existing session rather than flashing the login form.
        _uiState.value = AuthUiState(isLoading = true)
        checkCurrentUser()
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                Timber.d("Attempting Firebase sign-in for $email")

                // Clear any stale user data from a previous account before saving new user's data
                appPreferences.saveUserFullName("")
                appPreferences.saveJobTitle("")

                firebaseAuthHelper.loginWithEmail(email, password)

                val idToken = firebaseAuthHelper.getIdToken()
                if (idToken != null) {
                    // Exchange Firebase token for JWT
                    val tokenResponse = authRepository.exchangeFirebaseToken(idToken)
                    val jwtToken = tokenResponse.data?.jwtToken

                    // Decode JWT payload to extract employeeId and save to prefs
                    if (jwtToken != null) {
                        try {
                            val parts = jwtToken.split(".")
                            if (parts.size == 3) {
                                val payload = String(android.util.Base64.decode(
                                    parts[1].replace('-', '+').replace('_', '/'),
                                    android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING
                                ))
                                val json = org.json.JSONObject(payload)
                                val empId = json.optString("employeeId", "")
                                val sub = json.optString("sub", "")
                                val role = json.optString("role", "")
                                val accessType = json.optString("accessType", "")
                                if (empId.isNotEmpty()) appPreferences.saveEmployeeId(empId)
                                if (sub.isNotEmpty()) appPreferences.saveUserId(sub)
                                if (role.isNotEmpty()) appPreferences.saveUserRole(role)
                                if (accessType.isNotEmpty()) appPreferences.saveUserAccessType(accessType)
                                appPreferences.saveUserEmail(email)
                                appPreferences.savePassword(password)
                                Timber.d("JWT decoded — employeeId=$empId sub=$sub role=$role")
                            }
                        } catch (e: Exception) {
                            Timber.w(e, "Failed to decode JWT payload")
                        }
                    }

                    val user = User(
                        id = "current_user",
                        email = email,
                        name = "",
                        role = "EMPLOYEE"
                    )

                    // Register this device in background (best-effort)
                    viewModelScope.launch {
                        try {
                            registerDeviceUseCase("")
                        } catch (e: Exception) {
                            Timber.w(e, "Device registration failed (non-fatal)")
                        }
                    }

                    // Fetch fresh profile to cache the correct user's name/jobTitle
                    viewModelScope.launch {
                        try {
                            val profile = authRepository.getProfile()
                            if (profile.fullName.isNotBlank()) appPreferences.saveUserFullName(profile.fullName)
                            if (profile.jobTitle.isNotBlank()) appPreferences.saveJobTitle(profile.jobTitle)
                            if (profile.employeeCode.isNotBlank()) appPreferences.saveEmployeeId(profile.employeeCode)
                            Timber.d("Post-login profile cached: ${profile.fullName}")
                        } catch (e: Exception) {
                            Timber.w(e, "Post-login profile fetch failed (non-fatal)")
                        }
                    }

                    _uiState.value = AuthUiState(
                        isLoading = false,
                        user = user,
                        isLoggedIn = true,
                        idToken = jwtToken
                    )
                    Timber.d("Sign-in successful")
                } else {
                    throw Exception("Failed to get ID token")
                }
            } catch (e: Exception) {
                Timber.e(e, "Sign-in failed")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Sign-in failed"
                )
            }
        }
    }

    fun verifyEmployeeCode(code: String) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(verifyLoading = true, verifyError = null, employeeCodeVerified = false)
                val data = verifyEmployeeCodeUseCase(code)
                _uiState.value = _uiState.value.copy(
                    verifyLoading = false,
                    employeeCodeVerified = true,
                    verifiedEmployeeName = data.fullName,
                    verifiedEmployeeId = data.id,
                    accountExists = data.accountExists
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    verifyLoading = false,
                    employeeCodeVerified = false,
                    verifiedEmployeeName = "",
                    verifiedEmployeeId = "",
                    verifyError = "Employee code not found"
                )
            }
        }
    }

    fun resetVerification() {
        _uiState.value = _uiState.value.copy(
            employeeCodeVerified = false,
            verifiedEmployeeName = "",
            verifiedEmployeeId = "",
            verifyError = null
        )
    }

    fun signUp(email: String, password: String, employeeCode: String, employeeId: String, employeeName: String) {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                Timber.d("Starting signup for $email with employee code $employeeCode")

                // Create Firebase user
                firebaseAuthHelper.signupWithEmail(email, password, employeeName)

                // Register the user in the backend (fatal — must succeed)
                authRepository.signupWithEmail(email, password, employeeName, employeeCode, employeeId)
                Timber.d("Backend registration succeeded for $email")

                // Get ID token and exchange for JWT
                val idToken = firebaseAuthHelper.getIdToken()
                val tokenResponse = authRepository.exchangeFirebaseToken(idToken)
                val jwtToken = tokenResponse.data?.jwtToken

                if (jwtToken != null) {
                    // Save credentials to prefs
                    appPreferences.saveEmployeeId(employeeId)
                    appPreferences.saveUserEmail(email)
                    appPreferences.saveUserFullName(employeeName)

                    // Register device in background
                    viewModelScope.launch {
                        try {
                            registerDeviceUseCase("")
                        } catch (e: Exception) {
                            Timber.w(e, "Device registration failed post-signup (non-fatal)")
                        }
                    }

                    val user = User(id = "current_user", email = email, name = employeeName, role = "EMPLOYEE")
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        user = user,
                        isLoggedIn = true,
                        idToken = jwtToken
                    )
                    Timber.d("Signup successful for $email")
                } else {
                    throw Exception("Failed to get ID token after signup")
                }
            } catch (e: Exception) {
                Timber.e(e, "Signup failed")
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Sign-up failed"
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            try {
                firebaseAuthHelper.logout()
                _uiState.value = AuthUiState()
                Timber.d("User logged out successfully")
            } catch (e: Exception) {
                Timber.e(e, "Logout failed")
            }
        }
    }

    private fun checkCurrentUser() {
        viewModelScope.launch {
            try {
                val hasToken = appPreferences.getJwtToken() != null
                val biometricEnabled = appPreferences.isBiometricEnabled()

                if (biometricEnabled && hasToken) {
                    // Keep JWT intact and ask the login screen to show biometric prompt
                    Timber.d("Biometric is enabled and JWT exists — prompting biometric")
                    _uiState.value = AuthUiState(
                        isLoading = false,
                        biometricRequired = true,
                        faceIdSetUp = appPreferences.getFaceImagePath() != null
                    )
                    return@launch
                }

                // Otherwise, clear any persisted session and go to standard login
                val currentUser = firebaseAuthHelper.currentUser
                if (currentUser != null) {
                    Timber.d("Clearing persisted Firebase session for ${currentUser.email} — login required")
                    firebaseAuthHelper.logout()
                }
                appPreferences.clearJwtToken()
                _uiState.value = AuthUiState(faceIdSetUp = appPreferences.getFaceImagePath() != null)
            } catch (e: Exception) {
                Timber.e(e, "Error during startup session clear")
                _uiState.value = AuthUiState()
            }
        }
    }

    /** Called when biometric authentication succeeds — refresh JWT via Firebase then restore session. */
    fun loginWithBiometric() {
        viewModelScope.launch {
            try {
                _uiState.value = _uiState.value.copy(isLoading = true, error = null)
                val email = appPreferences.getUserEmail() ?: ""

                // Try to get a fresh Firebase ID token; silently re-authenticate if the
                // session has expired (Firebase currentUser becomes null after long inactivity).
                val idToken: String? = try {
                    firebaseAuthHelper.getIdToken(forceRefresh = true)
                } catch (sessionExpired: Exception) {
                    Timber.w(sessionExpired, "Firebase session expired — attempting silent re-auth")
                    val savedPassword = appPreferences.getPassword()
                    if (!savedPassword.isNullOrEmpty() && email.isNotEmpty()) {
                        try {
                            firebaseAuthHelper.loginWithEmail(email, savedPassword)
                            firebaseAuthHelper.getIdToken(forceRefresh = false)
                        } catch (reAuthFailed: Exception) {
                            Timber.e(reAuthFailed, "Silent re-auth with saved credentials failed")
                            null
                        }
                    } else null
                }

                if (idToken == null) {
                    appPreferences.clearJwtToken()
                    _uiState.value = AuthUiState(error = "Session expired. Please sign in again.")
                    return@launch
                }

                val tokenResponse = authRepository.exchangeFirebaseToken(idToken)
                val jwtToken = tokenResponse.data?.jwtToken
                    ?: throw Exception("Failed to refresh session token")

                // Decode JWT to keep role/accessType current after token refresh
                try {
                    val parts = jwtToken.split(".")
                    if (parts.size == 3) {
                        val payload = String(android.util.Base64.decode(
                            parts[1].replace('-', '+').replace('_', '/'),
                            android.util.Base64.NO_WRAP or android.util.Base64.NO_PADDING
                        ))
                        val json = org.json.JSONObject(payload)
                        val role = json.optString("role", "")
                        val accessType = json.optString("accessType", "")
                        if (role.isNotEmpty()) appPreferences.saveUserRole(role)
                        if (accessType.isNotEmpty()) appPreferences.saveUserAccessType(accessType)
                    }
                } catch (e: Exception) {
                    Timber.w(e, "JWT decode in biometric login failed (non-fatal)")
                }

                _uiState.value = AuthUiState(
                    isLoading = false,
                    user = User(
                        id = "current_user",
                        email = email,
                        name = appPreferences.getUserFullName() ?: "",
                        role = appPreferences.getUserRole() ?: "employee"
                    ),
                    isLoggedIn = true,
                    idToken = jwtToken
                )
                Timber.d("Biometric sign-in successful (JWT refreshed)")
            } catch (e: Exception) {
                Timber.e(e, "Biometric sign-in failed")
                appPreferences.clearJwtToken()
                _uiState.value = AuthUiState(error = "Session expired. Please sign in again.")
            }
        }
    }

    /** Called when the user cancels biometric — force full credential login. */
    fun cancelBiometric() {
        viewModelScope.launch {
            try {
                firebaseAuthHelper.logout()
            } catch (_: Exception) {}
            appPreferences.clearJwtToken()
            _uiState.value = AuthUiState()
        }
    }

    fun setBiometricEnabled(enabled: Boolean) = appPreferences.setBiometricEnabled(enabled)
    fun isBiometricEnabled(): Boolean = appPreferences.isBiometricEnabled()

    /** Called when Face ID biometric authentication succeeds — same token refresh as loginWithBiometric. */
    fun loginWithFaceId() {
        loginWithBiometric()
    }
}