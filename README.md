# 📧 Automatic Bank Transaction Capture from Gmail to Supabase

This Google Apps Script automatically monitors your Gmail for incoming transaction alert emails from Indian banks & credit cards (HDFC Bank, ICICI Bank, American Express, Kotak Mahindra, UPI alerts), extracts the transaction details, auto-bifurcates them into **Income / Expense / Debt / Savings**, and sends them directly to your Supabase database!

---

## 🚀 3-Minute Quick Setup

### Step 1: Open Google Apps Script
1. Go to [https://script.google.com/](https://script.google.com/) while logged in to your Gmail (`goridhruv1@gmail.com`).
2. Click **+ New project**.
3. Rename the project at the top to: `Bank Transactions Sync to Supabase`.

### Step 2: Paste the Code
1. Open the file [Code.gs](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/gmail-automation/Code.gs).
2. Copy its entire content and replace all code in the Google Apps Script editor.
3. Update lines 18-19 with your Supabase credentials:
   ```javascript
   SUPABASE_URL: "https://your-project-id.supabase.co",
   SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIs..."
   ```
4. Click the **Save** icon (disk icon or `Ctrl + S`).

### Step 3: Run a Test Execution
1. In the toolbar dropdown, make sure `syncBankEmailsToSupabase` is selected.
2. Click **Run**.
3. Google will ask for permissions to read Gmail and connect to external service (Supabase). Click **Review permissions** -> Select your Google Account -> Click **Advanced** -> Click **Go to Bank Transactions Sync (unsafe)** -> Click **Allow**.
4. Check the **Execution log** at the bottom to verify it found emails and posted them.

### Step 4: Set Up Automatic 5-Minute Trigger
1. In the left sidebar of Google Apps Script, click the **Triggers** icon (clock icon).
2. Click **+ Add Trigger** (bottom right button).
3. Set the following fields:
   - **Choose which function to run**: `syncBankEmailsToSupabase`
   - **Select event source**: `Time-driven`
   - **Select type of time based trigger**: `Minutes timer`
   - **Select minute interval**: `Every 5 minutes` (or `Every 15 minutes`)
4. Click **Save**.

---

## 🎯 How It Works in Your Budget Tracker Web App

1. Whenever an online transaction occurs on your HDFC account, ICICI card, Amex, or Kotak, the bank sends an alert email.
2. The Apps Script detects it, extracts the **Amount**, **Date**, **Merchant**, and **Account**, and determines whether it's an **Income**, **Expense**, **Debt**, or **Savings**.
3. It posts the transaction with status `"pending_review"`.
4. Inside your **Budget Web App**:
   - A notification badge appears in the **"Needs Review / Inbox"** section.
   - You can see the detected amount and suggested category head.
   - You can change the category with 1 click if needed, or hit **Approve**.
5. **Only cash transactions** need to be entered manually via the `+ Add Transaction` modal!
