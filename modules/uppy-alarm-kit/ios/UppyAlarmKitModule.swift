import ExpoModulesCore
import AlarmKit
import Foundation

/// Wraps AlarmKit's `AlarmManager` so JS can request authorization, and schedule/update/cancel
/// alarms. AlarmKit owns the entire ringing UI on iOS (lock screen alert, Live Activity, Dynamic
/// Island) — there is no custom ringing screen to build or wire up here, only `stopIntent`
/// (see UppyStopIntent.swift). There is no `secondaryIntent`: Uppy has no snooze.
///
/// UNVERIFIED AGAINST THE REAL SDK: this was written from the AlarmKit WWDC25 session and public
/// docs without a Mac/Xcode 26 toolchain available to compile-check (this module was built in a
/// Linux sandbox). Treat every AlarmKit type/parameter name below as "best effort, confirm on
/// first real build" — in particular `Alarm.Schedule.Relative`'s shape, `AlarmPresentation.Alert`
/// button parameters, and `AlarmManager.AlarmConfiguration`'s exact initializer labels.
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

      _ = try await AlarmManager.shared.schedule(id: uuid, configuration: configuration)
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

enum UppyAlarmKitError: Error {
  case invalidId
}
