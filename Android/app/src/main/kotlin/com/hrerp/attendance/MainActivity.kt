package com.hrerp.attendance

import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import com.hrerp.attendance.ui.theme.EmployeeTrackerTheme
import com.hrerp.attendance.ui.navigation.EmployeeTrackerNavigation
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            EmployeeTrackerTheme {
                Surface(color = MaterialTheme.colorScheme.background) {
                    EmployeeTrackerNavigation()
                }
            }
        }
    }
}
