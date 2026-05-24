import WidgetKit
import SwiftUI

struct NewsEntry: TimelineEntry {
    let date: Date
    let article: NewsArticle
    let index: Int
    let total: Int
}

struct TnewsWidgetProvider: TimelineProvider {
    func placeholder(in context: Context) -> NewsEntry {
        NewsEntry(date: Date(), article: .placeholder, index: 0, total: 0)
    }

    func getSnapshot(in context: Context, completion: @escaping (NewsEntry) -> Void) {
        completion(currentEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<NewsEntry>) -> Void) {
        let payload = WidgetDataStore.load()
        let articles = payload?.articles ?? []
        let now = Date()

        var entries: [NewsEntry] = []
        if articles.isEmpty {
            entries.append(NewsEntry(date: now, article: .placeholder, index: 0, total: 0))
        } else {
            for (index, article) in articles.prefix(12).enumerated() {
                let entryDate = Calendar.current.date(byAdding: .minute, value: index * 8, to: now) ?? now
                entries.append(NewsEntry(date: entryDate, article: article, index: index, total: articles.count))
            }
        }

        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: now) ?? now.addingTimeInterval(900)
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }

    private func currentEntry() -> NewsEntry {
        let payload = WidgetDataStore.load()
        if let article = payload?.articles.first {
            return NewsEntry(date: Date(), article: article, index: 0, total: payload?.articles.count ?? 1)
        }
        return NewsEntry(date: Date(), article: .placeholder, index: 0, total: 0)
    }
}

struct TnewsWidgetEntryView: View {
    var entry: NewsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.09, blue: 0.16), Color(red: 0.03, green: 0.05, blue: 0.09)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(alignment: .trailing, spacing: 6) {
                HStack {
                    Text("Tnews")
                        .font(.caption.bold())
                        .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
                    Spacer()
                    if entry.total > 0 {
                        Text("\(entry.index + 1)/\(entry.total)")
                            .font(.caption2)
                            .foregroundColor(.gray)
                    }
                }

                Text(entry.article.title)
                    .font(family == .systemSmall ? .caption.bold() : .subheadline.bold())
                    .foregroundColor(.white)
                    .lineLimit(family == .systemSmall ? 3 : 2)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: .infinity, alignment: .trailing)

                if family != .systemSmall, let summary = entry.article.summary, !summary.isEmpty {
                    Text(summary)
                        .font(.caption)
                        .foregroundColor(Color(white: 0.75))
                        .lineLimit(family == .systemMedium ? 2 : 3)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }

                HStack {
                    if let topic = entry.article.topic {
                        Text(topic)
                            .font(.caption2)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(red: 0.05, green: 0.65, blue: 0.91, opacity: 0.25))
                            .foregroundColor(Color(red: 0.49, green: 0.83, blue: 0.99))
                            .clipShape(Capsule())
                    }
                    Spacer()
                    Text(entry.article.sourceLabel)
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .lineLimit(1)
                }
            }
            .padding(12)
        }
        .environment(\.layoutDirection, .rightToLeft)
    }
}

struct TnewsWidget: Widget {
    let kind = "TnewsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: TnewsWidgetProvider()) { entry in
            TnewsWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Tnews")
        .description("أخبار تونس — عناوين متحركة")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

@main
struct TnewsWidgetBundle: WidgetBundle {
    var body: some Widget {
        TnewsWidget()
    }
}
