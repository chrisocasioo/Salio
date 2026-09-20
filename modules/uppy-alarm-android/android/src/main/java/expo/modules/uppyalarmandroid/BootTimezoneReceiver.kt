package expo.modules.uppyalarmandroid

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Re-arms every stored alarm after a reboot, a timezone change, or a date change (e.g. crossing
 * a DST boundary), since AlarmManager entries do not survive any of those on their own.
 */
class BootTimezoneReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    when (intent.action) {
      Intent.ACTION_BOOT_COMPLETED,
      Intent.ACTION_TIMEZONE_CHANGED,
      Intent.ACTION_DATE_CHANGED,
      Intent.ACTION_MY_PACKAGE_REPLACED -> {
        AlarmStore.readAll(context).forEach { alarm ->
          AlarmScheduling.arm(context, alarm)
        }
      }
    }
  }
}
