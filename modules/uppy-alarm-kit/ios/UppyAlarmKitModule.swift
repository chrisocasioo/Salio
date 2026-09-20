import ExpoModulesCore
import Foundation
import UserNotifications

/// Schedules local notifications for each alarm and keeps a background AVAudioSession alive (see
/// UppyAlarmScheduler) so the alarm rings continuously and reliably through silent mode/lock
/// screen — no OS-owned alert UI at all, unlike AlarmKit. The ringing screen and its "Stop" button
/// are drawn entirely by the app's own JS (see AlarmRingingRoot and friends), reached via the
/// pending-ringing-id mechanism in UppyAlarmStore: the notification, when tapped, opens the app
/// and UppyNotificationDelegate (an ExpoAppDelegateSubscriber) records which alarm to show.
/// Tapping the app's own Stop button therefore routes straight into the dismiss-mission flow,
/// since it's not a system control at all — there's nothing to work around.
///
/// Switched from Apple's AlarmKit framework after confirming (a) AlarmKit's alert screen is a
/// fixed system template with no way to customize its background or replace its automatic Stop
/// button, and (b) this local-notification + background-audio approach is the real, production-
/// proven technique other alarm apps use (verified against gdelataillade/alarm, an open-source,
/// App-Store-approved Flutter alarm plugin using the identical silent-AVAudioPlayer keep-alive
/// pattern). Known limitation, same as any non-AlarmKit approach: force-quitting the app or
/// restarting the device stops alarms from ringing until the app is reopened once.
public class UppyAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UppyAlarmKit")

    AsyncFunction("requestAuthorization") { () -> String in
      await withCheckedContinuation { continuation in
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          continuation.resume(returning: granted ? "authorized" : "denied")
        }
      }
    }

    AsyncFunction("scheduleAlarm") { (id: String, hour: Int, minute: Int, repeatOnce: Bool, days: [Int], label: String, hasMission: Bool) in
      let displayLabel = label.isEmpty ? "Alarm" : label

      // Clear whatever was previously scheduled for this id (covers edits) before overwriting it.
      let oldDays = UppyAlarmStore.days(forAlarmID: id)
      let oldRepeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      UppyAlarmScheduler.shared.removeNotifications(forAlarmID: id, days: oldDays, repeatOnce: oldRepeatOnce)

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
      UppyAlarmStore.clearAlarm(forAlarmID: id)
      UppyAlarmScheduler.shared.armed()
    }

    AsyncFunction("stopRinging") { (id: String) in
      UppyAlarmScheduler.shared.stopRinging(alarmID: id)
    }

    Function("getPendingRingingAlarmId") { () -> String? in
      UppyAlarmStore.pendingRingingAlarmID()
    }

    Function("clearPendingRingingAlarmId") {
      UppyAlarmStore.clearPendingRingingAlarmID()
    }
  }
}
