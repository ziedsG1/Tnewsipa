# Tnews Widget — iOS (IPA)

iOS version of **Tnews Widget**, ported from the Windows Electron app at `C:\Program Files\Tnews Widget`.

The app shows rotating Tunisia news headlines in Arabic (RSS feeds from TAP, La Presse, Mosaique FM, Nawaat, and others), matching the desktop widget behavior.

## Important: IPA cannot be built on Windows alone

Apple requires **macOS + Xcode** to compile an `.ipa` file. This project is ready to build; you need one of these options:

| Option | What you need |
|--------|----------------|
| **Mac + Xcode** | Free Apple ID (install on your iPhone via USB) |
| **GitHub Actions** | Push this repo to GitHub; workflow builds IPA on macOS (see below) |
| **Apple Developer ($99/year)** | Signed IPA for TestFlight or direct install |

---

## Quick start on a Mac

```bash
cd Tnewsipa
npm install
npx cap sync ios
npx cap open ios
```

In Xcode:

1. Select your **Team** (Apple ID) under Signing & Capabilities.
2. Connect your iPhone via USB.
3. Choose your iPhone as the run destination.
4. Press **Run** (▶) — the app installs on your phone.

### Export IPA from Xcode

1. **Product → Archive**
2. **Distribute App → Development** (or Ad Hoc / App Store)
3. Export the `.ipa` file

---

## Build IPA with GitHub Actions (no Mac)

1. Create a GitHub repository and push this project:

```bash
git init
git add .
git commit -m "Add Tnews Widget iOS app"
git remote add origin https://github.com/YOUR_USER/Tnewsipa.git
git push -u origin main
```

2. Open **Actions → Build iOS IPA → Run workflow**.

3. Download the **TnewsWidget-ipa** artifact when the job finishes.

**Note:** The default workflow produces an **unsigned** IPA (for archiving). To install on iPhone you must **sign** the app:

- Use Xcode on a Mac with your Apple ID, or
- Add signing secrets to GitHub (certificate + provisioning profile), or
- Use [AltStore](https://altstore.io/) / [Sideloadly](https://sideloadly.io/) with a signed build.

---

## Install IPA on your iPhone

### Method A — Xcode (easiest, free Apple ID)

Connect iPhone → Run from Xcode (no IPA file needed).

### Method B — AltStore / Sideloadly

1. Build or obtain a **signed** `.ipa`.
2. Install AltStore or Sideloadly on your PC.
3. Connect iPhone and sideload the IPA.
4. Free Apple ID: app expires after 7 days (re-sign weekly).

### Method C — TestFlight (Apple Developer)

Upload signed IPA to App Store Connect → invite yourself via TestFlight.

---

## Project structure

```
Tnewsipa/
├── www/                 # Web UI (same look as desktop widget)
│   ├── index.html
│   ├── styles.css
│   ├── widget.js
│   ├── app.js           # News cache + Capacitor bridge
│   └── lib/newsFetcher.js
├── ios/                 # Native iOS project (Xcode)
├── capacitor.config.json
└── .github/workflows/build-ios-ipa.yml
```

## App ID

- Bundle ID: `tn.tnews.widget`
- Display name: **Tnews Widget**

## After changing web files

```bash
npx cap sync ios
```

Then rebuild in Xcode or re-run the GitHub Action.

---

## Desktop widget source

The Windows app was extracted from:

`C:\Program Files\Tnews Widget\resources\app.asar`

A copy of the extracted source is in `extracted-app/` (gitignored) for reference.
