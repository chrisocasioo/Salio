import Foundation

/// Small UserDefaults-backed store shared between UppyAlarmKitModule and the AppIntents
/// (UppyStopIntent, UppyOpenMissionIntent). The intents can run in a fresh process instance
/// separate from whatever was running when the alarm was scheduled, so this is the only reliable
/// way for them to share state: which alarm should re-arm after the system Stop button is tapped,
/// and which alarm the app should open to when the "Dismiss Mission" button is tapped.
enum UppyAlarmStore {
  private static let defaults = UserDefaults.standard
  private static let pendingRingingKey = "UppyAlarm.pendingRingingId"

  static func setLabel(_ label: String, forAlarmID id: String) {
    defaults.set(label, forKey: "UppyAlarm.label.\(id)")
  }

  static func label(forAlarmID id: String) -> String {
    defaults.string(forKey: "UppyAlarm.label.\(id)") ?? "Alarm"
  }

  static func setHasMission(_ hasMission: Bool, forAlarmID id: String) {
    defaults.set(hasMission, forKey: "UppyAlarm.hasMission.\(id)")
  }

  static func hasMission(forAlarmID id: String) -> Bool {
    defaults.bool(forKey: "UppyAlarm.hasMission.\(id)")
  }

  /// The AlarmKit-registered id currently ringing for this alarm — the alarm's own id until a
  /// re-arm swaps in a fresh nag id, so callers can always resolve which id to actually stop().
  static func setCurrentRingingAlarmKitID(_ alarmKitID: String, forAlarmID id: String) {
    defaults.set(alarmKitID, forKey: "UppyAlarm.currentRingingId.\(id)")
  }

  static func currentRingingAlarmKitID(forAlarmID id: String) -> String {
    defaults.string(forKey: "UppyAlarm.currentRingingId.\(id)") ?? id
  }

  static func incrementRearmCount(forAlarmID id: String) -> Int {
    let key = "UppyAlarm.rearmCount.\(id)"
    let next = defaults.integer(forKey: key) + 1
    defaults.set(next, forKey: key)
    return next
  }

  static func resetRingingState(forAlarmID id: String) {
    defaults.removeObject(forKey: "UppyAlarm.rearmCount.\(id)")
    defaults.removeObject(forKey: "UppyAlarm.currentRingingId.\(id)")
  }

  static func setPendingRingingAlarmID(_ id: String) {
    defaults.set(id, forKey: pendingRingingKey)
  }

  static func pendingRingingAlarmID() -> String? {
    defaults.string(forKey: pendingRingingKey)
  }

  static func clearPendingRingingAlarmID() {
    defaults.removeObject(forKey: pendingRingingKey)
  }
}
