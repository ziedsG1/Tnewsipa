import Foundation
import Capacitor
import WidgetKit
import UIKit
import SwiftUI

@objc(WidgetInstallPlugin)
public class WidgetInstallPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetInstallPlugin"
    public let jsName = "WidgetInstall"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "showAddWidgetGuide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getWidgetStatus", returnType: CAPPluginReturnPromise)
    ]

    @objc func showAddWidgetGuide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            if #available(iOS 14.0, *) {
                WidgetCenter.shared.reloadAllTimelines()
            }

            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller")
                return
            }

            let guide = WidgetGuideViewController()
            if #available(iOS 15.0, *) {
                if let sheet = guide.sheetPresentationController {
                    sheet.detents = [.medium(), .large()]
                    sheet.prefersGrabberVisible = true
                }
            }
            guide.modalPresentationStyle = .pageSheet
            presenter.present(guide, animated: true)
            call.resolve(["shown": true])
        }
    }

    @objc func getWidgetStatus(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.getCurrentConfigurations { result in
                switch result {
                case .success(let configs):
                    let installed = configs.contains { $0.kind == "TnewsWidget" }
                    call.resolve([
                        "installed": installed,
                        "count": configs.filter { $0.kind == "TnewsWidget" }.count
                    ])
                case .failure(let error):
                    call.resolve(["installed": false, "count": 0, "error": error.localizedDescription])
                }
            }
        } else {
            call.resolve(["installed": false, "count": 0])
        }
    }
}

@available(iOS 14.0, *)
struct WidgetGuidePreview: View {
    let articles: [NewsArticle]

    private var headline: NewsArticle {
        articles.first ?? .placeholder
    }

