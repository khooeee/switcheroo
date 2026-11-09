import Foundation

/// A non-2xx reply; the desktop sends `{ "error": "…" }`.
struct ServerError: LocalizedError {
    let status: Int
    let message: String

    var errorDescription: String? {
        status == 401 ? "The pairing link is out of date. Copy a new one from Switcheroo's Settings." : message
    }

    init(status: Int, body: Data) {
        self.status = status
        let decoded = try? JSONDecoder().decode([String: String].self, from: body)
        message = decoded?["error"] ?? HTTPURLResponse.localizedString(forStatusCode: status)
    }
}
