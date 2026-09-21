import AlarmKit
import ExpoModulesCore
import Foundation
import UserNotifications

/// Schedules local notifications and keeps a background AVAudioSession alive (see
/// UppyAlarmScheduler) so the alarm rings continuously and reliably through silent mode/lock
/// screen — this remains the reliable core, and stays exactly as it was. Alongside it, best-effort,
/// this also schedules a real AlarmKit alert for the same time: AlarmKit is the only way a
/// third-party app can actually wake and take over a locked screen on iOS, but its alert screen is
/// a fixed system template (no custom background) and its automatic Stop button can't be removed
/// or relabeled — confirmed via real-device testing the first time this project used AlarmKit,
/// which is why the notification + background-audio mechanism above was built as the real ringing
/// screen in the first place, and remains it.
///
/// The difference this time: rather than fighting the Stop button (the previous attempt re-armed a
/// follow-up alert when it was tapped), UppyAlarmStopIntent now treats every tap as "open the app,"
/// using `supportedModes: .foreground(.immediate)` — the replacement for the older, deprecated
/// `openAppWhenRun`, which this project never actually tried before pivoting away from AlarmKit.
/// AlarmKit's alert is purely a wake-and-hand-off trigger into the exact same mission-gated
/// AlarmRingingRoot flow a notification tap already opens; it never owns the actual dismiss logic,
/// so nothing about the no-snooze/mission design changes.
///
/// AlarmKit scheduling is best-effort and never blocks or fails the call: authorization can be
/// declined, or AlarmKit's own scheduling limits can be hit, and none of that should stop the
/// alarm from working via the notification + background-audio mechanism alone.
public class UppyAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UppyAlarmKit")

    AsyncFunction("requestAuthorization") { () -> String in
      let granted = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          continuation.resume(returning: granted)
        }
      }
      // Best-effort, on top of the notification permission above -- this is what lets the AlarmKit
      // alert (scheduleAlarm below) actually wake/take over a locked screen. Declining it just
      // means alarms keep working via the notification + background-audio mechanism alone.
      _ = try? await AlarmManager.shared.requestAuthorization()
      return granted ? "authorized" : "denied"
    }

    AsyncFunction("scheduleAlarm") { (id: String, hour: Int, minute: Int, repeatOnce: Bool, days: [Int], label: String, hasMission: Bool) in
      let displayLabel = label.isEmpty ? "Alarm" : label

      // Clear whatever was previously scheduled for this id (covers edits) before overwriting it.
      let oldDays = UppyAlarmStore.days(forAlarmID: id)
      let oldRepeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      UppyAlarmScheduler.shared.removeNotifications(forAlarmID: id, days: oldDays, repeatOnce: oldRepeatOnce)
      if let oldAlarmKitID = UUID(uuidString: id) {
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

      await Self.scheduleAlarmKitAlert(
        id: id, hour: hour, minute: minute, days: days, repeatOnce: repeatOnce, label: displayLabel
      )
    }

    Function("cancelAlarm") { (id: String) in
      let days = UppyAlarmStore.days(forAlarmID: id)
      let repeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      UppyAlarmScheduler.shared.removeNotifications(forAlarmID: id, days: days, repeatOnce: repeatOnce)
      if UppyAlarmStore.currentlyRingingAlarmID() == id {
        UppyAlarmScheduler.shared.stopRinging(alarmID: id)
      }
      if let alarmKitID = UUID(uuidString: id) {
        try? AlarmManager.shared.cancel(id: alarmKitID)
      }
      UppyAlarmStore.clearAlarm(forAlarmID: id)
      UppyAlarmScheduler.shared.armed()
    }

    AsyncFunction("stopRinging") { (id: String) in
      UppyAlarmScheduler.shared.stopRinging(alarmID: id)
      // Normally already stopped by UppyAlarmStopIntent when the AlarmKit alert's Stop button was
      // tapped, but this path can also be reached via a plain notification tap (or if the AlarmKit
      // alert never showed) -- stop it here too so nothing keeps counting for an already-dismissed
      // alarm.
      if let alarmKitID = UUID(uuidString: id) {
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

  private static func scheduleAlarmKitAlert(
    id: String, hour: Int, minute: Int, days: [Int], repeatOnce: Bool, label: String
  ) async {
    guard let uuid = UUID(uuidString: id) else { return }
    guard AlarmManager.shared.authorizationState == .authorized else { return }

    let schedule: Alarm.Schedule
    if repeatOnce || days.isEmpty {
      schedule = .relative(
        Alarm.Schedule.Relative(
          time: Alarm.Schedule.Relative.Time(hour: hour, minute: minute),
          repeats: .never
        )
      )
    } else {
      // Our model's days are 0 (Sunday) ... 6 (Saturday); Locale.Weekday's ordering follows the
      // same Sunday-first convention.
      let weekdays: [Locale.Weekday] = days.compactMap { weekday(fromModelDay: $0) }
      schedule = .relative(
        Alarm.Schedule.Relative(
          time: Alarm.Schedule.Relative.Time(hour: hour, minute: minute),
          repeats: .weekly(weekdays)
        )
      )
    }

    // No secondary button: a single automatic Stop button that hands off into the app's own
    // mission-gated flow (see UppyAlarmStopIntent) covers both mission and no-mission alarms, since
    // AlarmRingingRoot already branches on that once opened -- nothing here needs to know which.
    let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: label))
    let attributes = AlarmAttributes<UppyAlarmMetadata>(
      presentation: AlarmPresentation(alert: alert),
      metadata: UppyAlarmMetadata(label: label),
      tintColor: .uppyGold
    )
    let configuration = AlarmManager.AlarmConfiguration(
      schedule: schedule,
      attributes: attributes,
      stopIntent: UppyAlarmStopIntent(alarmID: id),
      secondaryIntent: nil,
      sound: .default
    )

    _ = try? await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
  }

  private static func weekday(fromModelDay day: Int) -> Locale.Weekday? {
    switch day {
    case 0: return .sunday
    case 1: return .monday
    case 2: return .tuesday
    case 3: return .wednesday
    case 4: return .thursday
    case 5: return .friday
    case 6: return .saturday
    default: return nil
    }
  }
}
