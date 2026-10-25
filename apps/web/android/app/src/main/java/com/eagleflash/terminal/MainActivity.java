package com.eagleflash.terminal;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "EagleFlashMain";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.i(TAG, "Initializing Eagle Flash Android Bridge Activity...");

        // 1. Launch Foreground Service
        startEngineForegroundService();

        // 2. Prompt for Battery Optimization Exemption
        requestBatteryOptimizationExemption();
    }

    private void startEngineForegroundService() {
        try {
            Intent serviceIntent = new Intent(this, EagleFlashForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
            Log.i(TAG, "Foreground service started from MainActivity.");
        } catch (Exception e) {
            Log.w(TAG, "Error starting foreground service: " + e.getMessage());
        }
    }

    private void requestBatteryOptimizationExemption() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
                String packageName = getPackageName();
                if (pm != null && !pm.isIgnoringBatteryOptimizations(packageName)) {
                    Log.i(TAG, "Prompting user for ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS...");
                    Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                    intent.setData(Uri.parse("package:" + packageName));
                    startActivity(intent);
                }
            } catch (Exception e) {
                Log.w(TAG, "Notice on battery optimization request: " + e.getMessage());
            }
        }
    }
}

