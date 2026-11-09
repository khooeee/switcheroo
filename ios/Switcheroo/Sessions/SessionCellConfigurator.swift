import UIKit

/// A rail row: the title (like the desktop, nothing else) and a running or error indicator.
@MainActor
enum SessionCellConfigurator {
    static func configure(_ cell: UICollectionViewListCell, with session: Session) {
        var content = cell.defaultContentConfiguration()
        content.text = session.title
        content.textProperties.numberOfLines = 3
        if session.status == .error, let error = session.error {
            content.secondaryText = error
            content.secondaryTextProperties.color = .systemRed
            content.secondaryTextProperties.numberOfLines = 2
        }
        cell.contentConfiguration = content
        cell.accessories = [statusAccessory(session.status), .disclosureIndicator()].compactMap(\.self)
    }

    private static func statusAccessory(_ status: Session.Status) -> UICellAccessory? {
        switch status {
        case .running, .connecting:
            let spinner = UIActivityIndicatorView(style: .medium)
            spinner.startAnimating()
            return .customView(configuration: .init(customView: spinner, placement: .trailing()))
        case .error:
            let icon = UIImageView(image: UIImage(systemName: "exclamationmark.triangle.fill"))
            icon.tintColor = .systemRed
            return .customView(configuration: .init(customView: icon, placement: .trailing()))
        case .idle, .ready:
            return nil
        }
    }
}
