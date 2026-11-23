import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    /// The home-screen quick action in Info.plist (UIApplicationShortcutItems).
    private static let startShortcutType = "app.anchor.reset.start"
    /// The same deep link the Android shortcut uses; the web app routes it to a fresh classic reset.
    private static let startURL = URL(string: "anchor://start")!

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = CAPBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)

        // Cold start from the quick action: recorded as the launch URL, read by the web app at boot.
        if connectionOptions.shortcutItem?.type == Self.startShortcutType {
            openStartLink()
        }
    }

    /// Quick action while the app is already running or in the background.
    func windowScene(_ windowScene: UIWindowScene,
                     performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        let isStart = shortcutItem.type == Self.startShortcutType
        if isStart { openStartLink() }
        completionHandler(isStart)
    }

    private func openStartLink() {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: Self.startURL)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
