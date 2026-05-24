import Foundation

struct NewsArticle: Codable {
    let title: String
    let link: String
    let sourceLabel: String
    let pubDate: String?
    let summary: String?
    let topic: String?
}

struct NewsPayload: Codable {
    let fetchedAt: String?
    let articles: [NewsArticle]
}

enum WidgetDataStore {
    static let appGroupId = "group.tn.tnews.widget"
    static let cacheKey = "tnews-news-cache"

    static var defaults: UserDefaults? {
        UserDefaults(suiteName: appGroupId)
    }

    static func save(_ json: [String: Any]) {
        guard let defaults = defaults else { return }
        if JSONSerialization.isValidJSONObject(json),
           let data = try? JSONSerialization.data(withJSONObject: json) {
            defaults.set(data, forKey: cacheKey)
        }
    }

    static func load() -> NewsPayload? {
        guard let defaults = defaults,
              let data = defaults.data(forKey: cacheKey) else {
            return nil
        }
        return try? JSONDecoder().decode(NewsPayload.self, from: data)
    }
}

extension NewsArticle {
    static let placeholder = NewsArticle(
        title: "Tnews — أخبار تونس",
        link: "",
        sourceLabel: "Tnews",
        pubDate: nil,
        summary: "افتح التطبيق لتحديث الأخبار",
        topic: "عام"
    )
}
