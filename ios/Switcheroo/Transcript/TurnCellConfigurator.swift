import UIKit

/// Each turn is two rows: the prompt in a rounded box, then the reply (or what the agent is doing).
@MainActor
enum TurnCellConfigurator {
    static func configurePrompt(_ cell: UICollectionViewListCell, with turn: RemoteTurn) {
        var content = UIListContentConfiguration.cell()
        content.text = turn.user
        content.secondaryText = turn.queued == true ? "Queued" : nil
        content.secondaryTextProperties.color = .secondaryLabel
        content.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 16, leading: 24, bottom: 16, trailing: 24)
        cell.contentConfiguration = content

        var background = UIBackgroundConfiguration.listCell()
        background.backgroundColor = UIColor(resource: .userMessage)
        background.cornerRadius = 16
        background.backgroundInsets = NSDirectionalEdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
        cell.backgroundConfiguration = background
    }

    static func configureReply(_ cell: UICollectionViewListCell, with turn: RemoteTurn) {
        var content = UIListContentConfiguration.cell()
        content.directionalLayoutMargins = NSDirectionalEdgeInsets(top: 8, leading: 24, bottom: 16, trailing: 24)
        let running = turn.status == .running
        if let reply = turn.assistant, !reply.isEmpty {
            content.attributedText = MarkdownText.attributed(reply)
            content.secondaryText = running ? turn.activity : nil
        } else {
            content.text = running ? turn.activity ?? "Working…" : turn.status == .stopped ? "Stopped" : "No reply"
            content.textProperties.color = .secondaryLabel
        }
        content.secondaryTextProperties.color = .secondaryLabel
        cell.contentConfiguration = content
        cell.backgroundConfiguration = .clear()
    }

    /// What Copy puts on the pasteboard.
    static func copyText(_ turn: RemoteTurn, isReply: Bool) -> String? {
        isReply ? turn.assistant : turn.user
    }
}
