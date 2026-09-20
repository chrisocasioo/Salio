import AlarmKit
import Foundation

/// Custom metadata attached to the alarm's Live Activity presentation. AlarmKit owns the entire
/// ringing UI on iOS (lock screen alert, Dynamic Island, Live Activity) — Uppy never draws its
/// own ringing screen here, it only supplies the label AlarmKit's stock presentation displays.
struct UppyAlarmMetadata: AlarmMetadata {
  let label: String
}
