import ExpoModulesCore
import AlarmKit
import Foundation

/// Wraps AlarmKit's `AlarmManager` so JS can request authorization, and schedule/update/cancel
/// alarms. AlarmKit owns the entire ringing UI on iOS (lock screen alert, Live Activity, Dynamic
/// Island) — there is no custom ringing screen to build or wire up here, only `stopIntent`
/// (see UppyStopIntent.swift). There is no `secondaryIntent`: Uppy has no snooze.
///
/// Verified against Apple's public AlarmKit documentation (developer.apple.com/documentation/
/// alarmkit — fetched directly, not from memory): AlarmManager.AuthorizationState's three cases,
/// AlarmManager.schedule(id:configuration:)/cancel(id:)/stop(id:)'s signatures, Alarm.id being a
/// plain UUID, and the Alarm.Schedule.Relative(time:repeats:) shape used below all match exactly.
/// This module also already compiled clean (no warnings) against the real iOS 26 SDK on EAS's
/// build servers. What's still unverified for lack of a real device: that a *scheduled* alarm
/// actually alerts through a locked/silenced phone — see the explicit authorization check and
/// AlarmError surfacing added below, since a real-device report of alarms not ringing traced back
/// to that failure being swallowed silently on the JS side rather than a scheduling bug per se.
public class UppyAlarmKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("UppyAlarmKit")

    AsyncFunction("requestAuthorization") { () -> String in
      let state = try await AlarmManager.shared.requestAuthorization()
      return Self.authorizationStateName(state)
    }

    Function("getAuthorizationStatus") { () -> String in
      Self.authorizationStateName(AlarmManager.shared.authorizationState)
    }

    AsyncFunction("scheduleAlarm") { (id: String, hour: Int, minute: Int, repeatOnce: Bool, days: [Int], label: String) in
      guard let uuid = UUID(uuidString: id) else {
        throw UppyAlarmKitError.invalidId
      }

      // AlarmKit auto-requests authorization on first schedule if it's never been decided, but if
      // the person already denied it (or dismissed the system prompt), scheduling will otherwise
      // fail with an opaque error. Check first so JS gets a specific, actionable failure instead
      // of alarms that silently never ring.
      let authState = AlarmManager.shared.authorizationState
      if authState == .denied {
        throw UppyAlarmKitError.notAuthorized
      }

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
        let weekdays: [Locale.Weekday] = days.compactMap { Self.weekday(fromModelDay: $0) }
        schedule = .relative(
          Alarm.Schedule.Relative(
            time: Alarm.Schedule.Relative.Time(hour: hour, minute: minute),
            repeats: .weekly(weekdays)
          )
        )
      }

      let stopButton = AlarmButton(text: "Dismiss", textColor: .white, systemImageName: "stop.fill")
      let alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: label.isEmpty ? "Alarm" : label), stopButton: stopButton)
      let presentation = AlarmPresentation(alert: alert)
      let attributes = AlarmAttributes<UppyAlarmMetadata>(
        presentation: presentation,
        metadata: UppyAlarmMetadata(label: label),
        tintColor: .accentColor
      )

      let configuration = AlarmManager.AlarmConfiguration(
        schedule: schedule,
        attributes: attributes,
        stopIntent: UppyStopIntent(alarmID: id),
        sound: .default
      )

      do {
        _ = try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
      } catch {
        // Re-throw with the underlying AlarmKit error's own description attached (e.g.
        // AlarmError.maximumLimitReached) so it isn't lost behind a generic bridge error message.
        throw UppyAlarmKitError.schedulingFailed(error.localizedDescription)
      }
    }

    Function("cancelAlarm") { (id: String) in
      guard let uuid = UUID(uuidString: id) else {
        throw UppyAlarmKitError.invalidId
      }
      try AlarmManager.shared.cancel(id: uuid)
    }
  }

  private static func authorizationStateName(_ state: AlarmManager.AuthorizationState) -> String {
    switch state {
    case .authorized:
      return "authorized"
    case .denied:
      return "denied"
    case .notDetermined:
      return "notDetermined"
    @unknown default:
      return "notDetermined"
    }
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

enum UppyAlarmKitError: LocalizedError {
  case invalidId
  case notAuthorized
  case schedulingFailed(String)

  var errorDescription: String? {
    switch self {
    case .invalidId:
      return "Invalid alarm id."
    case .notAuthorized:
      return "Wake Uppy isn't authorized to schedule alarms. Enable it in Settings > Wake Uppy."
    case .schedulingFailed(let reason):
      return "Couldn't schedule the alarm: \(reason)"
    }
  }
}
