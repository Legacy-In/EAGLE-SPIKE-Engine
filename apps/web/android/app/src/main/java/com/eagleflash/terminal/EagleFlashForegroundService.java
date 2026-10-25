package com.eagleflash.terminal;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🦅 EAGLE FLASH — NATIVE ANDROID FOREGROUND SERVICE
 *
 * Keeps the 11 quantitative scanning, execution, and outbox workers active 24/7.
 * Acquires a PARTIAL_WAKE_LOCK to prevent CPU sleep when the phone is locked.
 * Displays a persistent status notification in the Android system tray.
 * ═══════════════════════════════════════════════════════════════════════════
 */
public class EagleFlashForegroundService extends Service {
    private static final String TAG = "EagleFlashService";
    public static final String CHANNEL_ID = "EagleFlashEngineChannel";
    public static final int NOTIFICATION_ID = 1001;

    private PowerManager.WakeLock wakeLock;
    private boolean isRunning = false;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "Creating Eagle Flash Foreground Engine Service...");
        createNotificationChannel();

        // 1. Acquire Partial Wake Lock to prevent CPU sleep
        try {
            PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (powerManager != null) {
                wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "EagleFlash::EngineWakeLock");
                wakeLock.acquire(24 * 60 * 60 * 1000L); // 24-hour safety boundary
                Log.i(TAG, "Acquired PARTIAL_WAKE_LOCK successfully.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to acquire wake lock: " + e.getMessage());
        }

        isRunning = true;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Log.i(TAG, "Eagle Flash Foreground Service onStartCommand triggered.");

        Notification notification = buildNotification("● 11 Workers Active • Real-time Monitoring");
        startForeground(NOTIFICATION_ID, notification);

        // START_STICKY ensures Android OS restarts the service if terminated under RAM pressure
        return START_STICKY;
    }

    private Notification buildNotification(String statusText) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        notificationIntent.setAction(Intent.ACTION_MAIN);
        notificationIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        notificationIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);

        int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent, pendingFlags
        );

        int smallIcon = getResources().getIdentifier("ic_launcher", "mipmap", getPackageName());
        if (smallIcon == 0) {
            smallIcon = android.R.drawable.ic_dialog_info;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("🦅 Eagle Flash Trading Engine")
                .setContentText(statusText)
                .setSmallIcon(smallIcon)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE);

        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Eagle Flash Background Engine",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Maintains background quantitative scanning, Discord outbox, and Paper Trading execution.");
            channel.setShowBadge(false);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onDestroy() {
        Log.i(TAG, "Stopping Eagle Flash Foreground Service...");
        isRunning = false;
        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                Log.i(TAG, "Released PARTIAL_WAKE_LOCK cleanly.");
            }
        } catch (Exception e) {
            Log.w(TAG, "Error releasing wake lock: " + e.getMessage());
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
