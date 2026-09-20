import Foundation

/// UserDefaults-backed store for everything the alarm scheduler/timer and the notification
/// delegate need, since they can run independently of whatever triggered a given callback: each
/// armed alarm's schedule (so the polling timer can decide when it's due), which one (if any) is
/// currently ringing, and which alarm the app should open its ringing screen for.
enum UppyAlarmStore {
  private static let defaults = UserDefaults.standard
  private static let armedIdsKey = "UppyAlarm.armedIds"
  private static let pendingRingingKey = "UppyAlarm.pendingRingingId"
  private static let currentlyRingingKey = "UppyAlarm.currentlyRingingId"

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

  /// Persists what the polling timer needs to decide whether this alarm is due right now.
  static func setSchedule(hour: Int, minute: Int, days: [Int], repeatOnce: Bool, forAlarmID id: String) {
    defaults.set(hour, forKey: "UppyAlarm.hour.\(id)")
    defaults.set(minute, forKey: "UppyAlarm.minute.\(id)")
    defaults.set(days, forKey: "UppyAlarm.days.\(id)")
    defaults.set(repeatOnce, forKey: "UppyAlarm.repeatOnce.\(id)")
  }

  static func hour(forAlarmID id: String) -> Int {
    defaults.integer(forKey: "UppyAlarm.hour.\(id)")
  }

  static func minute(forAlarmID id: String) -> Int {
    defaults.integer(forKey: "UppyAlarm.minute.\(id)")
  }

  static func days(forAlarmID id: String) -> [Int] {
    defaults.array(forKey: "UppyAlarm.days.\(id)") as? [Int] ?? []
  }

  static func repeatOnce(forAlarmID id: String) -> Bool {
    defaults.bool(forKey: "UppyAlarm.repeatOnce.\(id)")
  }

  /// The occurrence (e.g. "2026-09-21 07:00") this alarm last actually fired for, so the polling
  /// timer — which checks every few seconds — doesn't re-trigger repeatedly inside that same
  /// minute, and so a repeating alarm knows it's free to fire again on its next matching day.
  static func lastFiredOccurrenceKey(forAlarmID id: String) -> String? {
    defaults.string(forKey: "UppyAlarm.lastFired.\(id)")
  }

  static func setLastFiredOccurrenceKey(_ key: String, forAlarmID id: String) {
    defaults.set(key, forKey: "UppyAlarm.lastFired.\(id)")
  }

  /// All alarm ids the polling timer should currently be checking. Every field above stays
  /// around even after an id is removed from this set (harmless, and cheap to just leave) —
  /// only clearAlarm actually deletes them, when the alarm itself is deleted.
  static func armedAlarmIDs() -> [String] {
    defaults.stringArray(forKey: armedIdsKey) ?? []
  }

  static func addArmedAlarmID(_ id: String) {
    var ids = Set(armedAlarmIDs())
    ids.insert(id)
    defaults.set(Array(ids), forKey: armedIdsKey)
  }

  static func removeArmedAlarmID(_ id: String) {
    var ids = Set(armedAlarmIDs())
    ids.remove(id)
    defaults.set(Array(ids), forKey: armedIdsKey)
  }

  static func clearAlarm(forAlarmID id: String) {
    removeArmedAlarmID(id)
    for key in ["label", "hasMission", "hour", "minute", "days", "repeatOnce", "lastFired"] {
      defaults.removeObject(forKey: "UppyAlarm.\(key).\(id)")
    }
    if currentlyRingingAlarmID() == id {
      setCurrentlyRingingAlarmID(nil)
    }
  }

  /// Which alarm (if any) is actively ringing right now — lets the polling timer avoid starting
  /// a second alarm on top of one already ringing, and lets stopRinging know what to silence.
  static func currentlyRingingAlarmID() -> String? {
    defaults.string(forKey: currentlyRingingKey)
  }

  static func setCurrentlyRingingAlarmID(_ id: String?) {
    if let id = id {
      defaults.set(id, forKey: currentlyRingingKey)
    } else {
      defaults.removeObject(forKey: currentlyRingingKey)
    }
  }

  /// Set when the person taps the ringing notification, so App.tsx knows which alarm to open its
  /// ringing screen for — read via getPendingRingingAlarmId() on launch/foreground.
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
