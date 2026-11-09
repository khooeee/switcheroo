import UIKit

/// Paste the desktop's `switcheroo://` link; Connect checks it before saving.
final class PairViewController: UIViewController {
    private let onPaired: (ServerConfig) -> Void
    private let linkField = UITextField()
    private let errorLabel = UILabel()
    private lazy var connectButton = UIButton(
        configuration: .filled(),
        primaryAction: UIAction(title: "Connect") { [weak self] _ in self?.connect() }
    )

    init(prefill: String?, onPaired: @escaping (ServerConfig) -> Void) {
        self.onPaired = onPaired
        super.init(nibName: nil, bundle: nil)
        linkField.text = prefill
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Pair with Switcheroo"
        view.backgroundColor = .systemGroupedBackground

        let steps = UILabel()
        steps.numberOfLines = 0
        steps.font = .preferredFont(forTextStyle: .body)
        steps.textColor = .secondaryLabel
        steps.text = """
        1. On your Mac, open Switcheroo Settings, turn on Remote and Save.
        2. Run the tailscale serve command it shows, once.
        3. Reopen Settings, click Copy iOS Link and paste it here.
        """

        linkField.placeholder = "switcheroo://…"
        linkField.borderStyle = .roundedRect
        linkField.font = .monospacedSystemFont(ofSize: 15, weight: .regular)
        linkField.autocapitalizationType = .none
        linkField.autocorrectionType = .no
        linkField.keyboardType = .URL
        linkField.clearButtonMode = .whileEditing
        linkField.returnKeyType = .go
        linkField.addAction(UIAction { [weak self] _ in self?.connect() }, for: .editingDidEndOnExit)

        errorLabel.numberOfLines = 0
        errorLabel.font = .preferredFont(forTextStyle: .footnote)
        errorLabel.textColor = .systemRed

        let stack = UIStackView(arrangedSubviews: [steps, linkField, connectButton, errorLabel])
        stack.axis = .vertical
        stack.spacing = 16
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
            stack.leadingAnchor.constraint(equalTo: view.readableContentGuide.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: view.readableContentGuide.trailingAnchor),
        ])
    }

    private func connect() {
        guard let config = ServerConfig(link: linkField.text ?? "") else {
            errorLabel.text = "That isn't a Switcheroo link. It starts with switcheroo://"
            return
        }
        errorLabel.text = nil
        setBusy(true)
        Task {
            defer { setBusy(false) }
            do {
                try await SwitcherooClient(config: config).checkConnection()
                onPaired(config)
            } catch {
                errorLabel.text = "Couldn't reach Switcheroo: \(error.localizedDescription)"
            }
        }
    }

    private func setBusy(_ busy: Bool) {
        connectButton.configuration?.showsActivityIndicator = busy
        connectButton.isEnabled = !busy
        linkField.isEnabled = !busy
    }
}
