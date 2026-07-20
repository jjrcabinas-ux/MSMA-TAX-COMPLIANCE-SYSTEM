# MSMA Tax Compliance System — project guide

Internal BIR tax-compliance workspace for the accounting firm **Mora, Sanchez, Meñoza and Associates (MSMA)**.
Single-file web app. Manages BIR filings, deadlines, working papers, and client compliance across three
clusters (RPM / ADS / VCM).

## Architecture (read this first)
- **The entire app is one file: `index.html`.** All HTML, CSS, and JS are inline. There is no build step.
- Data lives in **Firebase Firestore** (realtime sync, doc-per-cluster at `workspaces/{cluster}`, JSON `payload`
  field). `localStorage` is the offline cache. Firebase project id: `msma-tax-comliance-system` (the misspelling
  "comliance" is intentional — it's baked into the project id/URLs).
- Third-party libs (SheetJS, jsPDF, pdf-lib, pdf.js, Tesseract.js) are lazy-loaded from cdnjs with SRI hashes.
  Firebase SDK is loaded as an ES module at the bottom of `index.html`.

## Run locally
- Serve `index.html` over http (Firebase won't load from `file://`). Any static server works, e.g.
  `npx serve` or a tiny node server on port 5599. The local `.claude/launch.json` preview config (gitignored)
  runs a helper `serve.js` on :5599 — recreate a trivial static server if you want the Browser-pane preview.
- On `localhost` the app uses **`DEV_`-prefixed** Firestore workspaces (dev isolation). NEVER test against the
  real cluster docs — always the DEV_ sandbox.

## Deploy (automatic)
- **Push to `main` → GitHub Actions → Firebase Hosting.** The workflow `.github/workflows/firebase-hosting-merge.yml`
  deploys on every push (service account secret already in the repo). No manual deploy needed.
- Live site: **https://tax.msma.work** (custom domain → Firebase Hosting `msma-tax-comliance-system.web.app`).
- To deploy manually: `firebase deploy --only hosting` (needs `firebase login` once).

## Auth & security model
- **Individual email accounts.** Users pick a cluster, sign in with their own email + password (Firebase Auth).
  Self-service signup with email verification, but access requires the email to be in the Firestore
  `members/{email}` collection (`{clusters:[...]}`), managed from the admin-only **Team** page.
- Admin: `jjrc.msma@gmail.com` (all clusters, hardcoded as `ADMIN_EMAIL`).
- Firestore rules enforce per-cluster isolation + verified email + members allowlist (published in console).
- No password material ships in source. Offline sign-in uses a per-device PBKDF2 verifier.

## Key features (all live)
- **Client Masterlist** — clients with tax types, contacts; **Upload COR / 2303 auto-fill** (in-browser OCR via
  Tesseract, or PDF text layer; file never saved).
- **Overview** — compliance dashboard; counts the FULL expected filing universe (every registered client × every
  applicable period, floor Jan 2026 → current cycle), independent of navigation.
- **BIR Returns** — 11 returns across 8 tax types; per-client pipeline (RQ → Data Received → Return Drafted →
  Reviewed → Approved → Filed → Paid → Archived); period picker; urgency sort (OVERDUE on top).
- **Working Paper → 1601-C** (fully built): Employee Masterlist · Withholding Tax Computation (Excel-like editable
  sheet, verified/manual, BIR withholding table) · Draft Return (fills the official BIR 1601-C PDF) ·
  Annualization (year-end reconciliation + mid-year-hire previous-employer 2316 capture) · DAT File (per-employee
  1604C Schedule 1 record editor + alphalist Excel/CSV export).

## Conventions
- Match the existing inline style. Keep everything in `index.html`.
- Verify changes in a browser preview before committing (drive the actual flow), then commit + push (auto-deploys).
- Commit trailer used in this project: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- User is credit-sensitive: targeted edits, batch questions, verify then ship.

## Still open / TODO
- Generate the actual machine **`.DAT`** alphalist file (needs a sample .DAT to match the exact BIR schema).
- Reports tab (placeholder).
- Working papers for returns other than 1601-C (generic starter pages).
