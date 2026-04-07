package com.hrerp.attendance.util

import android.content.Context
import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream

object FaceIdHelper {

    private val detector by lazy {
        val options = FaceDetectorOptions.Builder()
            .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
            .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
            .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
            .build()
        FaceDetection.getClient(options)
    }

    /**
     * Validates that the bitmap contains exactly one face.
     * Calls onResult(isValid, message).
     */
    fun validateFace(bitmap: Bitmap, onResult: (Boolean, String) -> Unit) {
        val image = InputImage.fromBitmap(bitmap, 0)
        detector.process(image)
            .addOnSuccessListener { faces ->
                when {
                    faces.isEmpty() -> onResult(false, "No face detected. Please look directly at the camera.")
                    faces.size > 1 -> onResult(false, "Multiple faces detected. Please ensure only one face is in the frame.")
                    else -> {
                        Timber.d("FaceIdHelper: face validated successfully")
                        onResult(true, "Face detected successfully")
                    }
                }
            }
            .addOnFailureListener { e ->
                Timber.e(e, "FaceIdHelper: face detection failed")
                onResult(false, "Failed to detect face. Please try again.")
            }
    }

    /**
     * Saves the face bitmap to internal app storage (files/face_id/face_reference.jpg).
     * Returns the absolute path of the saved file.
     */
    fun saveFaceImage(bitmap: Bitmap, context: Context): String {
        val dir = File(context.filesDir, "face_id")
        dir.mkdirs()
        val file = File(dir, "face_reference.jpg")
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, 90, out)
        }
        Timber.d("FaceIdHelper: image saved to ${file.absolutePath}")
        return file.absolutePath
    }

    /**
     * Deletes the stored face reference image.
     */
    fun clearFaceImage(context: Context) {
        val file = File(context.filesDir, "face_id/face_reference.jpg")
        if (file.exists()) {
            file.delete()
            Timber.d("FaceIdHelper: face image cleared")
        }
    }
}
