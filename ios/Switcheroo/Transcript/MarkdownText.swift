import UIKit

/// Light markdown for replies: inline styles and links, `#` headings as bold, fenced code in monospace.
enum MarkdownText {
    static func attributed(_ text: String) -> NSAttributedString {
        let result = NSMutableAttributedString()
        var prose: [String] = []
        var code: [String] = []
        var inCode = false
        for line in text.components(separatedBy: "\n") {
            if line.trimmingCharacters(in: .whitespaces).hasPrefix("```") {
                if inCode { result.append(codeBlock(code)) } else { result.append(inline(prose)) }
                prose = []
                code = []
                inCode.toggle()
            } else if inCode {
                code.append(line)
            } else {
                prose.append(line)
            }
        }
        result.append(inCode ? codeBlock(code) : inline(prose))
        return result
    }

    private static var body: UIFont { .preferredFont(forTextStyle: .body) }

    private static func inline(_ lines: [String]) -> NSAttributedString {
        guard !lines.isEmpty else { return NSAttributedString() }
        let source = lines.map(headingAsBold).joined(separator: "\n")
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        guard let parsed = try? AttributedString(markdown: source, options: options) else {
            return NSAttributedString(string: source, attributes: [.font: body, .foregroundColor: UIColor.label])
        }
        let string = NSMutableAttributedString(parsed)
        let whole = NSRange(location: 0, length: string.length)
        string.addAttributes([.font: body, .foregroundColor: UIColor.label], range: whole)
        string.enumerateAttribute(.inlinePresentationIntent, in: whole) { value, range, _ in
            guard let raw = (value as? NSNumber)?.uintValue else { return }
            string.addAttribute(.font, value: font(for: InlinePresentationIntent(rawValue: raw)), range: range)
        }
        return string
    }

    private static func font(for intent: InlinePresentationIntent) -> UIFont {
        var font = intent.contains(.code) ? UIFont.monospacedSystemFont(ofSize: body.pointSize * 0.9, weight: .regular) : body
        var traits: UIFontDescriptor.SymbolicTraits = []
        if intent.contains(.stronglyEmphasized) { traits.insert(.traitBold) }
        if intent.contains(.emphasized) { traits.insert(.traitItalic) }
        if !traits.isEmpty, let descriptor = font.fontDescriptor.withSymbolicTraits(traits) {
            font = UIFont(descriptor: descriptor, size: 0)
        }
        return font
    }

    private static func headingAsBold(_ line: String) -> String {
        guard let match = line.wholeMatch(of: /#{1,6}\s+(.+)/) else { return line }
        return "**\(match.1)**"
    }

    private static func codeBlock(_ lines: [String]) -> NSAttributedString {
        NSAttributedString(string: "\n" + lines.joined(separator: "\n") + "\n", attributes: [
            .font: UIFont.monospacedSystemFont(ofSize: body.pointSize * 0.85, weight: .regular),
            .foregroundColor: UIColor.secondaryLabel,
        ])
    }
}
