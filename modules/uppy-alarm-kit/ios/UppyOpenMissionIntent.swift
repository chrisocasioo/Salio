import AppIntents
import AlarmKit
import UserNotifications

/// Runs when the person taps the alert's secondary "Dismiss Mission" button. AlarmKit's
/// secondaryButtonBehavior: .custom (see UppyAlarmKitModule) is documented as displaying "an
/// action to launch the app" — but confirmed on a real device, like every LiveActivityIntent it
/// actually still only runs in the background, same as the primary Stop button (see
/// UppyStopIntent); it does not foreground the app on its own. So this records which alarm to show
/// the dismiss-mission screen for, then posts an immediate local notification — tapping a
/// notification is an OS-guaranteed way to bring the app to the foreground, unlike anything this
/// intent can do by itself. App.tsx reads the recorded id via getPendingRingingAlarmId() on
/// launch/foreground and routes to AlarmRingingRoot, which calls stopRinging() once the mission
/// (or Emergency Escape) actually completes.
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

    let label = UppyAlarmStore.label(forAlarmID: alarmID)
    let content = UNMutableNotificationContent()
    content.title = label
    content.body = "Tap to complete your dismiss mission."
    content.sound = .default
    let request = UNNotificationRequest(identifier: "UppyMission.\(alarmID)", content: content, trigger: nil)
    UNUserNotificationCenter.current().add(request)

    return .result()
  }
}
