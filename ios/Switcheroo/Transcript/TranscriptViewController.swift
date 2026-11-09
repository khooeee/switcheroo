import UIKit

/// One session's prompts and replies, streaming, with a composer to send, steer or stop.
final class TranscriptViewController: UIViewController {
    private struct Row: Hashable {
        let turnId: String
        let isReply: Bool
    }

    private let client: SwitcherooClient
    private let session: Session
    private let subscription: EventSubscription
    private var turns: [RemoteTurn] = []
    private var loaded = false
    /// Follow new output until the user scrolls up; scrolling back to the end resumes it.
    private var followsEnd = true
    private let composer = ComposerView()
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: Self.layout())
    private lazy var dataSource = makeDataSource()

    init(client: SwitcherooClient, session: Session) {
        self.client = client
        self.session = session
        subscription = EventSubscription(client: client, path: ["sessions", session.id, "events"])
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = session.title.components(separatedBy: "\n").first
        navigationItem.largeTitleDisplayMode = .never
        navigationItem.subtitle = session.agent
        view.backgroundColor = .systemBackground

        collectionView.delegate = self
        collectionView.allowsSelection = false
        collectionView.keyboardDismissMode = .interactive
        composer.onSend = { [weak self] text in self?.send(text) }
        composer.onStop = { [weak self] in self?.stop() }
        for subview in [collectionView, composer] {
            subview.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(subview)
        }
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: composer.topAnchor),
            composer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            composer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            composer.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        subscription.onEvent = { [weak self] event in self?.handle(event) }
        subscription.onState = { [weak self] state in
            guard let self else { return }
            navigationItem.subtitle = state == .live ? session.agent : "Reconnecting…"
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        subscription.start()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        subscription.stop()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        // The keyboard or a growing composer shrinks the list; keep the newest reply in view.
        if followsEnd { scrollToEnd() }
    }

    override func updateContentUnavailableConfiguration(using state: UIContentUnavailableConfigurationState) {
        if !loaded {
            contentUnavailableConfiguration = UIContentUnavailableConfiguration.loading()
        } else if turns.isEmpty {
            var config = UIContentUnavailableConfiguration.empty()
            config.text = "No messages yet"
            contentUnavailableConfiguration = config
        } else {
            contentUnavailableConfiguration = nil
        }
    }

    private func handle(_ event: RemoteEvent) {
        switch event {
        case .reset(let next):
            let previous = Dictionary(turns.map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
            turns = next
            loaded = true
            apply(changed: next.filter { previous[$0.id] != nil && previous[$0.id] != $0 }.map(\.id))
        case .turn(let turn):
            if let index = turns.firstIndex(where: { $0.id == turn.id }) {
                guard turns[index] != turn else { return }
                turns[index] = turn
            } else {
                turns.append(turn)
            }
            apply(changed: [turn.id])
        case .sessions:
            break
        }
    }

    private func apply(changed: [String]) {
        var snapshot = NSDiffableDataSourceSnapshot<Int, Row>()
        snapshot.appendSections([0])
        snapshot.appendItems(turns.flatMap { [Row(turnId: $0.id, isReply: false), Row(turnId: $0.id, isReply: true)] })
        let changedRows = changed.flatMap { [Row(turnId: $0, isReply: false), Row(turnId: $0, isReply: true)] }
        snapshot.reconfigureItems(changedRows.filter { snapshot.indexOfItem($0) != nil })
        dataSource.apply(snapshot, animatingDifferences: false) { [weak self] in
            guard let self, followsEnd else { return }
            scrollToEnd()
        }
        composer.isRunning = turns.contains { $0.status == .running }
        setNeedsUpdateContentUnavailableConfiguration()
    }

    private func send(_ text: String) {
        followsEnd = true
        Task {
            do {
                try await client.sendPrompt(text, sessionId: session.id)
            } catch {
                composer.restore(text)
                showError(error)
            }
        }
    }

    private func stop() {
        Task {
            do { try await client.cancel(sessionId: session.id) } catch { showError(error) }
        }
    }

    private func showError(_ error: any Error) {
        let alert = UIAlertController(title: "Couldn't reach Switcheroo", message: error.localizedDescription, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    private var isAtEnd: Bool {
        let visibleBottom = collectionView.contentOffset.y + collectionView.bounds.height - collectionView.adjustedContentInset.bottom
        return visibleBottom >= collectionView.contentSize.height - 40
    }

    private func scrollToEnd() {
        let inset = collectionView.adjustedContentInset
        let end = collectionView.contentSize.height - collectionView.bounds.height + inset.bottom
        collectionView.contentOffset.y = max(-inset.top, end)
    }

    private static func layout() -> UICollectionViewLayout {
        var config = UICollectionLayoutListConfiguration(appearance: .plain)
        config.showsSeparators = false
        config.backgroundColor = .systemBackground
        return UICollectionViewCompositionalLayout.list(using: config)
    }

    private func makeDataSource() -> UICollectionViewDiffableDataSource<Int, Row> {
        let prompt = UICollectionView.CellRegistration<UICollectionViewListCell, Row> { [weak self] cell, _, row in
            guard let turn = self?.turn(row.turnId) else { return }
            TurnCellConfigurator.configurePrompt(cell, with: turn)
        }
        let reply = UICollectionView.CellRegistration<UICollectionViewListCell, Row> { [weak self] cell, _, row in
            guard let turn = self?.turn(row.turnId) else { return }
            TurnCellConfigurator.configureReply(cell, with: turn)
        }
        return UICollectionViewDiffableDataSource(collectionView: collectionView) { collectionView, indexPath, row in
            collectionView.dequeueConfiguredReusableCell(using: row.isReply ? reply : prompt, for: indexPath, item: row)
        }
    }

    private func turn(_ id: String) -> RemoteTurn? {
        turns.last { $0.id == id }
    }
}

extension TranscriptViewController: UICollectionViewDelegate {
    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        guard scrollView.isTracking || scrollView.isDecelerating else { return }
        followsEnd = isAtEnd
    }

    func collectionView(
        _ collectionView: UICollectionView,
        contextMenuConfigurationForItemsAt indexPaths: [IndexPath],
        point: CGPoint
    ) -> UIContextMenuConfiguration? {
        guard let row = indexPaths.first.flatMap(dataSource.itemIdentifier(for:)),
              let turn = turn(row.turnId),
              let text = TurnCellConfigurator.copyText(turn, isReply: row.isReply)
        else { return nil }
        return UIContextMenuConfiguration(actionProvider: { _ in
            UIMenu(children: [
                UIAction(title: "Copy", image: UIImage(systemName: "doc.on.doc")) { _ in UIPasteboard.general.string = text },
            ])
        })
    }
}
