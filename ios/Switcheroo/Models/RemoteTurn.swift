import Foundation

/// One prompt and its reply, trimmed by the desktop to what a phone shows.
struct RemoteTurn: Decodable, Sendable, Hashable, Identifiable {
    enum Status: String, Decodable, Sendable {
        case running, complete, stopped
    }

    let id: String
    let at: Double
    let status: Status
    let user: String
    let queued: Bool?
    let assistant: String?
    /// Latest tool title (or "Thinking") while the turn runs.
    let activity: String?
}
