import Foundation

/// The desktop rail: pinned sessions first, then the rest, newest activity first.
struct SessionList: Decodable, Sendable {
    let pinned: [Session]
    let unpinned: [Session]
}
