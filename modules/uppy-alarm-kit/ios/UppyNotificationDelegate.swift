import ExpoModulesCore
import UserNotifications

/// Registers as UNUserNotificationCenter's delegate at app launch. AlarmKit's alert
/// secondaryButtonBehavior: .custom does NOT actually foreground the app on its own — it only
/// runs UppyOpenMissionIntent in the background, same as the primary Stop button (confirmed on
/// device: Apple's docs description ("displays an action to launch the app") turned out to
/// describe the button's intent, not automatic OS behavior). UppyOpenMissionIntent instead posts
/// a real local notification, and tapping a notification is Apple's actually-guaranteed way to
/// bring an app to the foreground — this delegate just makes sure that notification is presented
/// even if the app happens to already be in the foreground when it arrives.
public class UppyNotificationDelegate: ExpoAppDelegateSubscriber, UNUserNotificationCenterDelegate {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    return true
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .sound])
  }

  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    // Tapping it is what foregrounds the app; App.tsx's own launch/foreground check picks up the
    // pending ringing alarm id that UppyOpenMissionIntent already recorded. Nothing more to do.
    completionHandler()
  }
}