    var body: some View {
        VStack(alignment: .trailing, spacing: 8) {
            HStack {
                Text("Tnews")
                    .font(.caption.bold())
                    .foregroundColor(Color(red: 0.2, green: 0.83, blue: 0.6))
                Spacer()
                if articles.count > 1 {
                    Text("1/\(articles.count)")
                        .font(.caption2)
                        .foregroundColor(.gray)
                }
            }
            Text(headline.title)
                .font(.subheadline.bold())
                .foregroundColor(.white)
                .multilineTextAlignment(.trailing)
                .lineLimit(3)
                .frame(maxWidth: .infinity, alignment: .trailing)
            if let summary = headline.summary, !summary.isEmpty {
                Text(summary)
                    .font(.caption)
                    .foregroundColor(Color(white: 0.78))
                    .lineLimit(2)
                    .multilineTextAlignment(.trailing)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            HStack {
                if let topic = headline.topic {
                    Text(topic)
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(red: 0.05, green: 0.65, blue: 0.91, opacity: 0.25))
                        .foregroundColor(Color(red: 0.49, green: 0.83, blue: 0.99))
                        .clipShape(Capsule())
                }
                Spacer()
                Text(headline.sourceLabel)
                    .font(.caption2)
                    .foregroundColor(.gray)
            }
        }
        .padding(14)
        .background(
            LinearGradient(
                colors: [Color(red: 0.06, green: 0.09, blue: 0.16), Color(red: 0.03, green: 0.05, blue: 0.09)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.white.opacity(0.12), lineWidth: 1)
        )
        .environment(\.layoutDirection, .rightToLeft)
    }
}

class WidgetGuideViewController: UIViewController {
    private let statusLabel = UILabel()
    private var previewHost: UIViewController?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.03, green: 0.05, blue: 0.09, alpha: 1)
        setupUI()
        refreshStatus()
    }

    private func setupUI() {
        let scroll = UIScrollView()
        scroll.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(scroll)

        let content = UIStackView()
        content.axis = .vertical
        content.spacing = 16
        content.translatesAutoresizingMaskIntoConstraints = false
        scroll.addSubview(content)

        NSLayoutConstraint.activate([
            scroll.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scroll.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scroll.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scroll.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            content.topAnchor.constraint(equalTo: scroll.topAnchor, constant: 20),
            content.leadingAnchor.constraint(equalTo: scroll.leadingAnchor, constant: 20),
            content.trailingAnchor.constraint(equalTo: scroll.trailingAnchor, constant: -20),
            content.bottomAnchor.constraint(equalTo: scroll.bottomAnchor, constant: -20),
            content.widthAnchor.constraint(equalTo: scroll.widthAnchor, constant: -40)
        ])

        let title = makeLabel("إضافة ويدجت Tnews", size: 22, weight: .bold, color: .white)
        let subtitle = makeLabel(
            "هذا ويدجت حقيقي على الشاشة الرئيسية — ليس جزءاً من التطبيق",
            size: 14,
            weight: .regular,
            color: UIColor(white: 0.72, alpha: 1)
        )
        subtitle.numberOfLines = 0

        statusLabel.font = .systemFont(ofSize: 13, weight: .semibold)
        statusLabel.textColor = UIColor(red: 0.2, green: 0.83, blue: 0.6, alpha: 1)
        statusLabel.textAlignment = .right
        statusLabel.numberOfLines = 0

        let previewTitle = makeLabel("معاينة الويدجت", size: 15, weight: .semibold, color: .white)
        let previewContainer = UIView()
        previewContainer.translatesAutoresizingMaskIntoConstraints = false
        previewContainer.heightAnchor.constraint(equalToConstant: 150).isActive = true

        if #available(iOS 14.0, *) {
            let articles = WidgetDataStore.articles()
            let previewArticles = articles.isEmpty ? NewsArticle.samples : Array(articles.prefix(5))
            let host = UIHostingController(rootView: WidgetGuidePreview(articles: previewArticles))
            host.view.backgroundColor = .clear
            addChild(host)
            previewContainer.addSubview(host.view)
            host.view.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                host.view.topAnchor.constraint(equalTo: previewContainer.topAnchor),
                host.view.leadingAnchor.constraint(equalTo: previewContainer.leadingAnchor),
                host.view.trailingAnchor.constraint(equalTo: previewContainer.trailingAnchor),
                host.view.bottomAnchor.constraint(equalTo: previewContainer.bottomAnchor)
            ])
            host.didMove(toParent: self)
            previewHost = host
        }

        let stepsCard = makeStepsCard()
        let refreshButton = makeButton(title: "تحديث بيانات الويدجت", style: .primary) { [weak self] in
            self?.refreshWidgetData()
        }
        let closeButton = makeButton(title: "تم", style: .secondary) { [weak self] in
            self?.dismiss(animated: true)
        }

        [title, subtitle, statusLabel, previewTitle, previewContainer, stepsCard, refreshButton, closeButton].forEach {
            content.addArrangedSubview($0)
        }
    }

    private func makeStepsCard() -> UIView {
        let card = UIView()
        card.backgroundColor = UIColor(white: 1, alpha: 0.06)
        card.layer.cornerRadius = 14

        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 14),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 14),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -14),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -14)
        ])

        let heading = makeLabel("كيف تضيف الويدجت", size: 15, weight: .semibold, color: .white)
        stack.addArrangedSubview(heading)

        let steps = [
            "1. اخرج إلى الشاشة الرئيسية للآيفون",
            "2. اضغط مطولاً على خلفية الشاشة",
            "3. اضغط + في الزاوية العلوية",
            "4. ابحث عن Tnews",
            "5. اختر الحجم (صغير / متوسط / كبير) ثم أضف"
        ]
        for step in steps {
            stack.addArrangedSubview(makeLabel(step, size: 14, weight: .regular, color: UIColor(white: 0.82, alpha: 1)))
        }

        return card
    }

    private enum ButtonStyle { case primary, secondary }

    private func makeButton(title: String, style: ButtonStyle, action: @escaping () -> Void) -> UIButton {
        let button = UIButton(type: .system)
        button.setTitle(title, for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        button.layer.cornerRadius = 12
        button.heightAnchor.constraint(equalToConstant: 48).isActive = true
        button.addAction(UIAction { _ in action() }, for: .touchUpInside)

        switch style {
        case .primary:
            button.backgroundColor = UIColor(red: 0.05, green: 0.65, blue: 0.91, alpha: 1)
            button.setTitleColor(.white, for: .normal)
        case .secondary:
            button.backgroundColor = UIColor(white: 1, alpha: 0.08)
            button.setTitleColor(.white, for: .normal)
        }
        return button
    }

    private func makeLabel(_ text: String, size: CGFloat, weight: UIFont.Weight, color: UIColor) -> UILabel {
        let label = UILabel()
        label.text = text
        label.font = .systemFont(ofSize: size, weight: weight)
        label.textColor = color
        label.textAlignment = .right
        label.numberOfLines = 0
        return label
    }

    private func refreshStatus() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.getCurrentConfigurations { [weak self] result in
                DispatchQueue.main.async {
                    switch result {
                    case .success(let configs):
                        let count = configs.filter { $0.kind == "TnewsWidget" }.count
                        if count > 0 {
                            self?.statusLabel.text = "✓ الويدجت مُثبت (\(count)) — يعرض الأخبار على الشاشة الرئيسية"
                        } else {
                            self?.statusLabel.text = "○ لم يُضف الويدجت بعد — اتبع الخطوات أدناه"
                        }
                    case .failure:
                        self?.statusLabel.text = "○ اتبع الخطوات أدناه لإضافة الويدجت"
                    }
                }
            }
        }
    }

    private func refreshWidgetData() {
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        refreshStatus()

        let alert = UIAlertController(
            title: "تم التحديث",
            message: "تم إرسال آخر الأخبار إلى الويدجت. إذا كان مُثبتاً سيتحدث خلال ثوانٍ.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "حسناً", style: .default))
        present(alert, animated: true)
    }
}
