import ExpoModulesCore
import UserNotifications

/// Registers as UNUserNotificationCenter's delegate at app launch, and is the entry point for the
/// two ways a ringing alarm's notification reaches the app: the person taps it (didReceive
/// response:), or the app happens to already be in the foreground when it's delivered (willPresent,
/// where we still want the banner/sound to show). Also resumes the background keep-alive session
/// on launch/foreground (see UppyAlarmScheduler) in case the app was relaunched after being
/// evicted, or after a device restart.
public class UppyNotificationDelegate: ExpoAppDelegateSubscriber, UNUserNotificationCenterDelegate {
  public func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    UNUserNotificationCenter.current().delegate = self
    UppyAlarmScheduler.shared.armed()
    UppyAlarmKitModule.cancelAllLegacyAlarmKitAlarms()
    return true
  }

  public func applicationDidBecomeActive(_ application: UIApplication) {
    UppyAlarmScheduler.shared.armed()
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
    if let alarmID = response.notification.request.content.userInfo["alarmId"] as? String {
      UppyAlarmStore.setPendingRingingAlarmID(alarmID)
      // Normally the polling timer already caught this and started ringing; if the app's process
      // had been evicted, this is what makes it actually ring once reopened, rather than staying
      // silent until the mission screen already shows.
      let repeatOnce = UppyAlarmStore.repeatOnce(forAlarmID: alarmID)
      UppyAlarmScheduler.shared.startRinging(alarmID: alarmID, repeatOnce: repeatOnce)
      UppyAlarmKitModule.notifyAlarmTapped(alarmID: alarmID)
    }
    completionHandler()
  }
}
