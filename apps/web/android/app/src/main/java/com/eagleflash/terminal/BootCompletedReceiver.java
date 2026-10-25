package com.eagleflash.terminal;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — REBOOT RECOVERY RECEIVER
 *
 * Listens for system boot completion and automatically launches the Eagle Flash
 * background foreground service to ensure uninterrupted trading bot operations.
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class BootCompletedReceiver extends BroadcastReceiver {
    private static final String TAG = "EagleFlashBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            Log.i(TAG, "Device boot completed detected. Launching Eagle Flash Engine Service...");

            Intent serviceIntent = new Intent(context, EagleFlashForegroundService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
