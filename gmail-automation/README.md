# 📧 Bank Transaction & Card Statement Capture from Gmail to Supabase

This Google Apps Script automatically monitors your Gmail for incoming transaction alert emails from Indian banks & credit cards (**HDFC Bank, Kotak Mahindra Bank, ICICI Bank, American Express, Roar CC Rupay, Google Pay, PhonePe, Paytm, CRED**), extracts transaction details and statements, auto-bifurcates them into **Income / Expense / Debt / Savings / Transfer**, and sends them directly to your Supabase database.

---

## 📅 Strict Date Boundary Policy (October 1, 2026 Onwards)

To ensure Dhruv's tracker only contains current transactions starting with the budget period:
- **Strict Search Boundary**: The Gmail API search query starts with `after:2026/09/30`. Gmail strictly limits candidate results to emails received from **October 1st, 2026 00:00:00** onwards. Old emails from 2020, 2022, 2023, 2024, and pre-October 2026 are never fetched.
- **Fail-Safe Parser Guards**: Both `parseTransactionEmail` and `parseStatementEmail` inspect the email timestamp. If an email date is before `2026-10-01`, it is immediately skipped (`Logger.log("Skipping email before 2026-10-01: " + date); return null;`).
- **Database Sanitization**: Supabase has been purged of all previous historical 2022/2023 test imports (`date < '2026-10-01'`) and pre-October card statements, guaranteeing a clean database.

---

## 🚨 Fix for Missed / Non-Reflecting Transactions

If you had transactions that did not reflect in your database, this overhauled script includes a dedicated **Recovery Tool** (`reprocessRecentEmails`) and **Diagnostic Tool** (`testRecentEmails`).

### Why Did Previous Transactions Not Reflect?
1. **Restrictive Search Query**: Previous queries only looked for rigid subjects like `subject:debited OR subject:spent` and missed standard Indian bank alerts like *"Alert: Update on your Kotak Account"*, *"You have done a UPI txn"*, *"Sent Rs ... to ..."*, or alerts from senders like `InstaAlerts@hdfcbank.net`, `nodereply@kotak.com`, `googlepay-noreply@google.com`, etc.
2. **Premature Labeling (Lockout)**: The previous script applied the `Tracker_Processed` label even if Supabase rejected the record or if credentials were unconfigured, permanently locking those emails out of future searches.
3. **Silent Errors**: When Supabase returned HTTP 400 or 401, the old script ignored the error response and didn't log what went wrong.
4. **No Date Floor**: Without a date filter, initial runs pulled historical emails dating back to 2020/2022/2023.

### How the New Code Fixes This:
- **Strict Date Boundary**: `after:2026/09/30` query filter + runtime guards ensure only entries from **1st October 2026** onwards are ingested.
- **Zero Accidental Lockout**: Only emails successfully written to Supabase (HTTP 2xx) receive the `Tracker_Processed` label.
- **Full Error Visibility**: Exact HTTP status codes and error bodies from Supabase are printed to the Apps Script Execution Log.
- **Deterministic IDs**: Every transaction receives a unique ID (`gmail_<messageId>`), making reprocessing completely safe and duplicate-proof (`resolution=merge-duplicates`).
- **Resilient Parsing**: Cleans HTML tables, decodes `₹`/`Rs.`/`INR` entities, and avoids capturing account balances or credit limits.
- **Statement Guard**: Regular card purchase/debit alerts are prevented from being mistakenly classified as statements.

---

## ⚡ Quick Setup & Immediate Recovery

