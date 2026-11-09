import UIKit

/// The desktop rail, live: pinned then recent, with a spinner on running sessions.
final class SessionListViewController: UIViewController {
    private enum Section: Hashable {
        case pinned, recent
    }

    private let client: SwitcherooClient
    private let onPairTapped: () -> Void
    private let subscription: EventSubscription
    private var list: SessionList?
    private var sessionsById: [String: Session] = [:]
    private var filter = ""
    private var connection: EventSubscription.State = .connecting
    private lazy var collectionView = UICollectionView(frame: .zero, collectionViewLayout: Self.layout())
    private lazy var dataSource = makeDataSource()

    init(client: SwitcherooClient, onPairTapped: @escaping () -> Void) {
        self.client = client
        self.onPairTapped = onPairTapped
        subscription = EventSubscription(client: client, path: ["events"])
        super.init(nibName: nil, bundle: nil)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Sessions"
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            image: UIImage(systemName: "gearshape"),
            primaryAction: UIAction { [weak self] _ in self?.onPairTapped() }
        )
        let search = UISearchController()
        search.searchResultsUpdater = self
        search.obscuresBackgroundDuringPresentation = false
        navigationItem.searchController = search

        collectionView.frame = view.bounds
        collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        collectionView.delegate = self
        view.addSubview(collectionView)

        subscription.onEvent = { [weak self] event in
            if case .sessions(let list) = event { self?.apply(list) }
        }
        subscription.onState = { [weak self] state in
            self?.connection = state
            self?.setNeedsUpdateContentUnavailableConfiguration()
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

    override func updateContentUnavailableConfiguration(using state: UIContentUnavailableConfigurationState) {
        guard sessionsById.isEmpty else {
            contentUnavailableConfiguration = nil
            return
        }
        if case .offline(let message) = connection {
            var config = UIContentUnavailableConfiguration.empty()
            config.image = UIImage(systemName: "wifi.exclamationmark")
            config.text = "Can't reach Switcheroo"
            config.secondaryText = "\(message)\nCheck Tailscale is on and Switcheroo is open."
            contentUnavailableConfiguration = config
        } else if list == nil {
            contentUnavailableConfiguration = UIContentUnavailableConfiguration.loading()
        } else {
            var config = UIContentUnavailableConfiguration.empty()
            config.text = "No sessions"
            contentUnavailableConfiguration = config
        }
    }

    private func apply(_ next: SessionList) {
        let previous = sessionsById
        list = next
        sessionsById = Dictionary((next.pinned + next.unpinned).map { ($0.id, $0) }, uniquingKeysWith: { a, _ in a })
        applySnapshot(changed: sessionsById.keys.filter { previous[$0] != nil && previous[$0] != sessionsById[$0] })
        setNeedsUpdateContentUnavailableConfiguration()
    }

    private func applySnapshot(changed: [String] = []) {
        let visible = { (sessions: [Session]) in
            sessions.filter { self.filter.isEmpty || $0.title.localizedCaseInsensitiveContains(self.filter) }.map(\.id)
        }
        var snapshot = NSDiffableDataSourceSnapshot<Section, String>()
        let pinned = visible(list?.pinned ?? [])
        let recent = visible(list?.unpinned ?? [])
        if !pinned.isEmpty {
            snapshot.appendSections([.pinned])
            snapshot.appendItems(pinned, toSection: .pinned)
        }
        snapshot.appendSections([.recent])
        snapshot.appendItems(recent, toSection: .recent)
        snapshot.reconfigureItems(changed.filter { snapshot.indexOfItem($0) != nil })
        dataSource.apply(snapshot, animatingDifferences: view.window != nil)
    }

    private static func layout() -> UICollectionViewLayout {
        var config = UICollectionLayoutListConfiguration(appearance: .insetGrouped)
        config.headerMode = .supplementary
        return UICollectionViewCompositionalLayout.list(using: config)
    }

    private func makeDataSource() -> UICollectionViewDiffableDataSource<Section, String> {
        let cell = UICollectionView.CellRegistration<UICollectionViewListCell, String> { [weak self] cell, _, id in
            guard let session = self?.sessionsById[id] else { return }
            SessionCellConfigurator.configure(cell, with: session)
        }
        let header = UICollectionView.SupplementaryRegistration<UICollectionViewListCell>(
            elementKind: UICollectionView.elementKindSectionHeader
        ) { [weak self] view, _, indexPath in
            let section = self?.dataSource.sectionIdentifier(for: indexPath.section)
            var content = UIListContentConfiguration.header()
            content.text = section == .pinned ? "Pinned" : "Recent"
            view.contentConfiguration = content
        }
        let dataSource = UICollectionViewDiffableDataSource<Section, String>(collectionView: collectionView) {
            collectionView, indexPath, id in
            collectionView.dequeueConfiguredReusableCell(using: cell, for: indexPath, item: id)
        }
        dataSource.supplementaryViewProvider = { collectionView, _, indexPath in
            collectionView.dequeueConfiguredReusableSupplementary(using: header, for: indexPath)
        }
        return dataSource
    }
}

extension SessionListViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        collectionView.deselectItem(at: indexPath, animated: true)
        guard let id = dataSource.itemIdentifier(for: indexPath), let session = sessionsById[id] else { return }
        navigationController?.pushViewController(TranscriptViewController(client: client, session: session), animated: true)
    }
}

extension SessionListViewController: UISearchResultsUpdating {
    func updateSearchResults(for searchController: UISearchController) {
        filter = searchController.searchBar.text?.trimmingCharacters(in: .whitespaces) ?? ""
        applySnapshot()
    }
}
