import UIKit

/// Chooses the root screen: pairing until a link works, then the session list.
@MainActor
final class AppCoordinator {
    private let window: UIWindow
    private let store = PairingStore()

    init(window: UIWindow) {
        self.window = window
    }

    func start() {
        if let config = store.load() { showSessions(config) } else { showPairing(prefill: nil) }
    }

    /// A tapped `switcheroo://` link fills in the pairing form; the user still confirms it.
    func openPairingLink(_ url: URL) {
        window.rootViewController?.dismiss(animated: false)
        guard store.load() != nil else { return showPairing(prefill: url.absoluteString) }
        presentPairing(prefill: url.absoluteString)
    }

    private func showSessions(_ config: ServerConfig) {
        let list = SessionListViewController(client: SwitcherooClient(config: config)) { [weak self] in
            self?.presentPairing(prefill: nil)
        }
        window.rootViewController = UINavigationController(rootViewController: list)
    }

    private func showPairing(prefill: String?) {
        let pair = PairViewController(prefill: prefill) { [weak self] config in self?.didPair(config) }
        window.rootViewController = UINavigationController(rootViewController: pair)
    }

    private func presentPairing(prefill: String?) {
        let pair = PairViewController(prefill: prefill ?? store.load()?.link) { [weak self] config in
            self?.didPair(config)
        }
        pair.navigationItem.leftBarButtonItem = UIBarButtonItem(
            systemItem: .cancel,
            primaryAction: UIAction { [weak pair] _ in pair?.dismiss(animated: true) }
        )
        window.rootViewController?.present(UINavigationController(rootViewController: pair), animated: true)
    }

    private func didPair(_ config: ServerConfig) {
        store.save(config)
        window.rootViewController?.dismiss(animated: false)
        showSessions(config)
    }
}
