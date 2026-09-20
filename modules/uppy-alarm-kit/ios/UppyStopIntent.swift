import AppIntents
import AlarmKit
import Foundation

/// Runs when the person taps/slides the system-provided Stop button. Apple's AlarmKit docs are
/// explicit that this button is automatic ("The system provides a stop button automatically") —
/// it can't be removed, relabeled, or intercepted, and it always ends that alert's presentation
/// regardless of what this intent does.
///
/// For a mission alarm, letting that tap be the end of it would defeat "no-snooze, must complete
/// the mission": a groggy person's first instinct is to hit whatever's already on screen. Since the
/// stop itself can't be gated, this re-arms instead: it schedules a fresh, near-immediate alarm
/// under a new AlarmKit id (never touching the original alarm's own recurring schedule) so the
/// alarm simply comes back a short time later. Tapping Stop buys a brief, unwanted pause, not real
/// silence — only the "Tap to end" button (UppyOpenMissionIntent) or Emergency Escape, completed
/// inside the app, actually stops AlarmKit (UppyAlarmKitModule.stopRinging).
///
/// Alarms with no dismiss mission ("tap once to dismiss") skip all of this via hasMission below.
struct UppyStopIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Stop Alarm"

  static let rearmDelaySeconds = 90
  static let maxRearms = 10

  @Parameter(title: "alarmID")
  var alarmID: String

  init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  func perform() async throws -> some IntentResult {
    guard UppyAlarmStore.hasMission(forAlarmID: alarmID) else {
      return .result()
    }

    let count = UppyAlarmStore.incrementRearmCount(forAlarmID: alarmID)
    guard count <= Self.maxRearms else {
      // Gave the person every reasonable chance to engage — stop nagging for this occurrence.
      UppyAlarmStore.resetRingingState(forAlarmID: alarmID)
      return .result()
    }

    let rearmDate = Calendar.current.date(byAdding: .second, value: Self.rearmDelaySeconds, to: Date()) ?? Date()
    let comps = Calendar.current.dateComponents([.hour, .minute], from: rearmDate)
    let schedule = Alarm.Schedule.relative(
      Alarm.Schedule.Relative(
        time: Alarm.Schedule.Relative.Time(hour: comps.hour ?? 0, minute: comps.minute ?? 0),
        repeats: .never
      )
    )

    let label = UppyAlarmStore.label(forAlarmID: alarmID)
    let missionButton = AlarmButton(text: "Tap to end", textColor: .uppyGold, systemImageName: "target")
    let alert = AlarmPresentation.Alert(
      title: LocalizedStringResource(stringLiteral: label),
      secondaryButton: missionButton,
      secondaryButtonBehavior: .custom
    )
    let attributes = AlarmAttributes<UppyAlarmMetadata>(
      presentation: AlarmPresentation(alert: alert),
      metadata: UppyAlarmMetadata(label: label),
      tintColor: .accentColor
    )

    let nagID = UUID()
    let configuration = AlarmManager.AlarmConfiguration(
      schedule: schedule,
      attributes: attributes,
      stopIntent: UppyStopIntent(alarmID: alarmID),
      secondaryIntent: UppyOpenMissionIntent(alarmID: alarmID),
      sound: .default
    )

    do {
      _ = try await AlarmManager.shared.schedule(id: nagID, configuration: configuration)
      UppyAlarmStore.setCurrentRingingAlarmKitID(nagID.uuidString, forAlarmID: alarmID)
    } catch {
      // Couldn't re-arm (e.g. AlarmKit's own scheduling limit) — nothing more to do from here.
      UppyAlarmStore.resetRingingState(forAlarmID: alarmID)
    }

    return .result()
  }
}
