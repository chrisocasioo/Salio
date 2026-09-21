import AVFoundation
import Foundation
import MediaPlayer
import UIKit
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
/// using this exact silent-AVAudioPlayer keep-alive technique — not something invented here. Two
/// things that plugin also has to handle, and this now does too: registerForInterruptions()
/// resumes playback after anything (a call, Siri, ...) pauses it — without this the keep-alive
/// session could go silently dead hours before an alarm is even due — and forceMaxVolume() raises
/// the system (media) volume while ringing, since `.playback` category audio still plays at
/// whatever that volume happens to be, only the physical mute switch is bypassed automatically.
///
/// Known limitation shared by any non-AlarmKit approach (including, per that plugin's own docs):
/// force-quitting the app or restarting the device stops alarms from ringing until the app is
/// reopened once, since nothing can survive that on iOS. refreshForceQuitWarning() surfaces that
/// to the person exactly when it happens, rather than as an upfront onboarding disclaimer.
final class UppyAlarmScheduler {
  static let shared = UppyAlarmScheduler()
  private init() {}

  private var keepAlivePlayer: AVAudioPlayer?
  private var ringPlayer: AVAudioPlayer?
  private var pollTimer: Timer?
  private var interruptionObserver: NSObjectProtocol?

  private static let forceQuitWarningID = "UppyForceQuitWarning"
  /// How far out the warning is scheduled each heartbeat — long enough that the ~5s poll interval
  /// can always defer it again before it fires during normal operation, short enough that a real
  /// kill surfaces the warning promptly.
  private static let forceQuitWarningDelay: TimeInterval = 15

  /// Matches the 5 languages localized on the JS side (src/i18n) — this notification is scheduled
  /// entirely from native code, so it can't reuse that dictionary and needs its own copy here.
  /// Falls back to English for any other device language.
  private static let forceQuitWarningStrings: [String: (title: String, body: String)] = [
    "en": ("Reopen Salio", "Your alarm may not ring while the app is closed."),
    "es": ("Vuelve a abrir Salio", "Es posible que tu alarma no suene mientras la app esté cerrada."),
    "fr": ("Rouvrez Salio", "Votre alarme pourrait ne pas sonner tant que l’application est fermée."),
    "pt": ("Reabra o Salio", "Seu alarme pode não tocar enquanto o app estiver fechado."),
    "ja": ("Salioを再度開いてください", "アプリが閉じている間はアラームが鳴らない可能性があります。"),
  ]

  private static func forceQuitWarningCopy() -> (title: String, body: String) {
    let code = Locale.preferredLanguages.first.map { String($0.prefix(2)).lowercased() } ?? "en"
    return forceQuitWarningStrings[code] ?? forceQuitWarningStrings["en"]!
  }

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

    registerForInterruptions()
    ensurePolling()
    refreshForceQuitWarning()

    if isRinging {
      return // ringPlayer already owns the session; leave it alone.
    }

    guard keepAlivePlayer?.isPlaying != true else { return }
    activateSession(mixWithOthers: true)
    let player = keepAlivePlayer ?? loadPlayer(resource: "UppyKeepAlive")
    keepAlivePlayer = player
    player?.numberOfLoops = -1
    player?.volume = 0.01
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
    forceMaxVolume()
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

  /// Without this, anything that interrupts audio for a moment — a phone call, Siri, another
  /// app's alert sound, even just a brief system chime — pauses AVAudioPlayer and, since nothing
  /// was resuming it, would leave the keep-alive session (and therefore the whole background
  /// mechanism) silently dead for however long remained until the alarm was due. Apple's own
  /// guidance for any background-audio app is to observe this notification and resume playback
  /// once the interruption ends.
  private func registerForInterruptions() {
    guard interruptionObserver == nil else { return }
    interruptionObserver = NotificationCenter.default.addObserver(
      forName: AVAudioSession.interruptionNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.handleInterruption(notification)
    }
  }

  private func handleInterruption(_ notification: Notification) {
    guard let info = notification.userInfo,
          let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
          AVAudioSession.InterruptionType(rawValue: typeValue) == .ended
    else {
      return
    }
    if UppyAlarmStore.currentlyRingingAlarmID() != nil {
      activateSession(mixWithOthers: false)
      forceMaxVolume()
      ringPlayer?.play()
    } else {
      keepAlivePlayer = nil // force a fresh player/session rather than assume the old one is still valid
      armed()
    }
  }

  /// Real alarm-clock reliability needs the alarm audible regardless of whatever the phone's
  /// current media volume happens to be — `.playback` category audio still plays at that volume
  /// level, it only bypasses the physical mute switch. This forces the system volume up via the
  /// standard MPVolumeView slider technique, the same kind of fix the reference plugin's own
  /// `volumeEnforced` option makes ("with no volume the target is getSystemVolume()... resets the
  /// system volume... whenever it drifts").
  private func forceMaxVolume() {
    DispatchQueue.main.async {
      guard let window = UIApplication.shared.connectedScenes
        .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
        .first
      else {
        return
      }
      let volumeView = MPVolumeView(frame: CGRect(x: -1000, y: -1000, width: 1, height: 1))
      window.addSubview(volumeView)
      if let slider = volumeView.subviews.first(where: { $0 is UISlider }) as? UISlider {
        slider.value = 1.0
      }
      volumeView.removeFromSuperview()
    }
  }

  private func stopEverything() {
    pollTimer?.invalidate()
    pollTimer = nil
    keepAlivePlayer?.stop()
    ringPlayer?.stop()
    cancelForceQuitWarning()
    try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
  }

  private func ensurePolling() {
    guard pollTimer == nil else { return }
    let timer = Timer(timeInterval: 5, repeats: true) { [weak self] _ in
      self?.checkDue()
      self?.refreshForceQuitWarning()
    }
    RunLoop.main.add(timer, forMode: .common)
    pollTimer = timer
  }

  /// Dead man's switch: there's no reliable way to detect the moment the app is force-quit on iOS
  /// (applicationWillTerminate isn't called for a swipe-away kill), so instead this keeps deferring
  /// a short-delay warning notification every ~5s while the app stays alive. If the process is
  /// force-quit, crashes, is evicted for memory, or the device restarts, nothing cancels/reschedules
  /// it anymore, so the last pending one fires on its own a few seconds later — surfacing the
  /// warning exactly when it's actually relevant, never during normal operation.
  private func refreshForceQuitWarning() {
    let center = UNUserNotificationCenter.current()
    center.removePendingNotificationRequests(withIdentifiers: [Self.forceQuitWarningID])

    let hasArmed = !UppyAlarmStore.armedAlarmIDs().isEmpty
    let isRinging = UppyAlarmStore.currentlyRingingAlarmID() != nil
    guard hasArmed || isRinging else { return }

    let copy = Self.forceQuitWarningCopy()
    let content = UNMutableNotificationContent()
    content.title = copy.title
    content.body = copy.body
    content.sound = .default
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: Self.forceQuitWarningDelay, repeats: false)
    let request = UNNotificationRequest(identifier: Self.forceQuitWarningID, content: content, trigger: trigger)
    center.add(request, withCompletionHandler: nil)
  }

  private func cancelForceQuitWarning() {
    UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [Self.forceQuitWarningID])
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
