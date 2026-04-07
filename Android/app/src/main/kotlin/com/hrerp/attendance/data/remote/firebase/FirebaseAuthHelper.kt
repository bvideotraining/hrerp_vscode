package com.hrerp.attendance.data.remote.firebase

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import timber.log.Timber
import javax.inject.Inject
import javax.inject.Singleton

@Singleton

class FirebaseAuthHelper @Inject constructor() {
    private val firebaseAuth = FirebaseAuth.getInstance()

    val currentUser: FirebaseUser? get() = firebaseAuth.currentUser

    suspend fun loginWithEmail(email: String, password: String): String {
        return suspendCancellableCoroutine { continuation ->
            firebaseAuth.signInWithEmailAndPassword(email, password)
                .addOnSuccessListener { authResult ->
                    Timber.d("Firebase login successful for $email")
                    continuation.resume(authResult.user?.uid ?: "")
                }
                .addOnFailureListener { exception ->
                    Timber.e(exception, "Firebase login failed")
                    continuation.resumeWithException(exception)
                }
        }
    }

    suspend fun signupWithEmail(email: String, password: String, fullName: String): String {
        return suspendCancellableCoroutine { continuation ->
            firebaseAuth.createUserWithEmailAndPassword(email, password)
                .addOnSuccessListener { authResult ->
                    val user = authResult.user
                    if (user != null) {
                        val profileUpdates = com.google.firebase.auth.UserProfileChangeRequest.Builder()
                            .setDisplayName(fullName)
                            .build()
                        user.updateProfile(profileUpdates)
                            .addOnSuccessListener {
                                Timber.d("Firebase signup successful for $email")
                                continuation.resume(user.uid)
                            }
                            .addOnFailureListener { exception ->
                                Timber.e(exception, "Failed to update profile")
                                continuation.resumeWithException(exception)
                            }
                    } else {
                        continuation.resumeWithException(Exception("User creation failed"))
                    }
                }
                .addOnFailureListener { exception ->
                    Timber.e(exception, "Firebase signup failed")
                    continuation.resumeWithException(exception)
                }
        }
    }

    suspend fun getIdToken(forceRefresh: Boolean = false): String {
        return suspendCancellableCoroutine { continuation ->
            val user = firebaseAuth.currentUser
            if (user != null) {
                user.getIdToken(forceRefresh)
                    .addOnSuccessListener { result ->
                        val idToken = result.token
                        Timber.d("Firebase ID token obtained")
                        if (idToken != null) {
                            continuation.resume(idToken)
                        } else {
                            continuation.resumeWithException(Exception("ID token is null"))
                        }
                    }
                    .addOnFailureListener { exception ->
                        Timber.e(exception, "Failed to get ID token")
                        continuation.resumeWithException(exception)
                    }
            } else {
                continuation.resumeWithException(Exception("No user logged in"))
            }
        }
    }

    suspend fun logout() {
        firebaseAuth.signOut()
        Timber.d("Firebase user logged out")
    }

    fun isUserLoggedIn(): Boolean = firebaseAuth.currentUser != null

    suspend fun resetPassword(email: String) {
        return suspendCancellableCoroutine { continuation ->
            firebaseAuth.sendPasswordResetEmail(email)
                .addOnSuccessListener {
                    Timber.d("Password reset email sent to $email")
                    continuation.resume(Unit)
                }
                .addOnFailureListener { exception ->
                    Timber.e(exception, "Failed to send password reset email")
                    continuation.resumeWithException(exception)
                }
        }
    }

    suspend fun updateEmail(newEmail: String) {
        return suspendCancellableCoroutine { continuation ->
            val user = firebaseAuth.currentUser
                ?: return@suspendCancellableCoroutine continuation.resumeWithException(Exception("No authenticated user"))
            user.updateEmail(newEmail)
                .addOnSuccessListener {
                    Timber.d("Firebase email updated to $newEmail")
                    continuation.resume(Unit)
                }
                .addOnFailureListener { exception ->
                    Timber.e(exception, "Failed to update Firebase email")
                    continuation.resumeWithException(exception)
                }
        }
    }
}
