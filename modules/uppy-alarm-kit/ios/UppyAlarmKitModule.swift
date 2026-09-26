import AlarmKit
import ExpoModulesCore
import Foundation
import UserNotifications

/// Schedules local notifications and keeps a background AVAudioSession alive (see
/// UppyAlarmScheduler) so the alarm rings continuously and reliably through silent mode/lock
/// screen — this is the only ringing mechanism now, and has been the reliable core throughout.
///
/// This module previously also scheduled a real AlarmKit alert alongside it, best-effort, purely to
/// wake/take over a locked screen with a native-looking alert. Removed after finding a confirmed,
/// still-open Apple platform bug: when AlarmKit's alert renders in its compact/banner form (device
/// unlocked, app not foregrounded -- as opposed to the full-screen form it uses on a locked screen,
/// which worked fine), tapping its Stop control dismisses the alarm at the OS level without ever
/// invoking our stopIntent (developer.apple.com/forums/thread/815064; reproduces in Apple's own
/// AlarmKit sample app too). Since that intent was the only place we recorded which alarm to open
/// and told the app to foreground, the app would never open in that case, even though the sound
/// correctly stopped -- confirmed on a real device. There's no workaround available to us: the Stop
/// button is mandatory on every AlarmKit alert and can't be made to skip the buggy dismissal path.
/// Given the notification + background-audio mechanism already rings reliably through a locked
/// screen on its own (the phone just doesn't light up on its own first -- the person has to pick it
/// up, exactly like any alarm app before AlarmKit existed), it wasn't worth keeping a second,
/// sometimes-broken path alongside it.
///
/// `import AlarmKit` and the `AlarmManager.shared.cancel/stop` calls below remain solely to clean up
/// alarms a previous build may have already scheduled on someone's device; nothing here schedules a
/// new one anymore. UppyAlarmKitModule.cancelAllLegacyAlarmKitAlarms() (called once at launch from
/// UppyNotificationDelegate) sweeps up ones that would otherwise never get touched again.
///
/// The deployment target dropped back to 16.4 (Expo SDK 57's own floor) once AlarmKit was no
/// longer being scheduled -- 26.1 only existed here for AlarmKit in the first place. AlarmKit
/// itself still doesn't exist below iOS 26, so every `AlarmManager` call below is gated behind
/// `#available(iOS 26.0, *)`; on an older device they're simply skipped, which is correct since
/// there could never have been an AlarmKit alarm scheduled there to clean up anyway.
public class UppyAlarmKitModule: Module {
  // JS learns about a pending ringing alarm two ways: polling getPendingRingingAlarmId() (on
  // mount, and on every AppState 'active' transition) and this event, sent by
  // UppyNotificationDelegate the moment a notification tap actually happens. The event exists
  // because the polling alone has a real gap: if the app is already in the foreground when the
  // alarm fires (e.g. phone unlocked, Salio already open) there's no background-to-active
  // transition for AppState to catch, so nothing would ever re-check and the ringing screen would
  // silently never appear.
  private static weak var shared: UppyAlarmKitModule?

  public override func didCreate() {
    Self.shared = self
  }

  static func notifyAlarmTapped(alarmID: String) {
    shared?.sendEvent("onAlarmTapped", ["alarmId": alarmID])
  }

  public func definition() -> ModuleDefinition {
    Name("UppyAlarmKit")
    Events("onAlarmTapped")

    AsyncFunction("requestAuthorization") { () -> String in
      let granted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          continuation.resume(returning: granted)
        }
      }
      return granted ? "authorized" : "denied"
    }

    AsyncFunction("scheduleAlarm") { (id: String, hour: Int, minute: Int, repeatOnce: Bool, days: [Int], label: String, hasMission: Bool) in
      let displayLabel = label.isEmpty ? "Alarm" : label

      // Clear whatever was previously scheduled for this id (covers edits) before overwriting it.
      let oldDays = UppyAlarmStore.days(forAlarmID: id)
      let oldRepeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      UppyAlarmScheduler.shared.removeNotifications(forAlarmID: id, days: oldDays, repeatOnce: oldRepeatOnce)
      if #available(iOS 26.0, *), let oldAlarmKitID = UUID(uuidString: id) {
        try? AlarmManager.shared.cancel(id: oldAlarmKitID)
      }

      UppyAlarmStore.setLabel(displayLabel, forAlarmID: id)
      UppyAlarmStore.setHasMission(hasMission, forAlarmID: id)
      UppyAlarmStore.setSchedule(hour: hour, minute: minute, days: days, repeatOnce: repeatOnce, forAlarmID: id)
      UppyAlarmStore.addArmedAlarmID(id)

      UppyAlarmScheduler.shared.scheduleNotifications(
        forAlarmID: id, hour: hour, minute: minute, days: days, repeatOnce: repeatOnce, label: displayLabel
      )
      UppyAlarmScheduler.shared.armed()
    }

    Function("cancelAlarm") { (id: String) in
      let days = UppyAlarmStore.days(forAlarmID: id)
      let repeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      UppyAlarmScheduler.shared.removeNotifications(forAlarmID: id, days: days, repeatOnce: repeatOnce)
      if UppyAlarmStore.currentlyRingingAlarmID() == id {
        UppyAlarmScheduler.shared.stopRinging(alarmID: id)
      }
      if #available(iOS 26.0, *), let alarmKitID = UUID(uuidString: id) {
        try? AlarmManager.shared.cancel(id: alarmKitID)
      }
      UppyAlarmStore.clearAlarm(forAlarmID: id)
      UppyAlarmScheduler.shared.armed()
    }

    AsyncFunction("stopRinging") { (id: String) in
      UppyAlarmScheduler.shared.stopRinging(alarmID: id)
      // No longer schedules a new AlarmKit alarm (see class doc comment), but a previous build's
      // may still be pending on this device -- stop it too so it doesn't ring separately later.
      if #available(iOS 26.0, *), let alarmKitID = UUID(uuidString: id) {
        try? AlarmManager.shared.stop(id: alarmKitID)
      }
    }

    Function("getPendingRingingAlarmId") { () -> String? in
      UppyAlarmStore.pendingRingingAlarmID()
    }

    Function("clearPendingRingingAlarmId") {
      UppyAlarmStore.clearPendingRingingAlarmID()
    }
  }

  /// One-time migration cleanup, called from UppyNotificationDelegate at launch: a build before
  /// this one may have scheduled a real AlarmKit alarm (with a stopIntent type that no longer
  /// exists in this binary) for any currently-armed alarm, and since scheduleAlarm's own
  /// overwrite-cleanup only runs when an alarm is next edited, one that's never touched again would
  /// otherwise sit there indefinitely. Cheap and safe to call unconditionally on every launch.
  static func cancelAllLegacyAlarmKitAlarms() {
    guard #available(iOS 26.0, *) else { return } // AlarmKit never existed pre-26 -- nothing to clean up
    for id in UppyAlarmStore.armedAlarmIDs() {
      guard let uuid = UUID(uuidString: id) else { continue }
      try? AlarmManager.shared.cancel(id: uuid)
    }
  }
}
