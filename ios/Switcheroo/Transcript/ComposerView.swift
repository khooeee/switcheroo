import UIKit

/// Growing prompt field with Send, plus Stop while the agent runs.
final class ComposerView: UIView, UITextViewDelegate {
    var onSend: ((String) -> Void)?
    var onStop: (() -> Void)?

    /// While running, sending steers (or queues) and Stop shows.
    var isRunning = false {
        didSet {
            stopButton.isHidden = !isRunning
            placeholder.text = isRunning ? "Steer…" : "Message"
        }
    }

    private let maxTextHeight: CGFloat = 140
    private let textView = UITextView()
    private let placeholder = UILabel()
    private lazy var textHeight = textView.heightAnchor.constraint(equalToConstant: maxTextHeight)
    private lazy var sendButton = Self.roundButton("arrow.up", style: .filled()) { [weak self] in self?.send() }
    private lazy var stopButton = Self.roundButton("stop.fill", style: .gray()) { [weak self] in self?.onStop?() }

    override init(frame: CGRect) {
        super.init(frame: frame)
        let background = UIVisualEffectView(effect: UIBlurEffect(style: .systemChromeMaterial))
        background.frame = bounds
        background.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        addSubview(background)

        textView.font = .preferredFont(forTextStyle: .body)
        textView.adjustsFontForContentSizeCategory = true
        textView.isScrollEnabled = false
        textView.backgroundColor = .secondarySystemBackground
        textView.layer.cornerRadius = 18
        textView.textContainerInset = UIEdgeInsets(top: 9, left: 10, bottom: 9, right: 10)
        textView.delegate = self

        placeholder.font = textView.font
        placeholder.textColor = .placeholderText
        placeholder.text = "Message"
        placeholder.translatesAutoresizingMaskIntoConstraints = false
        textView.addSubview(placeholder)

        stopButton.isHidden = true
        sendButton.isEnabled = false
        let row = UIStackView(arrangedSubviews: [textView, stopButton, sendButton])
        row.alignment = .bottom
        row.spacing = 8
        row.translatesAutoresizingMaskIntoConstraints = false
        addSubview(row)
        NSLayoutConstraint.activate([
            row.topAnchor.constraint(equalTo: topAnchor, constant: 8),
            row.leadingAnchor.constraint(equalTo: layoutMarginsGuide.leadingAnchor),
            row.trailingAnchor.constraint(equalTo: layoutMarginsGuide.trailingAnchor),
            // Above the keyboard when it shows, else above the home indicator; the blur still reaches the edge.
            row.bottomAnchor.constraint(equalTo: keyboardLayoutGuide.topAnchor, constant: -8),
            placeholder.leadingAnchor.constraint(equalTo: textView.leadingAnchor, constant: 15),
            placeholder.topAnchor.constraint(equalTo: textView.topAnchor, constant: 9),
        ])
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

    /// Put text back after a failed send.
    func restore(_ text: String) {
        textView.text = text
        textViewDidChange(textView)
    }

    func textViewDidChange(_ textView: UITextView) {
        let hasText = !textView.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        placeholder.isHidden = !textView.text.isEmpty
        sendButton.isEnabled = hasText
        let fitting = textView.sizeThatFits(CGSize(width: textView.bounds.width, height: .greatestFiniteMagnitude))
        let overflows = fitting.height > maxTextHeight
        guard overflows != textView.isScrollEnabled else { return }
        textView.isScrollEnabled = overflows
        textHeight.isActive = overflows
    }

    private func send() {
        let text = textView.text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        textView.text = ""
        textViewDidChange(textView)
        onSend?(text)
    }

    private static func roundButton(
        _ symbol: String,
        style: UIButton.Configuration,
        action: @escaping () -> Void
    ) -> UIButton {
        var config = style
        config.image = UIImage(systemName: symbol, withConfiguration: UIImage.SymbolConfiguration(weight: .semibold))
        config.cornerStyle = .capsule
        let button = UIButton(configuration: config, primaryAction: UIAction { _ in action() })
        NSLayoutConstraint.activate([
            button.widthAnchor.constraint(equalToConstant: 38),
            button.heightAnchor.constraint(equalToConstant: 38),
        ])
        return button
    }
}
