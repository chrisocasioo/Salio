package expo.modules.uppyalarmandroid

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lightweight duplicate of each enabled alarm's schedule, kept in SharedPreferences so the
 * boot/timezone/date-changed receiver can recompute and re-arm every alarm without touching the
 * app's sqlite database (which JS/expo-sqlite owns) or waking the JS runtime.
 *
 * JS is the source of truth: every create/edit/delete/toggle round-trips through
 * scheduleAlarm()/cancelAlarm() so this store never drifts from the sqlite table for long.
 */
data class StoredAlarm(
  val id: String,
  val hour: Int,
  val minute: Int,
  val repeatOnce: Boolean,
  val days: List<Int>, // 0 = Sunday .. 6 = Saturday, only meaningful when !repeatOnce
  val label: String,
  val soundUri: String?,
  val hasMission: Boolean
)

object AlarmStore {
  private const val PREFS_NAME = "uppy_alarm_store"
  private const val KEY_ALARMS = "alarms"

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun put(context: Context, alarm: StoredAlarm) {
    val all = readAll(context).filterNot { it.id == alarm.id }.toMutableList()
    all.add(alarm)
    writeAll(context, all)
  }

  fun remove(context: Context, id: String) {
    val all = readAll(context).filterNot { it.id == id }
    writeAll(context, all)
  }

  fun readAll(context: Context): List<StoredAlarm> {
    val raw = prefs(context).getString(KEY_ALARMS, null) ?: return emptyList()
    val array = JSONArray(raw)
    return (0 until array.length()).mapNotNull { i ->
      val o = array.optJSONObject(i) ?: return@mapNotNull null
      val daysArray = o.optJSONArray("days")
      val days = daysArray?.let { arr -> (0 until arr.length()).map { arr.getInt(it) } } ?: emptyList()
      StoredAlarm(
        id = o.getString("id"),
        hour = o.getInt("hour"),
        minute = o.getInt("minute"),
        repeatOnce = o.optBoolean("repeatOnce", true),
        days = days,
        label = o.optString("label", ""),
        soundUri = if (o.isNull("soundUri")) null else o.optString("soundUri"),
        hasMission = o.optBoolean("hasMission", false)
      )
    }
  }

  private fun writeAll(context: Context, alarms: List<StoredAlarm>) {
    val array = JSONArray()
    alarms.forEach { alarm ->
      val o = JSONObject()
      o.put("id", alarm.id)
      o.put("hour", alarm.hour)
      o.put("minute", alarm.minute)
      o.put("repeatOnce", alarm.repeatOnce)
      o.put("days", JSONArray(alarm.days))
      o.put("label", alarm.label)
      o.put("soundUri", alarm.soundUri)
      o.put("hasMission", alarm.hasMission)
      array.put(o)
    }
    prefs(context).edit().putString(KEY_ALARMS, array.toString()).apply()
  }
}
