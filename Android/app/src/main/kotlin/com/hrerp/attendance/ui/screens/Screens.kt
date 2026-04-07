package com.hrerp.attendance.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavController
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import android.graphics.BitmapFactory
import androidx.compose.ui.graphics.asImageBitmap
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapView
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CircleOptions
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.MarkerOptions
import com.hrerp.attendance.presentation.viewmodel.AuthViewModel
import com.hrerp.attendance.presentation.viewmodel.HistoryViewModel
import com.hrerp.attendance.presentation.viewmodel.HomeViewModel
import com.hrerp.attendance.presentation.viewmodel.LeavesViewModel
import com.hrerp.attendance.presentation.viewmodel.MembersViewModel
import com.hrerp.attendance.presentation.viewmodel.ProfileViewModel
import com.hrerp.attendance.util.BiometricHelper
import com.hrerp.attendance.util.FaceIdHelper
import timber.log.Timber
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────

@Composable
fun LoginScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    var faceIdValidating by remember { mutableStateOf(false) }
    val faceIdCameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            faceIdValidating = true
            FaceIdHelper.validateFace(bitmap) { valid, message ->
                faceIdValidating = false
                if (valid) { viewModel.loginWithFaceId() }
                else { coroutineScope.launch { snackbarHostState.showSnackbar(message) } }
            }
        }
    }

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) {
            navController.navigate("home") {
                popUpTo("login") { inclusive = true }
            }
        }
    }

    // Auto-trigger biometric prompt when a saved session is found
    LaunchedEffect(uiState.biometricRequired) {
        if (uiState.biometricRequired) {
            val activity = context as? AppCompatActivity ?: return@LaunchedEffect
            if (BiometricHelper.canAuthenticateWithBiometrics(context)) {
                BiometricHelper.showBiometricPrompt(
                    activity = activity,
                    title = "Biometric Login",
                    subtitle = "Use fingerprint or face ID to sign in",
                    negativeButtonText = "Use Password",
                    onSuccess = { viewModel.loginWithBiometric() },
                    onError = { _, _ -> viewModel.cancelBiometric() },
                    onFailed = {}
                )
            } else {
                // Device doesn't support biometrics — fall back to password login
                viewModel.cancelBiometric()
            }
        }
    }

    // Show a full-screen spinner while the initial session check runs.
    // This prevents the login form from flashing before navigation to Home.
    if (uiState.isLoading && !uiState.isLoggedIn && uiState.error == null && email.isEmpty()) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF1565C0)),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(color = Color.White)
        }
        return
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1565C0), Color(0xFF0D47A1))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(CircleShape)
                    .background(Color.White.copy(alpha = 0.2f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.Person,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(48.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "Employee Tracker",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Sign in to track your attendance",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.padding(top = 4.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Color.White) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            imageVector = if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null,
                            tint = Color.White
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White,
                    unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White,
                    unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            if (uiState.error != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFCDD2)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        uiState.error ?: "",
                        color = Color(0xFFB71C1C),
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = { viewModel.signIn(email, password) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = email.isNotEmpty() && password.isNotEmpty() && !uiState.isLoading,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color(0xFF1565C0)
                )
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color(0xFF1565C0),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Sign In", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Fingerprint login button — always shown; shows a message if not available/enrolled
            OutlinedButton(
                onClick = {
                    val (available, message) = BiometricHelper.isBiometricAvailable(context)
                    if (available) {
                        val activity = context as? AppCompatActivity
                        if (activity != null) {
                            BiometricHelper.showBiometricPrompt(
                                activity = activity,
                                title = "Fingerprint Login",
                                subtitle = "Use your fingerprint to sign in",
                                negativeButtonText = "Use Password",
                                onSuccess = { viewModel.loginWithBiometric() },
                                onError = { _, errStr -> Timber.e("Biometric error: $errStr") },
                                onFailed = {}
                            )
                        }
                    } else {
                        coroutineScope.launch { snackbarHostState.showSnackbar(message) }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.7f))
            ) {
                Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                Text("Login with Fingerprint")
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Face ID login button — always shown; informs user if not set up yet
            OutlinedButton(
                onClick = {
                    when {
                        !uiState.faceIdSetUp -> {
                            coroutineScope.launch {
                                snackbarHostState.showSnackbar(
                                    "Face ID is not set up yet. Please configure it in your Profile settings."
                                )
                            }
                        }
                        else -> faceIdCameraLauncher.launch(null)
                    }
                },
                enabled = !faceIdValidating,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
                border = androidx.compose.foundation.BorderStroke(1.dp, Color.White.copy(alpha = 0.7f))
            ) {
                if (faceIdValidating) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp).padding(end = 8.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                    Text("Verifying face...")
                } else {
                    Icon(Icons.Default.Face, contentDescription = null, modifier = Modifier.padding(end = 8.dp))
                    Text("Login with Face ID")
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Spacer(modifier = Modifier.height(24.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                Text("Don't have an account?", color = Color.White.copy(alpha = 0.8f))
                TextButton(onClick = { navController.navigate("signup") }) {
                    Text("Sign Up", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }
        }

        SnackbarHost(
            hostState = snackbarHostState,
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 16.dp)
        ) { data ->
            Snackbar(
                snackbarData = data,
                containerColor = Color(0xFF323232),
                contentColor = Color.White
            )
        }
    }
}

// ─── SIGNUP SCREEN ────────────────────────────────────────────────────────────

@Composable
fun SignupScreen(
    navController: NavController,
    viewModel: AuthViewModel = hiltViewModel()
) {
    var employeeCode by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    val uiState by viewModel.uiState.collectAsState()

    // Reset verification state when screen opens
    LaunchedEffect(Unit) {
        viewModel.resetVerification()
    }

    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) {
            navController.navigate("home") {
                popUpTo("signup") { inclusive = true }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(Color(0xFF1565C0), Color(0xFF0D47A1))
                )
            )
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))

            Box(modifier = Modifier.fillMaxWidth()) {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(Icons.Default.ArrowBack, contentDescription = "Back", tint = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "Create Account",
                style = MaterialTheme.typography.headlineMedium,
                color = Color.White,
                fontWeight = FontWeight.Bold
            )
            Text(
                "Enter your employee code to register",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.padding(top = 4.dp, bottom = 32.dp)
            )

            // Employee Code field with Verify button
            OutlinedTextField(
                value = employeeCode,
                onValueChange = {
                    val prev = employeeCode
                    employeeCode = it
                    // Reset verification only when the user actually edits the code
                    if (it != prev && (uiState.employeeCodeVerified || uiState.verifyError != null)) {
                        viewModel.resetVerification()
                    }
                },
                label = { Text("Employee Code", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Badge, contentDescription = null, tint = Color.White) },
                trailingIcon = {
                    when {
                        uiState.verifyLoading -> CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                        uiState.employeeCodeVerified -> Icon(
                            Icons.Default.CheckCircle,
                            contentDescription = "Verified",
                            tint = Color(0xFF4CAF50)
                        )
                        uiState.verifyError != null -> Icon(
                            Icons.Default.Cancel,
                            contentDescription = "Not found",
                            tint = Color(0xFFEF5350)
                        )
                        else -> IconButton(
                            onClick = {
                                if (employeeCode.isNotBlank()) {
                                    viewModel.verifyEmployeeCode(employeeCode.trim())
                                }
                            },
                            enabled = employeeCode.isNotBlank()
                        ) {
                            Icon(Icons.Default.Search, contentDescription = "Verify", tint = Color.White)
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { focusState ->
                        if (!focusState.isFocused
                            && employeeCode.isNotBlank()
                            && !uiState.employeeCodeVerified
                            && !uiState.verifyLoading
                            && uiState.verifyError == null
                        ) {
                            viewModel.verifyEmployeeCode(employeeCode.trim())
                        }
                    },
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                    focusedBorderColor = if (uiState.employeeCodeVerified) Color(0xFF4CAF50)
                        else if (uiState.verifyError != null) Color(0xFFEF5350)
                        else Color.White,
                    unfocusedBorderColor = if (uiState.employeeCodeVerified) Color(0xFF4CAF50)
                        else if (uiState.verifyError != null) Color(0xFFEF5350)
                        else Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            if (uiState.verifyError != null) {
                Text(
                    uiState.verifyError!!,
                    color = Color(0xFFEF9A9A),
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 4.dp, top = 4.dp)
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Account-already-exists warning
            if (uiState.accountExists) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFB71C1C).copy(alpha = 0.18f))
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFFCDD2), modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "An account already exists for this employee code. Please sign in instead.",
                            color = Color(0xFFFFCDD2),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
            }

            // Auto-filled employee name (read-only)
            if (uiState.employeeCodeVerified) {
                OutlinedTextField(
                    value = uiState.verifiedEmployeeName,
                    onValueChange = {},
                    label = { Text("Employee Name", color = Color(0xFF4CAF50)) },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null, tint = Color(0xFF4CAF50)) },
                    trailingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color(0xFF4CAF50)) },
                    readOnly = true,
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                        focusedBorderColor = Color(0xFF4CAF50), unfocusedBorderColor = Color(0xFF4CAF50),
                        cursorColor = Color.White,
                        disabledTextColor = Color.White
                    )
                )
                Spacer(modifier = Modifier.height(16.dp))
            }

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null, tint = Color.White) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White, unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Password", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White) },
                trailingIcon = {
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Icon(
                            if (passwordVisible) Icons.Default.Visibility else Icons.Default.VisibilityOff,
                            contentDescription = null, tint = Color.White
                        )
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White, unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                label = { Text("Confirm Password", color = Color.White.copy(alpha = 0.7f)) },
                leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null, tint = Color.White) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = Color.White, unfocusedTextColor = Color.White,
                    focusedBorderColor = Color.White, unfocusedBorderColor = Color.White.copy(alpha = 0.5f),
                    cursorColor = Color.White
                )
            )

            val displayError = errorMessage ?: uiState.error
            if (displayError != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFCDD2)),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        displayError,
                        color = Color(0xFFB71C1C),
                        modifier = Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = {
                    errorMessage = null
                    when {
                        !uiState.employeeCodeVerified -> errorMessage = "Please verify your employee code first"
                        email.isBlank() -> errorMessage = "Please enter your email"
                        password.length < 6 -> errorMessage = "Password must be at least 6 characters"
                        password != confirmPassword -> errorMessage = "Passwords do not match"
                        else -> viewModel.signUp(
                            email.trim(),
                            password,
                            employeeCode.trim(),
                            uiState.verifiedEmployeeId,
                            uiState.verifiedEmployeeName
                        )
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = !uiState.isLoading && uiState.employeeCodeVerified && !uiState.accountExists,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color(0xFF1565C0),
                    disabledContainerColor = Color.White.copy(alpha = 0.4f),
                    disabledContentColor = Color(0xFF1565C0).copy(alpha = 0.4f)
                )
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = Color(0xFF1565C0),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text("Create Account", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Already have an account?", color = Color.White.copy(alpha = 0.8f))
                TextButton(onClick = { navController.popBackStack() }) {
                    Text("Sign In", color = Color.White, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

// ─── HOME SCREEN ──────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    navController: NavController,
    viewModel: HomeViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    val scope = rememberCoroutineScope()
    var locationPermissionGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION)
                    == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        locationPermissionGranted = granted
        if (granted) viewModel.updateLocation()
    }

    LaunchedEffect(locationPermissionGranted) {
        if (locationPermissionGranted) viewModel.updateLocation()
        else permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION)
    }

    LaunchedEffect(Unit) {
        viewModel.refreshProfileImage()
    }

    val userRole = uiState.userRole
    val userEmail = uiState.userEmail
    val userName = uiState.userName
    val isApproverRole = userRole.lowercase().let { it.contains("approver") }
    val isAdminRole = userRole.lowercase().let { it == "admin" || it == "hr_manager" } ||
            uiState.userAccessType.lowercase() == "full"

    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ModalDrawerSheet(modifier = Modifier.width(280.dp)) {
                // ── Header ──────────────────────────────────────────────────
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1565C0))
                        .padding(vertical = 32.dp, horizontal = 20.dp)
                ) {
                    Column {
                        // Profile image — use saved photo if available, otherwise show default icon
                        val drawerImageBitmap = remember(uiState.profileImagePath) {
                            uiState.profileImagePath?.let {
                                runCatching { BitmapFactory.decodeFile(it)?.asImageBitmap() }.getOrNull()
                            }
                        }
                        Box(
                            modifier = Modifier
                                .size(64.dp)
                                .clip(CircleShape)
                                .background(Color.White.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (drawerImageBitmap != null) {
                                androidx.compose.foundation.Image(
                                    bitmap = drawerImageBitmap,
                                    contentDescription = "Profile photo",
                                    modifier = Modifier
                                        .size(64.dp)
                                        .clip(CircleShape),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                                )
                            } else {
                                Icon(
                                    Icons.Default.Person,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Modifier.size(40.dp)
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            userName.ifEmpty { "Employee" },
                            style = MaterialTheme.typography.titleMedium,
                            color = Color.White,
                            fontWeight = FontWeight.Bold
                        )
                        Text(
                            userEmail,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.8f)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color.White.copy(alpha = 0.2f)
                        ) {
                            Text(
                                when {
                                    isAdminRole -> "Application Admin"
                                    userRole.lowercase().contains("branch_approver") ||
                                            userRole.lowercase().contains("branch approver") -> "Branch Approver"
                                    isApproverRole -> "Approver"
                                    else -> "Employee"
                                },
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                // ── Navigation items ────────────────────────────────────────
                NavigationDrawerItem(
                    label = { Text("Home") },
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    selected = true,
                    onClick = { scope.launch { drawerState.close() } },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                NavigationDrawerItem(
                    label = { Text("History") },
                    icon = { Icon(Icons.Default.History, contentDescription = null) },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            navController.navigate("history")
                        }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                NavigationDrawerItem(
                    label = { Text("My Leaves") },
                    icon = { Icon(Icons.Default.BeachAccess, contentDescription = null) },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            navController.navigate("leaves")
                        }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                NavigationDrawerItem(
                    label = { Text("Profile") },
                    icon = { Icon(Icons.Default.Person, contentDescription = null) },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            navController.navigate("profile")
                        }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                NavigationDrawerItem(
                    label = { Text("Settings") },
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            navController.navigate("settings")
                        }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                if (isApproverRole || isAdminRole) {
                    Divider(modifier = Modifier.padding(vertical = 8.dp, horizontal = 12.dp))
                    NavigationDrawerItem(
                        label = { Text("Pending Approvals") },
                        icon = { Icon(Icons.Default.CheckCircle, contentDescription = null) },
                        selected = false,
                        onClick = {
                            scope.launch {
                                drawerState.close()
                                navController.navigate("leaves")
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                }
                if (isAdminRole) {
                    NavigationDrawerItem(
                        label = { Text("Members") },
                        icon = { Icon(Icons.Default.People, contentDescription = null) },
                        selected = false,
                        onClick = {
                            scope.launch {
                                drawerState.close()
                                navController.navigate("members")
                            }
                        },
                        modifier = Modifier.padding(horizontal = 12.dp)
                    )
                }
                Divider(modifier = Modifier.padding(vertical = 8.dp, horizontal = 12.dp))
                NavigationDrawerItem(
                    label = { Text("Sign Out", color = Color(0xFFC62828)) },
                    icon = {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = null,
                            tint = Color(0xFFC62828)
                        )
                    },
                    selected = false,
                    onClick = {
                        scope.launch {
                            drawerState.close()
                            authViewModel.logout()
                            navController.navigate("login") {
                                popUpTo("home") { inclusive = true }
                            }
                        }
                    },
                    modifier = Modifier.padding(horizontal = 12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    ) {
    // Branch switcher dropdown state
    var branchSwitcherExpanded by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text(
                            "HR ERP Attendance",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        // Show branch switcher if multiple branches assigned, else plain name
                        if (uiState.assignedBranches.size > 1) {
                            Box {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.clickable { branchSwitcherExpanded = true }
                                ) {
                                    Text(
                                        uiState.selectedBranch?.branchName ?: uiState.branchInfo?.name ?: "Select branch",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Color.White.copy(alpha = 0.9f)
                                    )
                                    Icon(
                                        Icons.Default.ArrowDropDown,
                                        contentDescription = "Switch branch",
                                        tint = Color.White.copy(alpha = 0.9f),
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                                DropdownMenu(
                                    expanded = branchSwitcherExpanded,
                                    onDismissRequest = { branchSwitcherExpanded = false }
                                ) {
                                    uiState.assignedBranches.forEach { branch ->
                                        val distM = uiState.branchDistances[branch.branchId]
                                        val distText = when {
                                            distM == null -> ""
                                            distM >= 1000f -> " — ${"%.1f".format(distM / 1000f)} km"
                                            else -> " — ${distM.toInt()} m"
                                        }
                                        val isWithin = distM != null && distM <= branch.radiusMeters
                                        val isSelected = uiState.selectedBranch?.branchId == branch.branchId
                                        DropdownMenuItem(
                                            text = {
                                                Row(verticalAlignment = Alignment.CenterVertically) {
                                                    if (isWithin) Icon(
                                                        Icons.Default.CheckCircle,
                                                        contentDescription = null,
                                                        tint = Color(0xFF2E7D32),
                                                        modifier = Modifier.size(16.dp).padding(end = 4.dp)
                                                    )
                                                    Text(
                                                        "${branch.branchName}$distText",
                                                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal
                                                    )
                                                }
                                            },
                                            onClick = {
                                                viewModel.selectBranch(branch.branchId)
                                                branchSwitcherExpanded = false
                                            }
                                        )
                                    }
                                }
                            }
                        } else {
                            uiState.branchInfo?.let {
                                Text(
                                    it.name,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.8f)
                                )
                            }
                        }
                    }
                },
                navigationIcon = {
                    IconButton(onClick = { scope.launch { drawerState.open() } }) {
                        Icon(Icons.Default.Menu, contentDescription = "Menu")
                    }
                },
                actions = {
                    IconButton(onClick = { navController.navigate("profile") }) {
                        Icon(Icons.Default.Person, contentDescription = "Profile")
                    }
                    IconButton(onClick = { navController.navigate("settings") }) {
                        Icon(Icons.Default.Settings, contentDescription = "Settings")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                    label = { Text("Home") },
                    selected = true,
                    onClick = {}
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.History, contentDescription = "History") },
                    label = { Text("History") },
                    selected = false,
                    onClick = { navController.navigate("history") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = "Settings") },
                    label = { Text("Settings") },
                    selected = false,
                    onClick = { navController.navigate("settings") }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // ── MAP SECTION ──────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
            ) {
                if (locationPermissionGranted) {
                    val currentLoc = uiState.currentLocation
                    val branch = uiState.branchInfo

                    // Hold a reference to GoogleMap so we can move the camera
                    // reactively when the location arrives after map creation.
                    var googleMapRef by remember { mutableStateOf<GoogleMap?>(null) }

                    // Zoom to user location whenever it updates
                    LaunchedEffect(currentLoc) {
                        if (currentLoc != null) {
                            val latLng = LatLng(currentLoc.first, currentLoc.second)
                            googleMapRef?.animateCamera(CameraUpdateFactory.newLatLngZoom(latLng, 16f))
                        }
                    }

                    AndroidView(
                        factory = { ctx ->
                            MapView(ctx).apply {
                                onCreate(null)
                                getMapAsync { map ->
                                    googleMapRef = map
                                    map.uiSettings.isZoomControlsEnabled = true
                                    map.uiSettings.isMyLocationButtonEnabled = true
                                    try { map.isMyLocationEnabled = true } catch (_: SecurityException) {}

                                    // Move camera immediately if location is already known
                                    if (currentLoc != null) {
                                        val latLng = LatLng(currentLoc.first, currentLoc.second)
                                        map.moveCamera(CameraUpdateFactory.newLatLngZoom(latLng, 16f))
                                    }

                                    // Draw all assigned branches: selected=blue, others=orange
                                    val allBranches = uiState.assignedBranches
                                    if (allBranches.isNotEmpty()) {
                                        allBranches.forEach { assignedBranch ->
                                            val lat = assignedBranch.latitude ?: return@forEach
                                            val lng = assignedBranch.longitude ?: return@forEach
                                            val bLatLng = LatLng(lat, lng)
                                            val isSelected = uiState.selectedBranch?.branchId == assignedBranch.branchId
                                            val hue = if (isSelected) BitmapDescriptorFactory.HUE_AZURE
                                                      else BitmapDescriptorFactory.HUE_ORANGE
                                            val strokeColor = if (isSelected)
                                                android.graphics.Color.parseColor("#1565C0")
                                            else
                                                android.graphics.Color.parseColor("#E65100")
                                            val fillColor = if (isSelected)
                                                android.graphics.Color.parseColor("#201565C0")
                                            else
                                                android.graphics.Color.parseColor("#15E65100")
                                            map.addMarker(
                                                MarkerOptions()
                                                    .position(bLatLng)
                                                    .title(assignedBranch.branchName)
                                                    .icon(BitmapDescriptorFactory.defaultMarker(hue))
                                            )
                                            map.addCircle(
                                                CircleOptions()
                                                    .center(bLatLng)
                                                    .radius(assignedBranch.radiusMeters.toDouble())
                                                    .strokeColor(strokeColor)
                                                    .fillColor(fillColor)
                                                    .strokeWidth(2f)
                                            )
                                        }
                                    } else if (branch != null) {
                                        // Fallback: single branch (backward compat)
                                        val branchLatLng = LatLng(branch.latitude, branch.longitude)
                                        map.addMarker(
                                            MarkerOptions()
                                                .position(branchLatLng)
                                                .title(branch.name)
                                                .icon(BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_BLUE))
                                        )
                                        map.addCircle(
                                            CircleOptions()
                                                .center(branchLatLng)
                                                .radius(branch.radiusMeters.toDouble())
                                                .strokeColor(android.graphics.Color.parseColor("#1565C0"))
                                                .fillColor(android.graphics.Color.parseColor("#201565C0"))
                                                .strokeWidth(2f)
                                        )
                                    }
                                }
                                onResume()
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                } else {
                    Column(
                        modifier = Modifier.fillMaxSize(),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.LocationOff,
                            contentDescription = null,
                            modifier = Modifier.size(64.dp),
                            tint = MaterialTheme.colorScheme.outline
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Text("Location permission required", style = MaterialTheme.typography.bodyLarge)
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = { permissionLauncher.launch(Manifest.permission.ACCESS_FINE_LOCATION) }
                        ) {
                            Text("Grant Permission")
                        }
                    }
                }

                // Distance badge overlay
                if (uiState.currentLocation != null && uiState.branchInfo != null) {
                    Card(
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(12.dp),
                        colors = CardDefaults.cardColors(containerColor = Color(0xFF1565C0)),
                        elevation = CardDefaults.cardElevation(4.dp),
                        shape = RoundedCornerShape(20.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.NearMe,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            val distText = if (uiState.distanceMeters >= 1000f)
                                "${"%.1f".format(uiState.distanceMeters / 1000f)} km"
                            else
                                "${uiState.distanceMeters.roundToInt()} m"
                            Text(
                                "to branch: $distText",
                                color = Color.White,
                                style = MaterialTheme.typography.bodySmall,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }

            // ── INFO + ACTIONS SECTION ────────────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(16.dp)
            ) {
                val (statusColor, statusText) = when {
                    uiState.currentLocation == null -> Pair(Color(0xFF9E9E9E), "Locating...")
                    uiState.isWithinGeofence -> Pair(Color(0xFF2E7D32), "✓ Within branch area")
                    else -> Pair(Color(0xFFC62828), "✗ Outside branch area")
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(10.dp)
                                .clip(CircleShape)
                                .background(statusColor)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            statusText,
                            color = statusColor,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                    }
                    if (uiState.isLoading) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    } else {
                        IconButton(
                            onClick = { viewModel.updateLocation() },
                            modifier = Modifier.size(32.dp)
                        ) {
                            Icon(
                                Icons.Default.Refresh,
                                contentDescription = "Refresh location",
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }
                }

                if (uiState.error != null) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 12.dp)
                    ) {
                        Text(
                            uiState.error ?: "",
                            color = Color(0xFFB71C1C),
                            modifier = Modifier.padding(12.dp),
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }

                val checkinEnabled = uiState.currentLocation != null && !uiState.checkingIn

                // Show which branch + employee code will be used for this check-in
                uiState.selectedBranch?.let { sb ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(bottom = 8.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(Color(0xFFE3F2FD))
                            .padding(horizontal = 12.dp, vertical = 6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.Business,
                            contentDescription = null,
                            tint = Color(0xFF1565C0),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            buildString {
                                append("Checking in at: ")
                                append(sb.branchName)
                                if (sb.employeeCode.isNotBlank()) append(" (${sb.employeeCode})")
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF1565C0),
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Button(
                        onClick = { viewModel.performCheckIn("check-in") },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        enabled = checkinEnabled && !uiState.isCheckedIn,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF2E7D32))
                    ) {
                        if (uiState.checkingIn) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                Icons.Default.Login,
                                contentDescription = null,
                                modifier = Modifier.size(20.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Check In", fontWeight = FontWeight.Bold)
                        }
                    }

                    Button(
                        onClick = { viewModel.performCheckIn("check-out") },
                        modifier = Modifier
                            .weight(1f)
                            .height(56.dp),
                        enabled = checkinEnabled && uiState.isCheckedIn,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
                    ) {
                        Icon(
                            Icons.Default.Logout,
                            contentDescription = null,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Check Out", fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedButton(
                        onClick = { navController.navigate("history") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            Icons.Default.History,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("History", style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(
                        onClick = { navController.navigate("profile") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Person,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Profile", style = MaterialTheme.typography.bodySmall)
                    }
                    OutlinedButton(
                        onClick = { navController.navigate("offline_sync") },
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Icon(
                            Icons.Default.Sync,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Sync", style = MaterialTheme.typography.bodySmall)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedButton(
                    onClick = { navController.navigate("leaves") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Icon(
                        Icons.Default.BeachAccess,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("My Leaves", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
    } // end ModalNavigationDrawer
}

// ─── HISTORY SCREEN ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HistoryScreen(
    navController: NavController,
    viewModel: HistoryViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Attendance History") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Home") },
                    selected = false,
                    onClick = { navController.navigate("home") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.History, contentDescription = null) },
                    label = { Text("History") },
                    selected = true,
                    onClick = {}
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Settings") },
                    selected = false,
                    onClick = { navController.navigate("settings") }
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Filter chips
            androidx.compose.foundation.lazy.LazyRow(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item {
                    FilterChip(selected = false, onClick = { viewModel.loadToday() }, label = { Text("Today") })
                }
                item {
                    FilterChip(selected = false, onClick = { viewModel.loadLastNDays(7) }, label = { Text("Last 7 days") })
                }
                item {
                    FilterChip(selected = false, onClick = { viewModel.loadLastNDays(30) }, label = { Text("Last 30 days") })
                }
                item {
                    FilterChip(selected = true, onClick = { viewModel.loadRecordsForCurrentMonth() }, label = { Text("This month") })
                }
            }

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                uiState.error != null -> {
                    Box(modifier = Modifier.fillMaxSize().padding(16.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Error, contentDescription = null, modifier = Modifier.size(48.dp), tint = MaterialTheme.colorScheme.error)
                            Spacer(modifier = Modifier.height(8.dp))
                            if (uiState.isSessionExpired) {
                                Text(
                                    "Your session has expired. Please sign in again.",
                                    color = MaterialTheme.colorScheme.error,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(onClick = {
                                    navController.navigate("login") {
                                        popUpTo(0) { inclusive = true }
                                    }
                                }) { Text("Sign In Again") }
                            } else {
                                Text(uiState.error ?: "Error", color = MaterialTheme.colorScheme.error)
                                Spacer(modifier = Modifier.height(8.dp))
                                Button(onClick = { viewModel.loadRecordsForCurrentMonth() }) { Text("Retry") }
                            }
                        }
                    }
                }
                uiState.records.isEmpty() -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.History, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                            Spacer(modifier = Modifier.height(16.dp))
                            Text("No records found", style = MaterialTheme.typography.titleMedium)
                            Text("No attendance records for this period", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f), textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                        }
                    }
                }
                else -> {
                    androidx.compose.foundation.lazy.LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(uiState.records) { record ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(12.dp),
                                elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                            ) {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(record.date, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                        val statusColor = when (record.status) {
                                            "present" -> Color(0xFF388E3C)
                                            "late"    -> Color(0xFFF57C00)
                                            "absent"  -> Color(0xFFD32F2F)
                                            else      -> MaterialTheme.colorScheme.outline
                                        }
                                        Text(
                                            record.status?.replaceFirstChar { it.uppercase() } ?: "Unknown",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = statusColor
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(8.dp))
                                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                        Column {
                                            Text("Check-In", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            Text(record.checkIn ?: "—", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = Color(0xFF1565C0))
                                        }
                                        Column(horizontalAlignment = Alignment.End) {
                                            Text("Check-Out", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                                            Text(record.checkOut ?: "—", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = Color(0xFF1565C0))
                                        }
                                    }
                                    if (record.checkInDistance != null) {
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text("Distance: ${record.checkInDistance}m", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ─── LEAVES SCREEN ────────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LeavesScreen(
    navController: NavController,
    viewModel: LeavesViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }

    // Request form state
    var leaveType by remember { mutableStateOf("annual") }
    var leaveTypeExpanded by remember { mutableStateOf(false) }
    var startDate by remember { mutableStateOf("") }
    var endDate by remember { mutableStateOf("") }
    var reason by remember { mutableStateOf("") }
    var totalDays by remember { mutableStateOf("") }
    var formError by remember { mutableStateOf<String?>(null) }

    // Date picker dialog state
    var showStartDatePicker by remember { mutableStateOf(false) }
    var showEndDatePicker by remember { mutableStateOf(false) }

    val leaveTypes = listOf("annual", "casual", "sick", "maternity", "paternity", "unpaid", "emergency", "death", "other")

    // Auto-compute working days (exclude Fri & Sat) whenever dates change
    LaunchedEffect(startDate, endDate) {
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val s = runCatching { fmt.parse(startDate) }.getOrNull()
        val e = runCatching { fmt.parse(endDate) }.getOrNull()
        if (s != null && e != null && !e.before(s)) {
            val cal = java.util.GregorianCalendar()
            cal.time = s
            // Clear time-of-day to avoid any cross-midnight edge cases
            cal.set(Calendar.HOUR_OF_DAY, 0)
            cal.set(Calendar.MINUTE, 0)
            cal.set(Calendar.SECOND, 0)
            cal.set(Calendar.MILLISECOND, 0)
            val endCal = java.util.GregorianCalendar()
            endCal.time = e
            endCal.set(Calendar.HOUR_OF_DAY, 0)
            endCal.set(Calendar.MINUTE, 0)
            endCal.set(Calendar.SECOND, 0)
            endCal.set(Calendar.MILLISECOND, 0)
            var count = 0
            while (!cal.time.after(endCal.time)) {
                val dow = cal.get(Calendar.DAY_OF_WEEK)
                if (dow != Calendar.FRIDAY && dow != Calendar.SATURDAY) count++
                cal.add(Calendar.DAY_OF_MONTH, 1)
            }
            totalDays = count.toString()
        } else {
            totalDays = ""
        }
    }

    LaunchedEffect(uiState.successMessage) {
        if (uiState.successMessage != null) {
            selectedTab = 0
            leaveType = "annual"
            startDate = ""
            endDate = ""
            reason = ""
            totalDays = ""
            formError = null
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Leaves", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    if (selectedTab == 0) {
                        IconButton(onClick = { viewModel.loadLeaves() }) {
                            Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                        }
                    }
                }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.fillMaxSize().padding(padding)) {
            TabRow(selectedTabIndex = selectedTab) {
                Tab(
                    selected = selectedTab == 0,
                    onClick = { selectedTab = 0; viewModel.clearMessages() },
                    text = { Text("My Leaves") },
                    icon = { Icon(Icons.Default.List, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
                Tab(
                    selected = selectedTab == 1,
                    onClick = { selectedTab = 1; viewModel.clearMessages() },
                    text = { Text("Request Leave") },
                    icon = { Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp)) }
                )
            }

            uiState.successMessage?.let { msg ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF388E3C), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(msg, color = Color(0xFF388E3C), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFF388E3C))
                        }
                    }
                }
            }
            uiState.error?.let { err ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 8.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = Color(0xFFC62828), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                if (uiState.isSessionExpired) "Session expired. Please sign in again." else err,
                                color = Color(0xFFC62828),
                                style = MaterialTheme.typography.bodySmall
                            )
                            if (uiState.isSessionExpired) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Button(
                                    onClick = {
                                        navController.navigate("login") { popUpTo(0) { inclusive = true } }
                                    },
                                    colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828)),
                                    modifier = Modifier.height(32.dp),
                                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp)
                                ) {
                                    Text("Sign In Again", style = MaterialTheme.typography.labelSmall, color = Color.White)
                                }
                            }
                        }
                        IconButton(onClick = { viewModel.clearMessages() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFFC62828))
                        }
                    }
                }
            }

            when (selectedTab) {
                0 -> {
                    if (uiState.isLoading) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator()
                        }
                    } else if (uiState.leaves.isEmpty()) {
                        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Icon(Icons.Default.EventBusy, contentDescription = null, modifier = Modifier.size(64.dp), tint = MaterialTheme.colorScheme.outline)
                                Spacer(modifier = Modifier.height(16.dp))
                                Text("No leave requests yet", style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.outline)
                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(onClick = { selectedTab = 1 }) { Text("Request a leave") }
                            }
                        }
                    } else {
                        androidx.compose.foundation.lazy.LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(uiState.leaves) { leave ->
                                LeaveCard(leave = leave, onDelete = { viewModel.deleteLeave(leave.id) })
                            }
                        }
                    }
                }
                1 -> {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState())
                            .padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        ExposedDropdownMenuBox(
                            expanded = leaveTypeExpanded,
                            onExpandedChange = { leaveTypeExpanded = !leaveTypeExpanded }
                        ) {
                            OutlinedTextField(
                                value = leaveType.replaceFirstChar { it.uppercase() },
                                onValueChange = {},
                                readOnly = true,
                                label = { Text("Leave Type") },
                                trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = leaveTypeExpanded) },
                                modifier = Modifier.fillMaxWidth().menuAnchor()
                            )
                            ExposedDropdownMenu(
                                expanded = leaveTypeExpanded,
                                onDismissRequest = { leaveTypeExpanded = false }
                            ) {
                                leaveTypes.forEach { type ->
                                    DropdownMenuItem(
                                        text = { Text(type.replaceFirstChar { it.uppercase() }) },
                                        onClick = { leaveType = type; leaveTypeExpanded = false }
                                    )
                                }
                            }
                        }

                        OutlinedTextField(
                            value = startDate,
                            onValueChange = {},
                            label = { Text("Start Date") },
                            leadingIcon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { showStartDatePicker = true }) {
                                    Icon(Icons.Default.CalendarMonth, contentDescription = "Pick start date")
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            readOnly = true,
                            placeholder = { Text("YYYY-MM-DD") }
                        )

                        OutlinedTextField(
                            value = endDate,
                            onValueChange = {},
                            label = { Text("End Date") },
                            leadingIcon = { Icon(Icons.Default.DateRange, contentDescription = null) },
                            trailingIcon = {
                                IconButton(onClick = { showEndDatePicker = true }) {
                                    Icon(Icons.Default.CalendarMonth, contentDescription = "Pick end date")
                                }
                            },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            readOnly = true,
                            placeholder = { Text("YYYY-MM-DD") }
                        )

                        OutlinedTextField(
                            value = if (totalDays.isBlank()) "" else "$totalDays working day(s) (excl. Fri & Sat)",
                            onValueChange = {},
                            label = { Text("Total Working Days") },
                            leadingIcon = { Icon(Icons.Default.Numbers, contentDescription = null) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            readOnly = true,
                            placeholder = { Text("Auto-calculated") },
                            colors = OutlinedTextFieldDefaults.colors(
                                disabledTextColor = MaterialTheme.colorScheme.onSurface,
                                disabledBorderColor = MaterialTheme.colorScheme.outline
                            )
                        )

                        if (totalDays == "0" && startDate.isNotBlank() && endDate.isNotBlank()) {
                            Text(
                                "Selected dates fall on weekend days (Fri/Sat). No working days in this range.",
                                color = Color(0xFFE65100),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(start = 4.dp)
                            )
                        }

                        OutlinedTextField(
                            value = reason,
                            onValueChange = { reason = it },
                            label = { Text("Reason (optional)") },
                            leadingIcon = { Icon(Icons.Default.Notes, contentDescription = null) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 100.dp),
                            maxLines = 5
                        )

                        if (formError != null) {
                            Text(formError!!, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                        }

                        Button(
                            onClick = {
                                formError = null
                                val days = totalDays.toDoubleOrNull()
                                when {
                                    startDate.isBlank() -> formError = "Please select a start date"
                                    endDate.isBlank() -> formError = "Please select an end date"
                                    days == null || days < 1 -> formError = "No working days in the selected range"
                                    else -> viewModel.createLeave(
                                        leaveType = leaveType,
                                        startDate = startDate,
                                        endDate = endDate,
                                        totalDays = days,
                                        reason = reason,
                                        onSuccess = {}
                                    )
                                }
                            },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            enabled = !uiState.isSubmitting,
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            if (uiState.isSubmitting) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp), color = Color.White, strokeWidth = 2.dp)
                            } else {
                                Icon(Icons.Default.Send, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Submit Request", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                            }
                        }

                        Spacer(modifier = Modifier.height(24.dp))
                    }
                }
            }
        }
    }

    // ── Date picker dialogs ──────────────────────────────────────────────────
    val sdf = remember { SimpleDateFormat("yyyy-MM-dd", Locale.US) }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun StartPickerDialog() {
        val state = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showStartDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        startDate = sdf.format(Date(millis))
                    }
                    showStartDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showStartDatePicker = false }) { Text("Cancel") } }
        ) { DatePicker(state = state) }
    }

    @OptIn(ExperimentalMaterial3Api::class)
    @Composable
    fun EndPickerDialog() {
        val state = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showEndDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    state.selectedDateMillis?.let { millis ->
                        endDate = sdf.format(Date(millis))
                    }
                    showEndDatePicker = false
                }) { Text("OK") }
            },
            dismissButton = { TextButton(onClick = { showEndDatePicker = false }) { Text("Cancel") } }
        ) { DatePicker(state = state) }
    }

    if (showStartDatePicker) { StartPickerDialog() }
    if (showEndDatePicker) { EndPickerDialog() }
}

