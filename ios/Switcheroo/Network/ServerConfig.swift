import Foundation

/// Where the desktop app is and the token it pairs with, from `switcheroo://<mac>.ts.net?token=…`.
struct ServerConfig: Sendable, Equatable {
    let link: String
    let baseURL: URL
    let token: String

    init?(link raw: String) {
        let link = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let components = URLComponents(string: link),
              components.scheme == "switcheroo",
              let host = components.host, !host.isEmpty,
              let token = components.queryItems?.first(where: { $0.name == "token" })?.value, !token.isEmpty
        else { return nil }
        var base = URLComponents()
        // The tailnet is https via `tailscale serve`; plain http is only for the simulator on this Mac.
        base.scheme = ["localhost", "127.0.0.1"].contains(host) ? "http" : "https"
        base.host = host
        base.port = components.port
        guard let baseURL = base.url else { return nil }
        self.link = link
        self.baseURL = baseURL
        self.token = token
    }
}
