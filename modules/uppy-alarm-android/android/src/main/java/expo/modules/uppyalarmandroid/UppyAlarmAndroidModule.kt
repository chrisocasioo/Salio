package expo.modules.uppyalarmandroid

import android.app.AlarmManager
import android.content.Context
import android.content.Intent
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class UppyAlarmAndroidModule : Module() {

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available yet" }

  override fun definition() = ModuleDefinition {
    Name("UppyAlarmAndroid")

    Function("scheduleAlarm") { id: String, hour: Int, minute: Int, repeatOnce: Boolean, days: List<Int>, label: String, soundUri: String?, hasMission: Boolean ->
      val alarm = StoredAlarm(id, hour, minute, repeatOnce, days, label, soundUri, hasMission)
      AlarmStore.put(context, alarm)
      AlarmScheduling.arm(context, alarm)
    }

    Function("cancelAlarm") { id: String ->
      val stored = AlarmStore.readAll(context).firstOrNull { it.id == id }
      if (stored != null) {
        AlarmScheduling.disarm(context, stored)
        AlarmStore.remove(context, id)
      }
    }

    // Stops the ringing service (if it's the currently-ringing alarm) and closes the full-screen
    // ringing activity. Used for a plain Dismiss and after a successful mission photo.
    Function("dismissAlarm") { id: String ->
      if (RingingService.currentAlarmId == id) {
        context.startService(Intent(context, RingingService::class.java).apply {
          action = RingingService.ACTION_STOP
        })
      }
      (appContext.currentActivity as? AlarmRingingActivity)?.finishRinging()
    }

    Function("canScheduleExactAlarms") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        alarmManager.canScheduleExactAlarms()
      } else {
        true
      }
    }

    // Android 12+ requires sending the user to system settings to grant SCHEDULE_EXACT_ALARM;
    // there is no runtime permission dialog for it.
    Function("openExactAlarmSettings") {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          data = Uri.parse("package:${context.packageName}")
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        context.startActivity(intent)
      }
    }

    Function("isIgnoringBatteryOptimizations") {
      val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
      pm.isIgnoringBatteryOptimizations(context.packageName)
    }

    Function("requestIgnoreBatteryOptimizations") {
      val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
        data = Uri.parse("package:${context.packageName}")
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      context.startActivity(intent)
    }

    // RingtoneManager.TYPE_ALARM cursor of whatever alarm sounds this device ships/has installed
    // (names and count vary by manufacturer — see build brief Stage 3 / Section 6).
    Function("listAlarmSounds") {
      val manager = RingtoneManager(context).apply { setType(RingtoneManager.TYPE_ALARM) }
      val cursor = manager.cursor
      val results = mutableListOf<Map<String, String>>()
      while (cursor.moveToNext()) {
        val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
        val uri = manager.getRingtoneUri(cursor.position).toString()
        results.add(mapOf("uri" to uri, "name" to title))
      }
      results
    }

    Function("getDefaultAlarmSoundUri") {
      RingtoneManager.getActualDefaultRingtoneUri(context, RingtoneManager.TYPE_ALARM)?.toString()
    }
  }
}
