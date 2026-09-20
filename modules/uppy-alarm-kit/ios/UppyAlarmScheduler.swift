import AVFoundation
import Foundation
import UserNotifications

/// Owns the mechanism that makes alarms ring reliably without Apple's AlarmKit: a silent,
/// continuously-looping AVAudioPlayer (category .playback) keeps this app running in the
/// background for as long as any alarm is armed — `.playback` audio plays through the mute switch
/// and keeps the process alive rather than suspended, which is what a plain scheduled local
/// notification cannot do on its own (its own sound is capped at ~30s and doesn't loop). A timer
/// that only runs while that keep-alive session is active polls every few seconds for a due alarm;
/// when one fires, it switches to the real, looping alarm tone. The pre-scheduled local
/// notification (see scheduleNotifications) still exists independently as the lock-screen banner
/// and the way a colder app (e.g. evicted by the OS for memory) gets reopened at all.
///
/// Verified against gdelataillade/alarm, an open-source, App-Store-approved Flutter alarm plugin
/// using this exact silent-AVAudioPlayer keep-alive technique — not something invented here.
/// Known limitation shared by any non-AlarmKit approach (including, per that plugin's own docs):
/// force-quitting the app or restarting the device stops alarms from ringing until the app is
/// reopened once, since nothing can survive that on iOS.
final class UppyAlarmScheduler {
  static let shared = UppyAlarmScheduler()
  private init() {}

  private var keepAlivePlayer: AVAudioPlayer?
  private var ringPlayer: AVAudioPlayer?
  private var pollTimer: Timer?

  // MARK: - Keep-alive / ringing lifecycle

  /// Single entry point: call after any schedule/cancel/stop change. Starts or stops the
  /// keep-alive session and polling timer to match whether any alarm is armed or ringing.
  func armed() {
    let hasArmed = !UppyAlarmStore.armedAlarmIDs().isEmpty
    let isRinging = UppyAlarmStore.currentlyRingingAlarmID() != nil

    guard hasArmed || isRinging else {
      stopEverything()
      return
    }

    ensurePolling()

    if isRinging {
      return // ringPlayer already owns the session; leave it alone.
    }

    guard keepAlivePlayer?.isPlaying != true else { return }
    activateSession(mixWithOthers: true)
    let player = keepAlivePlayer ?? loadPlayer(resource: "UppyKeepAlive")
    keepAlivePlayer = player
    player?.numberOfLoops = -1
    player?.volume = 0
    player?.play()
  }

  /// Also called by UppyNotificationDelegate when the person opens a ringing notification and the
  /// app's own timer never caught it (e.g. the process had been evicted) — rings late rather than
  /// not at all.
  func startRinging(alarmID id: String, repeatOnce: Bool) {
    guard UppyAlarmStore.currentlyRingingAlarmID() != id else { return }
    UppyAlarmStore.setCurrentlyRingingAlarmID(id)
    if repeatOnce {
      UppyAlarmStore.removeArmedAlarmID(id)
    }
    UppyAlarmStore.setPendingRingingAlarmID(id)

    keepAlivePlayer?.stop()
    activateSession(mixWithOthers: false)
    let player = ringPlayer ?? loadPlayer(resource: "UppyAlarmTone")
    ringPlayer = player
    player?.numberOfLoops = -1
    player?.volume = 1
    player?.play()
  }

  /// Called once the mission (or Emergency Escape) completes inside the app.
  func stopRinging(alarmID id: String) {
    guard UppyAlarmStore.currentlyRingingAlarmID() == id else {
      if UppyAlarmStore.pendingRingingAlarmID() == id {
        UppyAlarmStore.clearPendingRingingAlarmID()
      }
      return
    }
    ringPlayer?.stop()
    UppyAlarmStore.setCurrentlyRingingAlarmID(nil)
    UppyAlarmStore.clearPendingRingingAlarmID()
    armed()
  }

