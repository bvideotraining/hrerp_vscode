package com.hrerp.attendance.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.hrerp.attendance.ui.screens.LoginScreen
import com.hrerp.attendance.ui.screens.SignupScreen
import com.hrerp.attendance.ui.screens.HomeScreen
import com.hrerp.attendance.ui.screens.HistoryScreen
import com.hrerp.attendance.ui.screens.ProfileScreen
import com.hrerp.attendance.ui.screens.SettingsScreen
import com.hrerp.attendance.ui.screens.LeavesScreen
import com.hrerp.attendance.ui.screens.MembersScreen
import com.hrerp.attendance.ui.screens.OfflineSyncManagerScreen
import timber.log.Timber

sealed class Route(val route: String) {
    object Login : Route("login")
    object Signup : Route("signup")
    object Home : Route("home")
    object History : Route("history")
    object Leaves : Route("leaves")
    object Profile : Route("profile")
    object Settings : Route("settings")
    object OfflineSync : Route("offline_sync")
    object Members : Route("members")
}

@Composable
fun EmployeeTrackerNavigation() {
    val navController = rememberNavController()
    
    NavHost(
        navController = navController,
        startDestination = Route.Login.route
    ) {
        composable(Route.Login.route) {
            LoginScreen(navController = navController)
        }
        composable(Route.Signup.route) {
            SignupScreen(navController = navController)
        }
        composable(Route.Home.route) {
            HomeScreen(navController = navController)
        }
        composable(Route.History.route) {
            HistoryScreen(navController = navController)
        }
        composable(Route.Profile.route) {
            ProfileScreen(navController = navController)
        }
        composable(Route.Settings.route) {
            SettingsScreen(navController = navController)
        }
        composable(Route.Leaves.route) {
            LeavesScreen(navController = navController)
        }
        composable(Route.OfflineSync.route) {
            OfflineSyncManagerScreen(navController = navController)
        }
        composable(Route.Members.route) {
            MembersScreen(navController = navController)
        }
    }
    
    Timber.d("Navigation setup complete")
}
