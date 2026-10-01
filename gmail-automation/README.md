# 📧 Bank Transaction & Card Statement Capture from Gmail to Supabase

This Google Apps Script automatically monitors your Gmail for incoming transaction alert emails from Indian banks & credit cards (**HDFC Bank, Kotak Mahindra Bank, ICICI Bank, American Express, Roar CC Rupay, Google Pay, PhonePe, Paytm, CRED**), extracts transaction details and statements, auto-bifurcates them into **Income / Expense / Debt / Savings / Transfer**, and sends them directly to your Supabase database.

---

## 🚨 Fix for Missed / Non-Reflecting Transactions

If you had transactions that did not reflect in your database, this overhauled script includes a dedicated **Recovery Tool** (`reprocessRecentEmails`) and **Diagnostic Tool** (`testRecentEmails`).

### Why Did Previous Transactions Not Reflect?
1. **Restrictive Search Query**: Previous queries only looked for rigid subjects like `subject:debited OR subject:spent` and missed standard Indian bank alerts like *"Alert: Update on your Kotak Account"*, *"You have done a UPI txn"*, *"Sent Rs ... to ..."*, or alerts from senders like `InstaAlerts@hdfcbank.net`, `nodereply@kotak.com`, `googlepay-noreply@google.com`, etc.
2. **Premature Labeling (Lockout)**: The previous script applied the `Tracker_Processed` label even if Supabase rejected the record or if credentials were unconfigured, permanently locking those emails out of future searches.
3. **Silent Errors**: When Supabase returned HTTP 400 or 401, the old script ignored the error response and didn't log what went wrong.

### How the New Code Fixes This:
- **Zero Accidental Lockout**: Only emails successfully written to Supabase (HTTP 2xx) receive the `Tracker_Processed` label.
- **Full Error Visibility**: Exact HTTP status codes and error bodies from Supabase are printed to the Apps Script Execution Log.
- **Deterministic IDs**: Every transaction receives a unique ID (`gmail_<messageId>`), making reprocessing completely safe and duplicate-proof (`resolution=merge-duplicates`).
- **Resilient Parsing**: Cleans HTML tables, decodes `₹`/`Rs.`/`INR` entities, and avoids capturing account balances or credit limits.

---

## ⚡ Quick Setup & Immediate Recovery

### Step 1: Open Google Apps Script
1. Go to [https://script.google.com/](https://script.google.com/) while logged in to your Gmail (`goridhruv1@gmail.com`).
2. Open your existing project (e.g. `Bank Transactions Sync to Supabase`) or create a **+ New project**.

### Step 2: Paste the Updated Code
1. Open [`Code.gs`](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/gmail-automation/Code.gs).
2. Copy its entire content and replace all code in the Google Apps Script editor.
3. At the top of `Code.gs` (lines 35-36), enter your actual Supabase URL and Anon Key:
   ```javascript
   var CONFIG = {
     SUPABASE_URL: "https://your-project-id.supabase.co", // Your actual Supabase URL
     SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIs...",         // Your actual Supabase Anon Key
     PROCESSED_LABEL: "Tracker_Processed",
     MAX_EMAILS_PER_RUN: 30
   };
   ```
4. Click the **Save** icon (`Ctrl + S` or the disk icon).

---

### Step 3: Immediately Recover Your 3 Missed Transactions
1. In the toolbar at the top, select the function: **`reprocessRecentEmails`**.
2. Click **Run**.
3. If prompted for permissions, click **Review permissions** -> Select your Google Account -> Click **Advanced** -> Click **Go to Bank Transactions Sync (unsafe)** -> Click **Allow**.
4. Check the **Execution log** at the bottom. You will see:
   ```text
   🔄 REPROCESSING EMAILS FROM THE LAST 72 HOURS
   Found X candidate threads in the last 72 hours.
   ✅ [RECOVERED TX] 2026-10-01 | Rs. 450 | Kotak Bank Account | Food & Dining | Swiggy
   ✅ [RECOVERED TX] 2026-10-01 | Rs. 500 | HDFC Bank Account  | Food & Dining | Zomato
   ...
   🏁 REPROCESSING COMPLETE! Transactions Recovered / Synced: 3
   ```
5. Open your **Budget Tracker web app** in your browser. All 3 transactions will immediately appear in your **Needs Review / Inbox** or **Transactions** tab!

---

### Step 4: Run a Diagnostic Check Anytime (`testRecentEmails`)
To verify your setup without altering any Gmail labels:
1. In the function dropdown, select **`testRecentEmails`**.
2. Click **Run**.
3. The Execution Log will:
   - Test connectivity to your Supabase database (`✅ Supabase Connection: SUCCESS`).
   - Scan the last 15 candidate emails and preview how each amount, merchant, and account is extracted.
   - Report any parsing warnings without modifying anything in your Gmail account.

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
| **"❌ SUPABASE CONFIGURATION ERROR"** | `SUPABASE_URL` or `SUPABASE_ANON_KEY` still has placeholder text in `CONFIG` | Edit lines 35-36 of `Code.gs` with your real Supabase URL and Anon Key. |
| **"❌ [SUPABASE ERROR 401]"** | Invalid or expired Supabase Anon Key | Go to Supabase Dashboard -> Settings -> API -> copy the `anon` `public` key and paste it into `CONFIG.SUPABASE_ANON_KEY`. |
| **"❌ [SUPABASE ERROR 400]"** | Column name mismatch or RLS policy restriction | Run `testRecentEmails` to view the exact error payload. Verify `supabase-schema.sql` was executed in the Supabase SQL Editor. |
| **Missed a transaction from yesterday** | Already labeled or skipped in previous run | Run `reprocessRecentEmails(72)` from the Apps Script editor toolbar. |
