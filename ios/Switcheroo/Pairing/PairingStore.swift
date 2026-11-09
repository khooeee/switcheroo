import Foundation
import Security

/// The pairing link (it holds the token) in the Keychain.
struct PairingStore {
    private let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "com.khooeee.switcheroo",
        kSecAttrAccount as String: "pairing-link",
    ]

    func load() -> ServerConfig? {
        var lookup = query
        lookup[kSecReturnData as String] = true
        lookup[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        guard SecItemCopyMatching(lookup as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data,
              let link = String(data: data, encoding: .utf8)
        else { return nil }
        return ServerConfig(link: link)
    }

    func save(_ config: ServerConfig) {
        SecItemDelete(query as CFDictionary)
        var item = query
        item[kSecValueData as String] = Data(config.link.utf8)
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(item as CFDictionary, nil)
    }
}
