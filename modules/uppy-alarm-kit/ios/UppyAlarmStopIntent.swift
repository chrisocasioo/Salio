import AppIntents
import AlarmKit
import Foundation

/// Runs when the person taps AlarmKit's automatic Stop button. That button's label/appearance
/// can't be customized (the `stopButton:` parameter on AlarmPresentation.Alert is deprecated and
/// does nothing — the system always shows its own default), and tapping it always ends that
/// alert's presentation no matter what this intent does. So this doesn't try to prevent that or
/// re-arm a follow-up alert (the approach tried the first time this project used AlarmKit): it
/// treats the tap as "open the app," using `supportedModes: .foreground(.immediate)` to reliably
/// bring Salio itself to the foreground. That flag is the fix for the older, deprecated
/// `openAppWhenRun`, which is why a nearly identical intent didn't reliably foreground the app
/// when this was first attempted — this repo never actually tried the current, working mechanism.
///
/// Once foregrounded, the existing mission-gated ringing flow (AlarmRingingRoot, reached the same
/// way as opening a locked-screen notification) takes over exactly as it already does — no snooze,
/// no dismissal, until the mission or Emergency Escape completes inside the app. AlarmKit's own
/// alert is only ever a wake-and-hand-off trigger; it never owns the actual dismiss logic.
///
/// Deliberately does NOT call AlarmManager.shared.stop(id:) here, even though that's normally the
/// right cleanup once an alert is done: AlarmKit's own alert had its own sound playing this whole
/// time, and ending it tears down the shared AVAudioSession as a side effect. Cleaning up the
/// underlying AlarmKit alarm is deferred to UppyAlarmKitModule.stopRinging, which already calls it
/// — safely, since by then the person has actually finished dismissing the alarm and every sound is
/// meant to stop together anyway.
///
/// That AVAudioSession teardown turns out to happen regardless of whether this app calls stop(id:)
/// itself: tapping AlarmKit's own built-in Stop button ends AlarmKit's own alert (and its `sound:
/// .default`) as an OS-level action tied to that button, independent of this intent's own code —
/// confirmed on a real device after removing the stop(id:) call above didn't fix the sound cutting
/// out. Since our own background poll (see UppyAlarmScheduler.checkDue) almost always starts our
/// real ringPlayer before the person notices this alert and taps Stop, that teardown silences an
/// already-playing sound with nothing to revive it unless this intent explicitly reactivates the
/// session and resumes playback itself — see UppyAlarmScheduler.resumeRingingAfterAlarmKitHandoff.
struct UppyAlarmStopIntent: LiveActivityIntent {
  static var title: LocalizedStringResource = "Open Alarm"

  static var supportedModes: IntentModes { .foreground(.immediate) }

  @Parameter(title: "alarmID")
  var alarmID: String

  init() {}

  init(alarmID: String) {
    self.alarmID = alarmID
  }

  func perform() async throws -> some IntentResult {
    UppyAlarmStore.setPendingRingingAlarmID(alarmID)

    let repeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: alarmID)
    UppyAlarmScheduler.shared.resumeRingingAfterAlarmKitHandoff(alarmID: alarmID, repeatOnce: repeatOnce)

    return .result()
  }
}
