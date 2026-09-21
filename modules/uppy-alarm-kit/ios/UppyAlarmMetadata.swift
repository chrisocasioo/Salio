import AlarmKit
import Foundation

/// Custom metadata attached to the AlarmKit alert's Live Activity presentation. This alert only
/// exists to wake/take over a locked screen and hand off to the app (see UppyAlarmStopIntent) —
/// the label is the only thing it needs to display.
struct UppyAlarmMetadata: AlarmMetadata {
  let label: String
}
