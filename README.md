# 🚀 Dhruv's Financial Operating System (Tracker)

A web application built to replace your Google Form and Excel sheet, eliminate double-counting and formula bugs, calculate live bank balances for **HDFC** and **Kotak**, maintain **dynamic person ledgers**, feature an embedded **Google Gemini AI Financial Copilot**, and host for free on **GitHub Pages** connected to **Supabase**.

---

## 🌟 Upgrades Implemented

| Feature | Old Excel / Google Form | New Improvised Web App |
| :--- | :--- | :--- |
| **Live Bank Balances** | Not visible or broken across monthly tabs | **Live HDFC & Kotak Balances** pinned at the top with a side-by-side running ledger and 1-click reconcile. |
| **Inter-Account Transfers** | Falsely counted as Income or Expense | **Neutral Internal Transfers** (e.g. Kotak ➔ HDFC for stocks, or ATM cash withdrawals) that update balances without distorting monthly living spends. |
| **Person Ledgers** | Hardcoded or missing for new people | **Dynamic Person Ledgers** that automatically detect any `[Name] - Paid` and `[Name] - Reimbursed` category (Dad, Bismarck, Anant, Mom, etc.) with real-time settlement cards. |
| **AI Copilot** | None | **Embedded Google Gemini AI Chat Assistant**: log expenses, transfer funds, check balances, and ask questions via natural conversation. |
| **Double Counting Bug** | Credit card bills & purchases both counted as expenses (false -₹52,000 net) | **Fixed!** Card bill payments are classified as transfers/settlements. |
| **Data Ingestion** | Manual Google Form entry for every purchase | **Rule-Based Hybrid Auto-Capture from Gmail**: Recurring merchants (Swiggy, Fuel, Subscriptions) auto-approve; unverified ones queue in the Review Inbox. Only cash is manual! |
| **Loan & EMI Payoff** | Hardcoded, error-prone | **Dedicated EMI Schedule** tracking tenure and payoff for Watch EMI, Scooter Loan, and the new iPhone 17 Pro EMI (starting in October). |
| **Card Due Date Capture** | None / Manual tracking | **Auto-Statement & Due Date Parsing**: Captures exact payment due date and bill amounts from bank statement emails and SMS. |
| **Alerts & Intimations** | None / Missed due dates & overspending | **Smart Notifications Center**: Automated warnings when card bills are due soon (<= 3 days) or when you utilize 70%+ of funds for any budget head! |
| **Formula Errors** | `#DIV/0!`, `#NUM!`, `#REF!` broken cells | **Zero-division protected mathematical engine** with smooth progress indicators. |

---

## 📁 Directory Structure

```
HTML/
├── index.html               # Main Web Application (Single-Page App)
├── app.js                   # State manager, bank balances, Gemini Copilot & Supabase client
├── styles.css               # Modern design system (Dark/Light mode, Gemini drawer)
├── initial_data.js          # All 153 clean historical transactions & verified accounts
├── supabase-schema.sql      # Supabase SQL script with internal transfers & EMIs
├── Budget Tracker...xlsx    # Preserved original Excel backup
├── gmail-automation/
│   ├── Code.gs              # Google Apps Script for automated bank email capture (hybrid)
│   └── README.md            # 3-minute Gmail script setup guide
└── README.md                # This comprehensive user manual
```

---

## 🛠️ Step 1: Set Up Supabase (Database Backend)

1. Sign up or log in at **[https://supabase.com/](https://supabase.com/)** (100% free tier).
2. Click **New Project**, name it `Dhruv-Tracker`, set a database password, and choose your preferred region (`ap-south-1` Mumbai recommended).
3. Once the project is ready:
   - Go to the **SQL Editor** tab on the left sidebar.
   - Click **+ New query**.
   - Copy the entire contents of [supabase-schema.sql](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/supabase-schema.sql) and paste it into the editor.
   - Click **Run** (or `Ctrl + Enter`).
4. Get your API credentials:
   - In Supabase, go to **Project Settings** (gear icon) -> **API**.
   - Copy the **Project URL** (e.g., `https://xxxx.supabase.co`).
   - Copy the **anon public API Key** (`eyJhbGci...`).
5. Open your web app, click **⚙️ Settings** in the header, paste your Project URL and Anon Key, and click **Save Settings**!

---

## 🤖 Step 2: Google Gemini AI Copilot Setup

1. Click the **✨ Ask Gemini Copilot** floating button in the bottom right corner of the web app.
2. The AI assistant can immediately answer balance queries, log transactions, and execute transfers using its built-in offline engine.
3. For full generative reasoning and financial advice:
   - Get a free Gemini API key from [aistudio.google.com](https://aistudio.google.com/).
   - Click **⚙️ Settings** in the header, paste your Gemini API key, and save.
4. Try asking:
   - *"What is my live HDFC and Kotak balance?"*
   - *"How much does Bismarck or Dad owe me?"*
   - *"Add ₹350 for petrol via HDFC"*
   - *"Transfer 5000 from Kotak to HDFC"*

---

## 📧 Step 3: Set Up Automated Bank Email Capture (Gmail -> Supabase)

To capture online transactions from **HDFC Bank**, **ICICI Bank**, **American Express**, **Kotak**, and **UPI**:

1. Open [gmail-automation/README.md](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/gmail-automation/README.md).
2. Open Google Apps Script ([https://script.google.com/](https://script.google.com/)) with your Gmail (`goridhruv1@gmail.com`).
3. Copy & paste [gmail-automation/Code.gs](file:///c:/Users/Dhruv/OneDrive/Dhruv/Tracker/HTML/gmail-automation/Code.gs).
4. Put your Supabase URL & Key in lines 14-15.
5. Set up an automatic **Every 5 minutes** trigger.
6. **Done!** Whenever an alert arrives:
   - Known recurring merchants (Swiggy, Fuel, Subscriptions, Amazon, etc.) are **automatically approved** into your ledger.
   - Unverified/new merchants land in the **📥 Mail Inbox** tab for a 1-click review.
   - **Only physical cash transactions** need manual entry via `+ Add Transaction`!

---

## 🌐 Step 4: Deploy to GitHub Pages

1. Push the contents of the `HTML` folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Deploy Dhruv Financial OS"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/tracker.git
   git push -u origin main
   ```
2. In your GitHub repo, go to **Settings -> Pages**, select branch `main` and `/ (root)` (or `/HTML` if in a subfolder), and save.
3. Your tracker will be live on `https://YOUR_USERNAME.github.io/tracker/` accessible on your phone or laptop!
