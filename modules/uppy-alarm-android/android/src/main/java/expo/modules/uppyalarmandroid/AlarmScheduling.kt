package expo.modules.uppyalarmandroid

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import java.util.Calendar

/**
 * Computes trigger times and does the actual AlarmManager scheduling. Alarms are re-armed one
 * occurrence at a time (rather than AlarmManager.setRepeating, which is inexact and drifts):
 * AlarmTriggerReceiver schedules the next occurrence again right after firing a repeating alarm.
 */
object AlarmScheduling {

  /** Calendar.SUNDAY == 1 .. Calendar.SATURDAY == 7; our model uses 0 (Sun) .. 6 (Sat). */
  private fun calendarDayToModelDay(calendarDay: Int): Int = calendarDay - 1

  fun nextTriggerMillis(hour: Int, minute: Int, repeatOnce: Boolean, days: List<Int>, now: Long = System.currentTimeMillis()): Long {
    val cal = Calendar.getInstance()
    cal.timeInMillis = now
    cal.set(Calendar.SECOND, 0)
    cal.set(Calendar.MILLISECOND, 0)
    cal.set(Calendar.HOUR_OF_DAY, hour)
    cal.set(Calendar.MINUTE, minute)

    if (repeatOnce || days.isEmpty()) {
      if (cal.timeInMillis <= now) {
        cal.add(Calendar.DAY_OF_YEAR, 1)
      }
      return cal.timeInMillis
    }

    for (offset in 0..7) {
      val candidate = cal.clone() as Calendar
      candidate.add(Calendar.DAY_OF_YEAR, offset)
      val modelDay = calendarDayToModelDay(candidate.get(Calendar.DAY_OF_WEEK))
      if (days.contains(modelDay) && candidate.timeInMillis > now) {
        return candidate.timeInMillis
      }
    }
    // Should not happen (days is non-empty), fall back to tomorrow at the same time.
    cal.add(Calendar.DAY_OF_YEAR, 1)
    return cal.timeInMillis
  }

  private fun pendingIntentFor(context: Context, alarm: StoredAlarm): PendingIntent {
    val intent = Intent(context, AlarmTriggerReceiver::class.java).apply {
      action = AlarmTriggerReceiver.ACTION_ALARM_FIRED
      putExtra(AlarmTriggerReceiver.EXTRA_ALARM_ID, alarm.id)
      putExtra(AlarmTriggerReceiver.EXTRA_LABEL, alarm.label)
      putExtra(AlarmTriggerReceiver.EXTRA_SOUND_URI, alarm.soundUri)
      putExtra(AlarmTriggerReceiver.EXTRA_HAS_MISSION, alarm.hasMission)
    }
    return PendingIntent.getBroadcast(
      context,
      alarm.id.hashCode(),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  fun arm(context: Context, alarm: StoredAlarm) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val triggerAt = nextTriggerMillis(alarm.hour, alarm.minute, alarm.repeatOnce, alarm.days)
    val pendingIntent = pendingIntentFor(context, alarm)
    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pendingIntent)
  }

  fun disarm(context: Context, alarm: StoredAlarm) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    alarmManager.cancel(pendingIntentFor(context, alarm))
  }

  fun disarmById(context: Context, id: String, hour: Int = 0, minute: Int = 0) {
    // Reconstructing a matching PendingIntent only needs the request code (derived from id) plus
    // an Intent with a matching action/component, so the rest of the fields can be defaults.
    val stub = StoredAlarm(id, hour, minute, repeatOnce = true, days = emptyList(), label = "", soundUri = null, hasMission = false)
    disarm(context, stub)
  }
}
