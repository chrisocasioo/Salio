import ExpoModulesCore
import AlarmKit
import Foundation

/// Wraps AlarmKit's `AlarmManager` so JS can request authorization, and schedule/update/cancel
/// alarms. AlarmKit owns the ringing UI on iOS (lock screen alert, Live Activity, Dynamic Island),
/// but — confirmed on a real device — its automatic Stop button always ends the alert regardless
/// of what `stopIntent` does (Apple's own docs: "The system provides a stop button automatically",
/// not customizable or interceptable). For a mission alarm, `stopIntent` (UppyStopIntent) responds
/// by re-arming a near-immediate follow-up alarm instead of truly stopping — see that file. The
/// real stop only happens once the mission (or Emergency Escape) completes inside the app, reached
/// via the alert's secondary "Dismiss Mission" button (`secondaryButtonBehavior: .custom`, which
/// Apple documents as opening the app — see UppyOpenMissionIntent) and JS calling `stopRinging`.
///
/// Verified against Apple's public AlarmKit documentation (developer.apple.com/documentation/
/// alarmkit — fetched directly, not from memory): AlarmManager.AuthorizationState's three cases,
/// AlarmManager.schedule(id:configuration:)/cancel(id:)/stop(id:)'s signatures, Alarm.id being a
/// plain UUID, the Alarm.Schedule.Relative(time:repeats:) shape, and the non-deprecated
/// AlarmPresentation.Alert(title:secondaryButton:secondaryButtonBehavior:) initializer (the
/// `stopButton:` parameter this module used previously is deprecated and does nothing — Apple's
/// docs: "This property is not used anymore") all match exactly. Compiles clean (no warnings)
/// against the real iOS 26 SDK.
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

    AsyncFunction("scheduleAlarm") { (id: String, hour: Int, minute: Int, repeatOnce: Bool, days: [Int], label: String, hasMission: Bool) in
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

      let displayLabel = label.isEmpty ? "Alarm" : label
      // Persisted so UppyStopIntent (which may run in a fresh process) knows whether to re-arm,
      // and so re-armed nag alerts can show the same label. Reset any leftover ringing state from
      // a previous occurrence of this same alarm id.
      UppyAlarmStore.setLabel(displayLabel, forAlarmID: id)
      UppyAlarmStore.setHasMission(hasMission, forAlarmID: id)
      UppyAlarmStore.resetRingingState(forAlarmID: id)

      let alert: AlarmPresentation.Alert
      if hasMission {
        let missionButton = AlarmButton(text: "Dismiss Mission", textColor: .white, systemImageName: "target")
        alert = AlarmPresentation.Alert(
          title: LocalizedStringResource(stringLiteral: displayLabel),
          secondaryButton: missionButton,
          secondaryButtonBehavior: .custom
        )
      } else {
        alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: displayLabel))
      }
      let presentation = AlarmPresentation(alert: alert)
      let attributes = AlarmAttributes<UppyAlarmMetadata>(
        presentation: presentation,
        metadata: UppyAlarmMetadata(label: displayLabel),
        tintColor: .accentColor
      )

      let configuration = AlarmManager.AlarmConfiguration(
        schedule: schedule,
        attributes: attributes,
        stopIntent: UppyStopIntent(alarmID: id),
        secondaryIntent: hasMission ? UppyOpenMissionIntent(alarmID: id) : nil,
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
      UppyAlarmStore.resetRingingState(forAlarmID: id)
    }

    // Called once the mission (or Emergency Escape) actually completes inside the app. Resolves
    // whichever AlarmKit id is currently ringing for this alarm — the original id, or a later
    // re-arm nag id — since UppyStopIntent's re-arms never touch the original alarm's own id.
    AsyncFunction("stopRinging") { (id: String) in
      let currentIDString = UppyAlarmStore.currentRingingAlarmKitID(forAlarmID: id)
      if let currentUUID = UUID(uuidString: currentIDString) {
        try? AlarmManager.shared.stop(id: currentUUID)
      }
      UppyAlarmStore.resetRingingState(forAlarmID: id)
      if UppyAlarmStore.pendingRingingAlarmID() == id {
        UppyAlarmStore.clearPendingRingingAlarmID()
      }
    }

    Function("getPendingRingingAlarmId") { () -> String? in
      UppyAlarmStore.pendingRingingAlarmID()
    }

    Function("clearPendingRingingAlarmId") {
      UppyAlarmStore.clearPendingRingingAlarmID()
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
