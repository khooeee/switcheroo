import Foundation

/// REST calls and event streams against the desktop app's remote server.
final class SwitcherooClient: Sendable {
    let config: ServerConfig
    private let session: URLSession

    init(config: ServerConfig) {
        self.config = config
        let configuration = URLSessionConfiguration.default
        // Event streams ping every 20s, so a minute of silence means the Mac is gone.
        configuration.timeoutIntervalForRequest = 60
        session = URLSession(configuration: configuration)
    }

    /// Fails unless the server answers and accepts the token.
    func checkConnection() async throws {
        _ = try await send(request(["sessions"]))
    }

    /// Sends, or steers into the running turn where the agent supports it.
    func sendPrompt(_ text: String, sessionId: String) async throws {
        var request = request(["sessions", sessionId, "prompt"], method: "POST")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["text": text])
        _ = try await send(request)
    }

    func cancel(sessionId: String) async throws {
        _ = try await send(request(["sessions", sessionId, "cancel"], method: "POST"))
    }

    /// `path` is `["events"]` for the rail or `["sessions", id, "events"]` for one transcript.
    func events(_ path: [String]) -> AsyncThrowingStream<RemoteEvent, any Error> {
        let request = request(path)
        let session = session
        return AsyncThrowingStream { continuation in
            let task = Task {
                do {
                    let (bytes, response) = try await session.bytes(for: request)
                    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
                    guard status == 200 else { throw ServerError(status: status, body: Data()) }
                    // `lines` skips blank lines, so dispatch on `data:`; the server sends one per event.
                    var name = "message"
                    for try await line in bytes.lines {
                        if line.hasPrefix("event:") {
                            name = line.dropFirst(6).trimmingCharacters(in: .whitespaces)
                        } else if line.hasPrefix("data:") {
                            let data = String(line.dropFirst(5))
                            if let event = try RemoteEvent.decode(name: name, data: data) {
                                continuation.yield(event)
                            }
                            name = "message"
                        }
                    }
                    continuation.finish()
                } catch {
                    continuation.finish(throwing: error)
                }
            }
            continuation.onTermination = { _ in task.cancel() }
        }
    }

    private func request(_ path: [String], method: String = "GET") -> URLRequest {
        let url = path.reduce(config.baseURL) { $0.appending(component: $1) }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(config.token)", forHTTPHeaderField: "Authorization")
        return request
    }

    private func send(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else { throw ServerError(status: status, body: data) }
        return data
    }
}
