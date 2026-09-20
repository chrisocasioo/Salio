import AppIntents
import AlarmKit

/// Runs when the person taps the alert's secondary "Dismiss Mission" button. AlarmKit's
/// secondaryButtonBehavior: .custom (see UppyAlarmKitModule) is Apple's documented mechanism for a
/// secondary button that opens the app, unlike the automatic primary Stop button which always runs
/// in the background (see UppyStopIntent). This just records which alarm to show the dismiss-
/// mission screen for; App.tsx reads it via getPendingRingingAlarmId() on launch/foreground and
/// routes to AlarmRingingRoot, which calls stopRinging() once the mission (or Emergency Escape)
/// actually completes.
struct UppyOpenMissionIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Dismiss Mission"

  @Parameter(title: "alarmID")
  var alarmID: String

  init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  func perform() async throws -> some IntentResult {
    UppyAlarmStore.setPendingRingingAlarmID(alarmID)
    return .result()
  }
}