  private func stopEverything() {
    pollTimer?.invalidate()
    pollTimer = nil
    keepAlivePlayer?.stop()
    ringPlayer?.stop()
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private func ensurePolling() {
    guard pollTimer == nil else { return }
    let timer = Timer(timeInterval: 5, repeats: true) { [weak self] _ in
      self?.checkDue()
    }
    RunLoop.main.add(timer, forMode: .common)
    pollTimer = timer
  }

  private func checkDue() {
    guard UppyAlarmStore.currentlyRingingAlarmID() == nil else { return }

    let now = Date()
    let calendar = Calendar.current
    let comps = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: now)
    guard let hour = comps.hour, let minute = comps.minute else { return }
    // Our model's days are 0 (Sunday) ... 6 (Saturday); Calendar's weekday is 1 (Sunday) ... 7.
    let modelWeekday = calendar.component(.weekday, from: now) - 1
    let occurrenceKey = "\(comps.year ?? 0)-\(comps.month ?? 0)-\(comps.day ?? 0)T\(hour):\(minute)"

    for id in UppyAlarmStore.armedAlarmIDs() {
      guard UppyAlarmStore.hour(forAlarmID: id) == hour, UppyAlarmStore.minute(forAlarmID: id) == minute else {
        continue
      }
      let repeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: id)
      guard repeatOnce || UppyAlarmStore.days(forAlarmID: id).contains(modelWeekday) else { continue }
      guard UppyAlarmStore.lastFiredOccurrenceKey(forAlarmID: id) != occurrenceKey else { continue }

      UppyAlarmStore.setLastFiredOccurrenceKey(occurrenceKey, forAlarmID: id)
      startRinging(alarmID: id, repeatOnce: repeatOnce)
      break // only ring one alarm at a time
    }
  }

  private func activateSession(mixWithOthers: Bool) {
    let session = AVAudioSession.sharedInstance()
    let options: AVAudioSession.CategoryOptions = mixWithOthers ? [.mixWithOthers] : []
    try? session.setCategory(.playback, mode: .default, options: options)
    try? session.setActive(true)
  }

  private func loadPlayer(resource: String) -> AVAudioPlayer? {
    guard let url = Bundle(for: UppyAlarmKitModule.self).url(forResource: resource, withExtension: "wav") else {
      return nil
    }
    return try? AVAudioPlayer(contentsOf: url)
  }

  // MARK: - Notification scheduling

  private func identifiers(days: [Int], repeatOnce: Bool, id: String) -> [String] {
    if repeatOnce || days.isEmpty {
      return ["\(id)_once"]
    }
    return days.map { "\(id)_day_\($0)" }
  }

  func removeNotifications(forAlarmID id: String, days: [Int], repeatOnce: Bool) {
    UNUserNotificationCenter.current().removePendingNotificationRequests(
      withIdentifiers: identifiers(days: days, repeatOnce: repeatOnce, id: id)
    )
  }

  /// One UNNotificationRequest per selected weekday (a weekly-repeating calendar trigger only
  /// matches a single weekday), or one non-repeating "next time this hour:minute occurs" trigger
  /// for a one-time alarm.
  func scheduleNotifications(
    forAlarmID id: String, hour: Int, minute: Int, days: [Int], repeatOnce: Bool, label: String
  ) {
    let content = UNMutableNotificationContent()
    content.title = label
    content.body = "Tap to open your alarm."
    content.sound = .default
    content.userInfo = ["alarmId": id]

    let center = UNUserNotificationCenter.current()

    if repeatOnce || days.isEmpty {
      var comps = DateComponents()
      comps.hour = hour
      comps.minute = minute
      let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
      let request = UNNotificationRequest(identifier: "\(id)_once", content: content, trigger: trigger)
      center.add(request, withCompletionHandler: nil)
    } else {
      for day in days {
        var comps = DateComponents()
        comps.hour = hour
        comps.minute = minute
        comps.weekday = day + 1 // our model: 0=Sunday...6=Saturday; Calendar.weekday: 1=Sunday...7
        let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
        let request = UNNotificationRequest(identifier: "\(id)_day_\(day)", content: content, trigger: trigger)
        center.add(request, withCompletionHandler: nil)
      }
    }
  }
}
