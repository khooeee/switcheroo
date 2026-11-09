import UIKit

/// Keeps one event stream open while started: reconnects with backoff and on return to the foreground.
@MainActor
final class EventSubscription {
    enum State: Equatable {
        case connecting, live, offline(String)
    }

    var onEvent: ((RemoteEvent) -> Void)?
    var onState: ((State) -> Void)?

    private let client: SwitcherooClient
    private let path: [String]
    private var task: Task<Void, Never>?
    private var foregroundObserver: (any NSObjectProtocol)?
    private var state: State?

    init(client: SwitcherooClient, path: [String]) {
        self.client = client
        self.path = path
    }

    func start() {
        guard task == nil else { return }
        // A backgrounded app's socket is dead; reconnect now rather than after the timeout.
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: UIApplication.willEnterForegroundNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.connect() }
        }
        connect()
    }

    func stop() {
        task?.cancel()
        task = nil
        if let foregroundObserver { NotificationCenter.default.removeObserver(foregroundObserver) }
        foregroundObserver = nil
    }

    private func connect() {
        task?.cancel()
        task = Task { [weak self] in await self?.run() }
    }

    private func run() async {
        var delay = Duration.seconds(1)
        while !Task.isCancelled {
            set(.connecting)
            var failure = "Disconnected"
            do {
                for try await event in client.events(path) {
                    delay = .seconds(1)
                    set(.live)
                    onEvent?(event)
                }
            } catch {
                failure = error.localizedDescription
            }
            if Task.isCancelled { return }
            set(.offline(failure))
            try? await Task.sleep(for: delay)
            delay = min(delay * 2, .seconds(15))
        }
    }

    private func set(_ next: State) {
        guard next != state else { return }
        state = next
        onState?(next)
    }
}
