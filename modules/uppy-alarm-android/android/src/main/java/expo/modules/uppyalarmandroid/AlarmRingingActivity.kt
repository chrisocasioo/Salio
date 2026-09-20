package expo.modules.uppyalarmandroid

import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate

/**
 * The full-screen ringing entry point. AlarmManager -> AlarmTriggerReceiver -> RingingService's
 * full-screen notification all lead here. Rather than duplicating the ringing UI in native code,
 * this hosts the same JS bundle as MainActivity but boots straight into the "alarmRinging" RN
 * root (registered separately in index.ts) so the polished AlarmRinging / AlarmRingingMission /
 * MissionCapture / EmergencyEscape screens are reused as-is, skipping the normal alarm-list route.
 *
 * Shares the app's single ReactNativeHost/ReactHost (from MainApplication implementing
 * ReactApplication) automatically — a second ReactActivity subclass does not need its own host.
 *
 * NOTE: unlike MainActivity, this does not wrap its delegate with Expo's
 * ReactActivityDelegateWrapper, so activity-lifecycle hooks some Expo modules register only
 * through that wrapper won't fire here. expo-camera's permission/activity-result callbacks are
 * still delivered (ReactActivity forwards onActivityResult/onRequestPermissionsResult itself);
 * revisit with the wrapper if a later module needs more than that during a real device pass.
 */
class AlarmRingingActivity : ReactActivity() {

  companion object {
    const val EXTRA_ALARM_ID = "alarmId"
    const val EXTRA_LABEL = "label"
    const val EXTRA_HAS_MISSION = "hasMission"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    showOverLockScreen()
    super.onCreate(null) // never restore saved instance state for a ringing screen
  }

  private fun showOverLockScreen() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
      val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
      keyguardManager.requestDismissKeyguard(this, null)
    } else {
      @Suppress("DEPRECATION")
      window.addFlags(
        android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
          android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
          android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
          android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
      )
    }
  }

  override fun getMainComponentName(): String = "alarmRinging"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return object : ReactActivityDelegate(this, mainComponentName) {
      override fun getLaunchOptions(): Bundle {
        return Bundle().apply {
          putString(EXTRA_ALARM_ID, intent.getStringExtra(EXTRA_ALARM_ID))
          putString(EXTRA_LABEL, intent.getStringExtra(EXTRA_LABEL))
          putBoolean(EXTRA_HAS_MISSION, intent.getBooleanExtra(EXTRA_HAS_MISSION, false))
        }
      }
    }
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
  }

  /** Called from the JS side (via UppyAlarmAndroidModule.dismissAlarm) once an alarm is stopped. */
  fun finishRinging() {
    finishAndRemoveTask()
  }
}
