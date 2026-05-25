# Tnews Widget — iOS

Arabic RTL news app for Tunisia, ported from the Windows **Tnews Widget** Electron app to **iOS** with [Capacitor](https://capacitorjs.com/). Includes a **home-screen widget**, weather, themes, story sharing, and local notifications.

**Repository:** [github.com/ziedsG1/Tnewsipa](https://github.com/ziedsG1/Tnewsipa)  
**Bundle ID:** `tn.tnews.widget` · **Version:** 2.0.1

---

## Documentation

| Document | Description |
|----------|-------------|
| **[DOCUMENTATION.md](./DOCUMENTATION.md)** | Full project docs: architecture, APIs, feeds, iOS widget, build, troubleshooting |
| **[docs/Tnews-Documentation.pdf](./docs/Tnews-Documentation.pdf)** | Same documentation as PDF |
| **[GITHUB-SETUP.md](./GITHUB-SETUP.md)** | GitHub Actions + download IPA + Sideloadly install (Windows-friendly) |

---

## Features at a glance

- Headlines from Tunisian RSS (Nawaat, Al Katiba, TAP, La Presse, Mosaique, …)
- Scrollable news cards in the app
- iOS **WidgetKit** extension (small / medium / large)
- Weather for Tunis (Open-Meteo)
- Dark / light theme
- Share articles as 1080×1920 story images
- Optional local notifications
- Double-tap a card to open the source article

---

## Quick start

### Windows (web changes + CI build)

```powershell
cd c:\Users\zied\Tnewsipa
npm install
# edit www/
npm run sync
git add .
git commit -m "Your change"
git push origin main
```

Then download the IPA from **GitHub → Actions → TnewsWidget-ipa** and install with [Sideloadly](https://sideloadly.io/). Details: [GITHUB-SETUP.md](./GITHUB-SETUP.md).

### macOS (run on device)

```bash
npm install
npx cap sync ios
cd ios/App && pod install
npx cap open ios
```

Set your **Team** in Xcode, connect iPhone, press **Run**.

---

## Project layout

```
www/              Web UI + news/weather/share/notifications
ios/App/          Xcode project, WidgetKit extension, native plugins
.github/workflows/  build-ios-ipa.yml — unsigned IPA on push to main
```

See [DOCUMENTATION.md § Project structure](./DOCUMENTATION.md#4-project-structure) for the full tree.

---

## Important constraints

- **IPA cannot be built on Windows alone** — use GitHub Actions or a Mac.
- CI produces an **unsigned** IPA; sign with Apple ID (Sideloadly / Xcode).
- Free Apple ID installs **expire after ~7 days** — re-sideload to refresh.
- Open the **main app once** before the home-screen widget shows real headlines.

---

## After changing web files

```bash
npx cap sync ios
```

Rebuild in Xcode or push to GitHub to trigger Actions.

---

## Desktop source

Original Windows app: `C:\Program Files\Tnews Widget`  
Reference extract: `extracted-fresh/`
