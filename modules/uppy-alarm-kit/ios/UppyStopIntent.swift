import AppIntents
import AlarmKit

/// Runs when the person taps Stop on the AlarmKit alert / Live Activity / Dynamic Island —
/// including from the lock screen, without opening the app. There is deliberately no matching
/// "secondary" intent: Uppy has no snooze, so AlarmConfiguration only ever sets `stopIntent`.
///
/// NOTE (unverified against the real SDK — see module README): the exact protocol AlarmKit
/// expects here (`LiveActivityIntent` vs a plain `AppIntent`) and the associated-value shape for
/// passing the alarm id through were written from the AlarmKit WWDC session and public docs
/// without a Mac/Xcode 26 toolchain to compile-check against. Confirm this against
/// `AlarmKit.AlarmConfiguration.init` and `LiveActivityIntent` on first real build.
struct UppyStopIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Stop Alarm"

  @Parameter(title: "alarmID")
  var alarmID: String

  init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  func perform() async throws -> some IntentResult {
    if let uuid = UUID(uuidString: alarmID) {
      try? AlarmManager.shared.stop(id: uuid)
    }
    return .result()
  }
}