@Composable
fun LeaveCard(
    leave: com.hrerp.attendance.data.remote.api.LeaveResponse,
    onDelete: () -> Unit
) {
    val statusColor = when (leave.status) {
        "approved" -> Color(0xFF388E3C)
        "rejected" -> Color(0xFFC62828)
        else -> Color(0xFFE65100)
    }
    val statusBg = when (leave.status) {
        "approved" -> Color(0xFFE8F5E9)
        "rejected" -> Color(0xFFFFEBEE)
        else -> Color(0xFFFFF3E0)
    }
    var showDeleteConfirm by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    leave.leaveType.replaceFirstChar { it.uppercase() } + " Leave",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold
                )
                Surface(shape = RoundedCornerShape(50), color = statusBg) {
                    Text(
                        leave.status.replaceFirstChar { it.uppercase() },
                        color = statusColor,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
                    )
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.DateRange, contentDescription = null, modifier = Modifier.size(14.dp), tint = MaterialTheme.colorScheme.outline)
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    "${leave.startDate} → ${leave.endDate}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
                Spacer(modifier = Modifier.width(16.dp))
                Text("${leave.totalDays} day(s)", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.outline)
            }
            if (leave.reason.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(leave.reason, style = MaterialTheme.typography.bodySmall, maxLines = 2)
            }
            if (leave.status == "pending") {
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    TextButton(
                        onClick = { showDeleteConfirm = true },
                        colors = ButtonDefaults.textButtonColors(contentColor = Color(0xFFC62828))
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Cancel Request", style = MaterialTheme.typography.bodySmall)
                    }
                }
            }
        }
    }

    if (showDeleteConfirm) {
        AlertDialog(
            onDismissRequest = { showDeleteConfirm = false },
            title = { Text("Cancel Leave Request") },
            text = { Text("Are you sure you want to cancel this leave request?") },
            confirmButton = {
                TextButton(onClick = { showDeleteConfirm = false; onDelete() }) {
                    Text("Yes, Cancel", color = Color(0xFFC62828))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteConfirm = false }) { Text("Keep") }
            }
        )
    }
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    navController: NavController,
    authViewModel: AuthViewModel = hiltViewModel(),
    viewModel: ProfileViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    // Image picker — opens device gallery
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri ->
        uri?.let { viewModel.updateProfileImage(it) }
    }

    // Edit-email inline state
    var emailEditing by remember { mutableStateOf(false) }
    var emailDraft by remember { mutableStateOf("") }

    // Sync email draft when state changes (e.g. after successful update)
    LaunchedEffect(uiState.email) { emailDraft = uiState.email }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Profile", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadProfile() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(paddingValues)
                .padding(horizontal = 20.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {

            // ── Profile Image ────────────────────────────────────────────────
            Box(
                modifier = Modifier
                    .size(110.dp)
                    .padding(4.dp),
                contentAlignment = Alignment.BottomEnd
            ) {
                // Circular avatar
                val imageBitmap = remember(uiState.profileImagePath) {
                    uiState.profileImagePath?.let {
                        runCatching { BitmapFactory.decodeFile(it)?.asImageBitmap() }.getOrNull()
                    }
                }
                if (imageBitmap != null) {
                    androidx.compose.foundation.Image(
                        bitmap = imageBitmap,
                        contentDescription = "Profile photo",
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(100.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1565C0)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(Icons.Default.Person, contentDescription = null, modifier = Modifier.size(60.dp), tint = Color.White)
                    }
                }
                // Camera edit button
                IconButton(
                    onClick = { imagePickerLauncher.launch("image/*") },
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1565C0))
                ) {
                    Icon(Icons.Default.CameraAlt, contentDescription = "Change photo", tint = Color.White, modifier = Modifier.size(16.dp))
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            if (uiState.isLoading) {
                CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp, color = Color(0xFF1565C0))
            }

            // ── Success/Error snackbar ───────────────────────────────────────
            if (uiState.emailUpdateSuccess) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFE8F5E9)),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF388E3C), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Email updated successfully", color = Color(0xFF388E3C), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        IconButton(onClick = { viewModel.dismissError() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFF388E3C))
                        }
                    }
                }
            }
            if (uiState.error != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = Color(0xFFFFEBEE)),
                    modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)
                ) {
                    Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Error, contentDescription = null, tint = Color(0xFFC62828), modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(uiState.error!!, color = Color(0xFFC62828), style = MaterialTheme.typography.bodySmall, modifier = Modifier.weight(1f))
                        IconButton(onClick = { viewModel.dismissError() }, modifier = Modifier.size(24.dp)) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp), tint = Color(0xFFC62828))
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── Info cards ───────────────────────────────────────────────────

            // Employee Code (read-only)
            if (uiState.employeeCode.isNotBlank()) {
                ProfileInfoRow(
                    icon = Icons.Default.Badge,
                    label = "Employee Code",
                    value = uiState.employeeCode
                )
            }

            // Employee Name (read-only)
            ProfileInfoRow(
                icon = Icons.Default.Person,
                label = "Employee Name",
                value = uiState.employeeName.ifBlank { "—" }
            )

            // Email (editable)
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                if (emailEditing) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        OutlinedTextField(
                            value = emailDraft,
                            onValueChange = { emailDraft = it },
                            label = { Text("Email") },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                            keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                                keyboardType = androidx.compose.ui.text.input.KeyboardType.Email
                            )
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        if (uiState.isUpdatingEmail) {
                            CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                        } else {
                            IconButton(onClick = {
                                viewModel.updateEmail(emailDraft.trim())
                                emailEditing = false
                            }) {
                                Icon(Icons.Default.Check, contentDescription = "Save", tint = Color(0xFF388E3C))
                            }
                            IconButton(onClick = {
                                emailDraft = uiState.email
                                emailEditing = false
                            }) {
                                Icon(Icons.Default.Close, contentDescription = "Cancel", tint = Color(0xFFC62828))
                            }
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Email, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(22.dp))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Email", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                            Text(uiState.email.ifBlank { "—" }, style = MaterialTheme.typography.bodyMedium)
                        }
                        IconButton(onClick = {
                            emailDraft = uiState.email
                            emailEditing = true
                        }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit email", tint = Color(0xFF1565C0), modifier = Modifier.size(18.dp))
                        }
                    }
                }
            }

            // Role (read-only badge)
            Card(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Security, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Role", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                        val displayRole = when (uiState.role.lowercase()) {
                            "admin" -> "Application Admin"
                            "branch_approver", "branchapprover" -> "Branch Approver"
                            "approver" -> "Approver"
                            else -> uiState.role.replaceFirstChar { it.uppercase() }.ifBlank { "Employee" }
                        }
                        Text(displayRole, style = MaterialTheme.typography.bodyMedium)
                    }
                    if (uiState.roleName.isNotBlank()) {
                        Surface(
                            shape = RoundedCornerShape(50),
                            color = Color(0xFFE3F2FD)
                        ) {
                            Text(
                                uiState.roleName,
                                style = MaterialTheme.typography.labelSmall,
                                color = Color(0xFF1565C0),
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                            )
                        }
                    }
                }
            }

            // Job Title (read-only, from backend)
            if (uiState.jobTitle.isNotBlank()) {
                ProfileInfoRow(
                    icon = Icons.Default.Work,
                    label = "Job Title",
                    value = uiState.jobTitle
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // ── Biometric / Face ID toggle ────────────────────────────────────
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
            ) {
                Column {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(Icons.Default.Fingerprint, contentDescription = null, modifier = Modifier.size(28.dp), tint = Color(0xFF1565C0))
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Biometric Login", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                            Text(
                                if (uiState.biometricAvailable)
                                    "Enable fingerprint login"
                                else
                                    "Not available on this device",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                            )
                        }
                        Switch(
                            checked = uiState.biometricEnabled,
                            enabled = uiState.biometricAvailable,
                            onCheckedChange = { viewModel.setBiometricEnabled(it) }
                        )
                    }
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))

                    // Face ID camera-selfie setup section
                    val faceImageUri = remember {
                        val tempFile = java.io.File(context.cacheDir, "face_capture_temp.jpg")
                        androidx.core.content.FileProvider.getUriForFile(
                            context,
                            "${context.packageName}.provider",
                            tempFile
                        )
                    }
                    val faceSetupLauncher = rememberLauncherForActivityResult(
                        ActivityResultContracts.TakePicture()
                    ) { success ->
                        if (success) {
                            val tempFile = java.io.File(context.cacheDir, "face_capture_temp.jpg")
                            if (tempFile.exists()) {
                                val bitmap = BitmapFactory.decodeFile(tempFile.absolutePath)
                                if (bitmap != null) viewModel.saveFaceIdImage(bitmap)
                            }
                        }
                    }
                    val cameraPermissionLauncher = rememberLauncherForActivityResult(
                        ActivityResultContracts.RequestPermission()
                    ) { granted ->
                        if (granted) faceSetupLauncher.launch(faceImageUri)
                    }

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Face, contentDescription = null, modifier = Modifier.size(28.dp), tint = Color(0xFF1565C0))
                            Spacer(modifier = Modifier.width(12.dp))
                            Column(modifier = Modifier.weight(1f)) {
                                Text("Face ID Login", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Medium)
                                Text(
                                    if (uiState.faceIdSetUp) "Face ID configured \u2713"
                                    else "Take a selfie to enable face login",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = if (uiState.faceIdSetUp) Color(0xFF2E7D32)
                                            else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                                )
                            }
                        }
                        if (uiState.faceIdSetupError != null) {
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                uiState.faceIdSetupError!!,
                                color = Color(0xFFB71C1C),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        if (!uiState.faceIdSetUp) {
                            Button(
                                onClick = {
                                    val hasPermission = ContextCompat.checkSelfPermission(
                                        context, Manifest.permission.CAMERA
                                    ) == PackageManager.PERMISSION_GRANTED
                                    if (hasPermission) faceSetupLauncher.launch(faceImageUri)
                                    else cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
                                },
                                enabled = !uiState.faceIdSetupLoading,
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp),
                                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF1565C0))
                            ) {
                                if (uiState.faceIdSetupLoading) {
                                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                                } else {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Take Selfie to Setup Face ID", style = MaterialTheme.typography.labelMedium)
                                }
                            }
                        } else {
                            OutlinedButton(
                                onClick = { viewModel.clearFaceId() },
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(8.dp)
                            ) {
                                Icon(Icons.Default.Delete, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Reset Face ID", style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(28.dp))

            // ── Sign Out ─────────────────────────────────────────────────────
            Button(
                onClick = {
                    viewModel.logout()
                    authViewModel.logout()
                    navController.navigate("login") {
                        popUpTo(0) { inclusive = true }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFC62828))
            ) {
                Icon(Icons.Default.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Sign Out", fontWeight = FontWeight.Bold, fontSize = 16.sp)
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun ProfileInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(icon, contentDescription = null, tint = Color(0xFF1565C0), modifier = Modifier.size(22.dp))
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
                Text(value, style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

// ─── SETTINGS SCREEN ──────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        },
        bottomBar = {
            NavigationBar {
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                    label = { Text("Home") },
                    selected = false,
                    onClick = { navController.navigate("home") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.History, contentDescription = null) },
                    label = { Text("History") },
                    selected = false,
                    onClick = { navController.navigate("history") }
                )
                NavigationBarItem(
                    icon = { Icon(Icons.Default.Settings, contentDescription = null) },
                    label = { Text("Settings") },
                    selected = true,
                    onClick = {}
                )
            }
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text(
                "General",
                style = MaterialTheme.typography.titleSmall,
                color = Color(0xFF1565C0),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                Column {
                    ListItem(
                        headlineContent = { Text("Notifications") },
                        supportingContent = { Text("Push notifications for reminders") },
                        leadingContent = {
                            Icon(Icons.Default.Notifications, contentDescription = null, tint = Color(0xFF1565C0))
                        },
                        trailingContent = { Switch(checked = true, onCheckedChange = {}) }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ListItem(
                        headlineContent = { Text("Auto Sync") },
                        supportingContent = { Text("Sync pending records automatically") },
                        leadingContent = {
                            Icon(Icons.Default.Sync, contentDescription = null, tint = Color(0xFF1565C0))
                        },
                        trailingContent = { Switch(checked = true, onCheckedChange = {}) }
                    )
                    Divider(modifier = Modifier.padding(horizontal = 16.dp))
                    ListItem(
                        headlineContent = { Text("Sync Interval") },
                        supportingContent = { Text("Every 15 minutes") },
                        leadingContent = {
                            Icon(Icons.Default.Timer, contentDescription = null, tint = Color(0xFF1565C0))
                        }
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(
                "About",
                style = MaterialTheme.typography.titleSmall,
                color = Color(0xFF1565C0),
                modifier = Modifier.padding(bottom = 8.dp)
            )

            Card(modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                ListItem(
                    headlineContent = { Text("Version") },
                    supportingContent = { Text("1.0.0") },
                    leadingContent = {
                        Icon(Icons.Default.Info, contentDescription = null, tint = Color(0xFF1565C0))
                    }
                )
            }
        }
    }
}

// ─── OFFLINE SYNC SCREEN ──────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OfflineSyncManagerScreen(navController: NavController) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Offline Sync Manager") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Icon(
                Icons.Default.Sync,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.outline
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text("Offline Sync Manager", style = MaterialTheme.typography.headlineSmall)
            Text(
                "Pending records will be synced when online",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(top = 8.dp)
            )
            Spacer(modifier = Modifier.height(24.dp))
            Button(
                onClick = { navController.popBackStack() },
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Back to Home")
            }
        }
    }
}

// ─── MEMBERS SCREEN ───────────────────────────────────────────────────────────

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MembersScreen(
    navController: NavController,
    viewModel: MembersViewModel = androidx.hilt.navigation.compose.hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Members") },
                navigationIcon = {
                    IconButton(onClick = { navController.popBackStack() }) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    IconButton(onClick = { viewModel.loadMembers() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF1565C0),
                    titleContentColor = Color.White,
                    actionIconContentColor = Color.White,
                    navigationIconContentColor = Color.White
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            // Summary bar
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Color(0xFFF1F5F9)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        tint = Color(0xFF1565C0),
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "${uiState.members.size} employee${if (uiState.members.size != 1) "s" else ""} registered via Android app",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color(0xFF475569)
                    )
                }
            }

            when {
                uiState.isLoading -> {
                    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                }
                uiState.error != null -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = Color(0xFFB71C1C),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            uiState.error ?: "Unknown error",
                            color = Color(0xFFB71C1C),
                            textAlign = TextAlign.Center,
                            style = MaterialTheme.typography.bodyMedium
                        )
                        Spacer(modifier = Modifier.height(16.dp))
                        Button(onClick = { viewModel.loadMembers() }) {
                            Text("Retry")
                        }
                    }
                }
                uiState.members.isEmpty() -> {
                    Column(
                        modifier = Modifier.fillMaxSize().padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            tint = Color(0xFFCBD5E1),
                            modifier = Modifier.size(64.dp)
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "No members yet",
                            style = MaterialTheme.typography.titleMedium,
                            color = Color(0xFF94A3B8)
                        )
                        Text(
                            "Employees who sign up via the Android app will appear here.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFFCBD5E1),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 4.dp)
                        )
                    }
                }
                else -> {
                    androidx.compose.foundation.lazy.LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(uiState.members) { member ->
                            MemberCard(member)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MemberCard(member: com.hrerp.attendance.data.remote.api.MemberResponse) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        member.fullName.ifEmpty { "Unknown" },
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    if (member.email.isNotEmpty()) {
                        Text(
                            member.email,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xFF64748B)
                        )
                    }
                }
                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (member.isActive) Color(0xFFD1FAE5) else Color(0xFFFFE4E6)
                ) {
                    Text(
                        if (member.isActive) "Active" else "Revoked",
                        color = if (member.isActive) Color(0xFF065F46) else Color(0xFF9F1239),
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = Color(0xFFF1F5F9))
            Spacer(modifier = Modifier.height(10.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Role
                Column(modifier = Modifier.weight(1f)) {
                    Text("Role", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                    Text(
                        member.role.replaceFirstChar { it.titlecase() },
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium
                    )
                }
                // Branch
                if (member.branch.isNotEmpty()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text("Branch", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                        Text(member.branch, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            if (member.department.isNotEmpty() || member.deviceModel.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    if (member.department.isNotEmpty()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Department", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                            Text(member.department, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    if (member.deviceModel.isNotEmpty()) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Device", style = MaterialTheme.typography.labelSmall, color = Color(0xFF94A3B8))
                            Text(
                                "${member.deviceModel}${if (member.osVersion.isNotEmpty()) " · ${member.osVersion}" else ""}",
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }
                }
            }

            if (member.registeredAt != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Registered: ${member.registeredAt}",
                    style = MaterialTheme.typography.labelSmall,
                    color = Color(0xFFCBD5E1)
                )
            }
        }
    }
}
