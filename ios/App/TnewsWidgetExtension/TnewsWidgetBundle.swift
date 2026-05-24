import WidgetKit
import SwiftUI

struct NewsEntry: TimelineEntry {
    let date: Date
    let articles: [NewsArticle]
    let highlightIndex: Int
}

struct TnewsWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> NewsEntry {
        NewsEntry(date: Date(), articles: NewsArticle.samples, highlightIndex: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (NewsEntry) -> Void) {
        completion(makeEntry(at: 0))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NewsEntry>) -> Void) {
        let stored = WidgetDataStore.articles()
        let articles = stored.isEmpty ? [NewsArticle.placeholder] : stored
        let now = Date()

        var entries: [NewsEntry] = []
        let rotateCount = min(articles.count, 16)

        if rotateCount <= 1 {
            entries.append(NewsEntry(date: now, articles: articles, highlightIndex: 0))
        } else {
            for index in 0..<rotateCount {
                let entryDate = Calendar.current.date(byAdding: .minute, value: index * 5, to: now) ?? now
                entries.append(NewsEntry(date: entryDate, articles: articles, highlightIndex: index))
            }
        }

        let refresh = Calendar.current.date(byAdding: .minute, value: 10, to: now) ?? now.addingTimeInterval(600)
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }

    private func makeEntry(at index: Int) -> NewsEntry {
        let articles = WidgetDataStore.articles()
        if articles.isEmpty {
            return NewsEntry(date: Date(), articles: [NewsArticle.placeholder], highlightIndex: 0)
        }
        return NewsEntry(
            date: Date(),
            articles: articles,
            highlightIndex: min(index, articles.count - 1)
        )
    }
}

struct TnewsWidgetEntryView: View {
    var entry: NewsEntry
    @Environment(\.widgetFamily) var family

    private var current: NewsArticle {
        guard !entry.articles.isEmpty else { return .placeholder }
        let idx = min(entry.highlightIndex, entry.articles.count - 1)
        return entry.articles[max(idx, 0)]
    }

    var body: some View {
        Group {
            switch family {
            case .systemLarge:
                LargeWidgetView(articles: entry.articles, highlightIndex: entry.highlightIndex)
            case .systemMedium:
                MediumWidgetView(article: current, total: entry.articles.count, index: entry.highlightIndex)
            default:
                SmallWidgetView(article: current, total: entry.articles.count, index: entry.highlightIndex)
            }
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

struct SmallWidgetView: View {
    let article: NewsArticle
    let total: Int
    let index: Int

    var body: some View {
        widgetBackground {
            VStack(alignment: .trailing, spacing: 8) {
                widgetHeader(total: total, index: index)
                Text(article.title)
                    .font(.caption.bold())
                    .foregroundColor(.white)
                    .lineLimit(4)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                Spacer(minLength: 0)
                Text(article.sourceLabel)
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .lineLimit(1)
            }
            .padding(12)
        }
    }
}

struct MediumWidgetView: View {
    let article: NewsArticle
    let total: Int
    let index: Int

    var body: some View {
        widgetBackground {
            VStack(alignment: .trailing, spacing: 8) {
                widgetHeader(total: total, index: index)
                Text(article.title)
                    .font(.subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(3)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: .infinity, alignment: .trailing)
                if let summary = article.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.caption)
                        .foregroundColor(Color(white: 0.78))
                        .lineLimit(2)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
                HStack {
                    if let topic = article.topic {
                        topicBadge(topic)
                    }
                    Spacer()
                    Text(article.sourceLabel)
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            .padding(12)
        }
    }
}

struct LargeWidgetView: View {
    let articles: [NewsArticle]
    let highlightIndex: Int

    var body: some View {
        widgetBackground {
            VStack(alignment: .trailing, spacing: 8) {
                HStack {
                    Text("Tnews")
                        .font(.caption.bold())
                        .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
                    Spacer()
                    Text("\(articles.count) خبر")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }

                ForEach(Array(displayArticles.enumerated()), id: \.offset) { offset, article in
                    VStack(alignment: .trailing, spacing: 3) {
                        Text(article.title)
                            .font(offset == 0 ? .subheadline.bold() : .caption.bold())
                            .foregroundColor(offset == 0 ? .white : Color(white: 0.88))
                            .lineLimit(offset == 0 ? 2 : 1)
                            .multilineTextAlignment(.trailing)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                        HStack {
                            if let topic = article.topic, offset == 0 {
                                topicBadge(topic)
                            }
                            Spacer()
                            Text(article.sourceLabel)
                                .font(.caption2)
                                .foregroundColor(.gray)
                                .lineLimit(1)
                        }
                    }
                    if offset < displayArticles.count - 1 {
                        Divider().background(Color.white.opacity(0.12))
                    }
                }
                Spacer(minLength: 0)
            }
            .padding(12)
        }
    }

    private var displayArticles: [NewsArticle] {
        guard !articles.isEmpty else { return [NewsArticle.placeholder] }
        if articles.count <= 5 {
            return articles
        }
        let start = min(highlightIndex, articles.count - 5)
        return Array(articles[start..<min(start + 5, articles.count)])
    }
}

@ViewBuilder
private func widgetHeader(total: Int, index: Int) -> some View {
    HStack {
        Text("Tnews")
            .font(.caption.bold())
            .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
        Spacer()
        if total > 0 {
            Text("\(index + 1)/\(total)")
                .font(.caption2)
                .foregroundColor(.gray)
        }
    }
}

@ViewBuilder
private func topicBadge(_ topic: String) -> some View {
    Text(topic)
        .font(.caption2)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(Color(red: 0.05, green: 0.65, blue: 0.91, opacity: 0.25))
        .foregroundColor(Color(red: 0.49, green: 0.83, blue: 0.99))
        .clipShape(Capsule())
}

@ViewBuilder
private func widgetBackground<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    ZStack {
        LinearGradient(
            colors: [Color(red: 0.06, green: 0.09, blue: 0.16), Color(red: 0.03, green: 0.05, blue: 0.09)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        content()
    }
}

struct TnewsWidget: Widget {
    let kind = "TnewsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TnewsWidgetProvider()) { entry in
            TnewsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tnews")
        .description("أخبار تونس — عناوين حية")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct TnewsWidgetBundle: WidgetBundle {
    var body: some Widget {
        TnewsWidget()
    }
}
