package expo.modules.uppyalarmandroid

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Foreground service that owns the ringing experience end to end: wake lock, looping alarm-stream
 * audio, and the high-priority full-screen notification that shows AlarmRingingActivity over the
 * lock screen. Stopped either by AlarmRingingActivity (normal dismiss / mission complete) or by
 * Emergency Escape.
 */
class RingingService : Service() {

  companion object {
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_LABEL = "label"
    const val EXTRA_SOUND_URI = "soundUri"
    const val EXTRA_HAS_MISSION = "hasMission"

    const val ACTION_STOP = "expo.modules.uppyalarmandroid.ACTION_STOP_RINGING"

    private const val CHANNEL_ID = "uppy_alarm_ringing"
    private const val NOTIFICATION_ID = 7301

    var currentAlarmId: String? = null
      private set
  }

  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopRinging()
      return START_NOT_STICKY
    }

    val alarmId = intent?.getStringExtra(EXTRA_ALARM_ID) ?: run {
      stopSelf()
      return START_NOT_STICKY
    }
    val label = intent.getStringExtra(EXTRA_LABEL) ?: ""
    val soundUri = intent.getStringExtra(EXTRA_SOUND_URI)
    val hasMission = intent.getBooleanExtra(EXTRA_HAS_MISSION, false)
    currentAlarmId = alarmId

    acquireWakeLock()
    val notification = buildNotification(alarmId, label, hasMission)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    playSound(soundUri)

    return START_STICKY
  }

  private fun acquireWakeLock() {
    val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "UppyAlarm:RingingWakeLock"
    ).apply { acquire(10 * 60 * 1000L) } // 10 minute safety cap
  }

  private fun playSound(soundUri: String?) {
    val uri: Uri = soundUri?.let { Uri.parse(it) }
      ?: RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
      ?: RingtoneManager.getValidRingtoneUri(this)

    mediaPlayer = MediaPlayer().apply {
      setAudioAttributes(
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
      )
      isLooping = true
      try {
        setDataSource(this@RingingService, uri)
        prepare()
        start()
      } catch (_: Exception) {
        // Device has no readable alarm sound at this uri; ring silently rather than crash the
        // foreground service — the vibration + full-screen UI still gets the user's attention.
      }
    }
  }

  private fun buildNotification(alarmId: String, label: String, hasMission: Boolean): Notification {
    ensureChannel()

    val fullScreenIntent = Intent(this, AlarmRingingActivity::class.java).apply {
      putExtra(AlarmRingingActivity.EXTRA_ALARM_ID, alarmId)
      putExtra(AlarmRingingActivity.EXTRA_LABEL, label)
      putExtra(AlarmRingingActivity.EXTRA_HAS_MISSION, hasMission)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
        Intent.FLAG_ACTIVITY_SINGLE_TOP or
        Intent.FLAG_ACTIVITY_NO_USER_ACTION
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      this,
      alarmId.hashCode(),
      fullScreenIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    return NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle(if (label.isNotBlank()) label else "Alarm")
      .setContentText("Tap to open")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setFullScreenIntent(fullScreenPendingIntent, true)
      .setContentIntent(fullScreenPendingIntent)
      .setOngoing(true)
      .setAutoCancel(false)
      .build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Alarm ringing",
      NotificationManager.IMPORTANCE_HIGH
    ).apply {
      description = "Full-screen alarm ringing notifications"
      setSound(null, null) // audio is played manually on STREAM_ALARM so it isn't silenced with media volume
      enableVibration(true)
    }
    manager.createNotificationChannel(channel)
  }

  private fun stopRinging() {
    mediaPlayer?.let {
      try {
        if (it.isPlaying) it.stop()
      } catch (_: Exception) {
      }
      it.release()
    }
    mediaPlayer = null
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
    currentAlarmId = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
  }

  override fun onDestroy() {
    stopRinging()
    super.onDestroy()
  }

  override fun onTimeout(startId: Int) {
    // API 34+: the system reclaims a media-playback foreground service after its time limit.
    stopRinging()
  }
}