### Step 1: Open Google Apps Script
1. Go to [https://script.google.com/](https://script.google.com/) while logged in to your Gmail (`goridhruv1@gmail.com`).
2. Open your existing project (e.g. `Bank Transactions Sync to Supabase`) or create a **+ New project**.

### Step 2: Paste the Updated Code
1. Open [`Code.gs`](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/gmail-automation/Code.gs) (or `HTML/Code.gs`).
2. Copy its entire content and replace all code in the Google Apps Script editor.
3. At the top of `Code.gs`, verify your Supabase configuration:
   ```javascript
   var CONFIG = {
     SUPABASE_URL: "https://kvqtfigjmryxztdbkgcg.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     PROCESSED_LABEL: "Tracker_Processed",
     MAX_EMAILS_PER_RUN: 30,
     MIN_DATE_BOUNDARY: "2026-10-01",
     GMAIL_AFTER_FILTER: "after:2026/09/30"
   };
   ```
4. Click the **Save** icon (`Ctrl + S` or the disk icon).

---

### Step 3: Test & Verify the Date Boundary (`testRecentEmails`)
To verify that the date boundary is working and only scans emails on or after October 1st, 2026:
1. In the toolbar at the top, select the function: **`testRecentEmails`**.
2. Click **Run**.
3. Check the **Execution Log** at the bottom:
   - Verifies database connection (`✅ Supabase Connection: SUCCESS`).
   - Verifies the search query: `Diagnostic Search Query: after:2026/09/30 (from:(...) OR subject:(...))`.
   - Shows candidate emails strictly from October 1st, 2026 onwards. Any pre-October emails are skipped.
   - Reports extracted transactions and statements in read-only mode without touching any Gmail labels.

---

### Step 4: Run Recovery for October 1st Transactions (`reprocessRecentEmails`)
To instantly pull today's transactions from October 1st, 2026:
1. In the toolbar at the top, select the function: **`reprocessRecentEmails`**.
2. Click **Run**.
3. If prompted for permissions, click **Review permissions** -> Select your Google Account -> Click **Advanced** -> Click **Go to Bank Transactions Sync (unsafe)** -> Click **Allow**.
4. Check the **Execution Log**:
   ```text
   🔄 REPROCESSING EMAILS FROM THE LAST 72 HOURS (MIN DATE: 2026-10-01)
   Query: newer_than:3d after:2026/09/30 (from:(...) OR subject:(...))
   Found X candidate threads in the last 72 hours.
   ✅ [RECOVERED TX] 2026-10-01 | Rs. 450 | Kotak Bank Account | Food & Dining | Swiggy
   ...
   🏁 REPROCESSING COMPLETE! Transactions Recovered / Synced: X
   ```
5. Open your **Budget Tracker web app** in your browser (`http://localhost:8080`). All newly processed transactions will immediately appear!

---

### Step 5: Ensure Automatic 5-Minute Trigger is Running
1. In the left sidebar of Google Apps Script, click the **Triggers** icon (clock icon).
2. If you already have a trigger for `syncBankEmailsToSupabase`, make sure it is active.
3. If not, click **+ Add Trigger** (bottom right):
   - **Choose which function to run**: `syncBankEmailsToSupabase`
   - **Choose which deployment should run**: `Head`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 5 minutes` (or `Every 15 minutes`)
4. Click **Save**.

---

## 🏦 Supported Banks, Cards & UPI Apps

| Source | Identifier / Senders | Account Mapped to |
| :--- | :--- | :--- |
| **HDFC Bank Account** | `alerts@hdfcbank.net`, `InstaAlerts@hdfcbank.net`, `alerts@hdfcbank.com` | `HDFC Bank Account` |
| **Kotak Mahindra Bank** | `alerts@kotak.com`, `nodereply@kotak.com`, NetBanking alerts | `Kotak Bank Account` |
| **ICICI Amazon Pay Card** | `credit_cards@icicibank.com`, `alerts@icicibank.com` (Amazon Pay) | `ICICI - Amazon Pay Credit Card` |
| **ICICI Coral Card** | `credit_cards@icicibank.com` (Coral) | `ICICI - Coral Credit Card` |
| **American Express Card** | `AmericanExpress@welcome.aexp.com` | `AmericanExpress Credit Card` |
| **Unity Bank / Roar CC** | Unity Bank / Roar Rupay alerts | `Roar CC Rupay` |
| **HDFC Pixel Play Card** | HDFC Credit Card (Pixel Play) | `HDFC - Pixel Play Credit Card` |
| **HDFC MoneyBack+ Card** | HDFC Credit Card (MoneyBack) | `HDFC - Money Back Plus Credit Card` |
| **Google Pay (UPI)** | `googlepay-noreply@google.com` | Detected Bank or `HDFC Bank Account` |
| **PhonePe (UPI)** | `noreply@phonepe.com` | Detected Bank or `HDFC Bank Account` |
| **Paytm (UPI)** | `no-reply@paytm.com` | Detected Bank or `HDFC Bank Account` |
| **CRED** | `alerts@cred.club`, `members@cred.club` | Detected Bank or Card |
| **ATM Cash Withdrawal** | "ATM Cash", "Cash withdrawal" | `Transfer` from Bank to `Cash` |

---

## 🔍 Troubleshooting

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| **"❌ SUPABASE CONFIGURATION ERROR"** | `SUPABASE_URL` or `SUPABASE_ANON_KEY` still has placeholder text in `CONFIG` | Edit lines 39-40 of `Code.gs` with your real Supabase URL and Anon Key. |
| **"❌ [SUPABASE ERROR 401]"** | Invalid or expired Supabase Anon Key | Go to Supabase Dashboard -> Settings -> API -> copy the `anon` `public` key and paste it into `CONFIG.SUPABASE_ANON_KEY`. |
| **"❌ [SUPABASE ERROR 400]"** | Column name mismatch or RLS policy restriction | Run `testRecentEmails` to view the exact error payload. Verify `supabase-schema.sql` was executed in the Supabase SQL Editor. |
| **"Skipping email before 2026-10-01"** | Normal expected behavior | Guard prevented an email from before October 1, 2026 from being ingested. |
| **Missed a transaction from today** | Labeled prematurely or skipped in previous test | Run `reprocessRecentEmails(72)` from the Apps Script editor toolbar. |
