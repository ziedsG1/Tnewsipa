# Option 2 — Build IPA with GitHub Actions

Follow these steps on your Windows PC to get the `.ipa` file.

---

## Step 1 — Create a GitHub account (if needed)

Go to [https://github.com/signup](https://github.com/signup) and create a free account.

---

## Step 2 — Create a new repository on GitHub

1. Open [https://github.com/new](https://github.com/new)
2. **Repository name:** `Tnewsipa` (or any name you like)
3. Leave it **Public** or **Private** (both work)
4. **Do NOT** check "Add a README" (we already have files)
5. Click **Create repository**

Keep that page open — you will need the repo URL.

---

## Step 3 — Push this project to GitHub

Open **PowerShell** and run these commands one by one.

Replace `YOUR_GITHUB_USERNAME` with your real GitHub username:

```powershell
cd c:\Users\zied\Tnewsipa

git init
git add .
git commit -m "Add Tnews Widget iOS app"
git branch -M main
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/Tnewsipa.git
git push -u origin main
```

When prompted, sign in with your GitHub account (browser or token).

---

## Step 4 — Run the build workflow

1. Open your repo on GitHub: `https://github.com/YOUR_GITHUB_USERNAME/Tnewsipa`
2. Click the **Actions** tab
3. Click **Build iOS IPA** in the left sidebar
4. Click **Run workflow** → **Run workflow** (green button)
5. Wait about **5–10 minutes** for the build to finish (green checkmark)

---

## Step 5 — Download the IPA

1. Click the completed workflow run
2. Scroll down to **Artifacts**
3. Download **TnewsWidget-ipa**
4. Unzip it — inside you will find `TnewsWidget-unsigned.ipa`

---

## Step 6 — Install on your iPhone

The GitHub build produces an **unsigned** IPA. To install it on iPhone you need to **sign** it first.

### Easiest way on Windows: Sideloadly

1. Download [Sideloadly](https://sideloadly.io/) on your PC
2. Connect your iPhone with a USB cable
3. Drag `TnewsWidget-unsigned.ipa` into Sideloadly
4. Enter your **Apple ID** email (free account works)
5. Click **Start** — the app installs on your iPhone

**Note:** With a free Apple ID, the app expires after **7 days**. Re-install with Sideloadly to refresh.

### Alternative: AltStore

1. Install [AltStore](https://altstore.io/) on iPhone + AltServer on PC
2. Use AltStore to sideload the signed IPA

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `git push` asks for password | Use a [Personal Access Token](https://github.com/settings/tokens) instead of password |
| Workflow fails on `pod install` | Re-run the workflow — GitHub macOS runners occasionally need a retry |
| iPhone says "Unable to install" | Sign the IPA with Sideloadly/AltStore using your Apple ID |
| App stops working after 7 days | Re-sideload with Sideloadly (free Apple ID limit) |

---

## Automatic builds

Every time you push to the `main` branch, GitHub will automatically rebuild the IPA.

```powershell
# After editing files:
npx cap sync ios
git add .
git commit -m "Update app"
git push
```

Then download the new IPA from **Actions → Artifacts**.
