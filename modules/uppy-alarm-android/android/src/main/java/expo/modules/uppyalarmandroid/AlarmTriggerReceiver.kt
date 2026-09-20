package expo.modules.uppyalarmandroid

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

/**
 * Fires when AlarmManager wakes the device for a scheduled alarm. Starts the foreground
 * RingingService (which owns the wake lock, looping audio, and the full-screen notification) and,
 * if the alarm repeats, re-arms the next occurrence immediately.
 */
class AlarmTriggerReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_ALARM_FIRED = "expo.modules.uppyalarmandroid.ACTION_ALARM_FIRED"
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_LABEL = "label"
    const val EXTRA_SOUND_URI = "soundUri"
    const val EXTRA_HAS_MISSION = "hasMission"
  }

  override fun onReceive(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
    val label = intent.getStringExtra(EXTRA_LABEL) ?: ""
    val soundUri = intent.getStringExtra(EXTRA_SOUND_URI)
    val hasMission = intent.getBooleanExtra(EXTRA_HAS_MISSION, false)

    val serviceIntent = Intent(context, RingingService::class.java).apply {
      putExtra(RingingService.EXTRA_ALARM_ID, alarmId)
      putExtra(RingingService.EXTRA_LABEL, label)
      putExtra(RingingService.EXTRA_SOUND_URI, soundUri)
      putExtra(RingingService.EXTRA_HAS_MISSION, hasMission)
    }
    ContextCompat.startForegroundService(context, serviceIntent)

    // Repeating alarms self-reschedule right after firing so they keep ringing on schedule
    // without relying on AlarmManager.setRepeating (inexact, drifts, no idle bypass).
    val stored = AlarmStore.readAll(context).firstOrNull { it.id == alarmId }
    if (stored != null && !stored.repeatOnce) {
      AlarmScheduling.arm(context, stored)
    } else if (stored != null) {
      // "Once" alarms remove themselves from the store once they've fired.
      AlarmStore.remove(context, alarmId)
    }
  }
}
