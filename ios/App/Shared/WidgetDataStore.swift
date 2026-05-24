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
            defaults.synchronize()
        }
    }

    static func save(jsonString: String) {
        guard let defaults = defaults else { return }
        defaults.set(jsonString, forKey: cacheKey)
        defaults.synchronize()
    }

    static func load() -> NewsPayload? {
        guard let defaults = defaults else { return nil }

        if let jsonString = defaults.string(forKey: cacheKey),
           let data = jsonString.data(using: .utf8) {
            if let payload = try? JSONDecoder().decode(NewsPayload.self, from: data) {
                return payload
            }
        }

        if let data = defaults.data(forKey: cacheKey) {
            return try? JSONDecoder().decode(NewsPayload.self, from: data)
        }

        return nil
    }

    static func articles() -> [NewsArticle] {
        load()?.articles ?? []
    }
}

extension NewsArticle {
    static let placeholder = NewsArticle(
        title: "افتح Tnews لتحميل الأخبار",
        link: "",
        sourceLabel: "Tnews",
        pubDate: nil,
        summary: "شغّل التطبيق مرة واحدة مع الإنترنت",
        topic: "عام"
    )

    static let samples: [NewsArticle] = [
        NewsArticle(
            title: "مرحباً بك في Tnews",
            link: "",
            sourceLabel: "Tnews",
            pubDate: nil,
            summary: "أخبار تونس من TAP وLa Presse وموزاييك ونواة",
            topic: "تونس"
        ),
    ]
}
