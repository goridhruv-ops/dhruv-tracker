/**
 * ==============================================================================
 * DHRUV GORI BUDGET TRACKER - GMAIL TO SUPABASE AUTOMATION (OVERHAULED & RESILIENT)
 * ==============================================================================
 * Automatically monitors transaction and statement alert emails from:
 * - HDFC Bank (NetBanking, UPI InstaAlerts, Pixel Play, MoneyBack+)
 * - Kotak Mahindra Bank (NetBanking, UPI, Accounts)
 * - ICICI Bank (Amazon Pay Credit Card, Coral Credit Card)
 * - American Express (Amex Credit Card)
 * - Unity Small Finance Bank / Rupay (Roar CC)
 * - UPI Gateways & Apps (Google Pay, PhonePe, Paytm, CRED)
 *
 * Key Overhauls & Fixes:
 * 1. Resilient Search Query:
 *    - Expanded bank senders (alerts@hdfcbank.net, InstaAlerts@hdfcbank.net, alerts@kotak.com,
 *      nodereply@kotak.com, credit_cards@icicibank.com, alerts@icicibank.com,
 *      AmericanExpress@welcome.aexp.com, no-reply@paytm.com, noreply@phonepe.com,
 *      googlepay-noreply@google.com, alerts@cred.club).
 *    - Catches all Indian transaction subjects: UPI payments, "Update on your Account",
 *      "Sent Rs...", "Transaction alert for your card", "Paid successfully", etc.
 * 2. Guaranteed Delivery & Zero Accidental Lockout:
 *    - Never silently fails! Logs exact HTTP error status codes and response bodies.
 *    - CRITICAL FIX: Only adds the 'Tracker_Processed' label if Supabase responds with HTTP 2xx!
 *    - If Supabase fails or amount parsing fails, the email remains unlabeled so it can be retried.
 * 3. Robust HTML & Plain Text Parsing:
 *    - Sanitizes HTML tables, strips invisible formatting, decodes Indian Rupee symbols (₹, Rs, INR).
 *    - Multi-priority regex avoids mistakenly capturing account balances or available credit limits.
 * 4. Recovery & Diagnostic Tools:
 *    - testRecentEmails(): Read-only audit of the last 15 emails + Supabase ping test.
 *    - reprocessRecentEmails(hoursBack): Scans the last 72 hours without label filters to
 *      immediately recover Dhruv's 3 missed transactions!
 * 5. Idempotent Ingestion:
 *    - Assigns deterministic transaction IDs (e.g., "gmail_" + msg.getId()) so reprocessing
 *      never duplicates entries in Supabase.
 * ==============================================================================
 */

var CONFIG = {
  SUPABASE_URL: "https://kvqtfigjmryxztdbkgcg.supabase.co", // Dhruv's Live Supabase Project URL
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2cXRmaWdqbXJ5eHp0ZGJrZ2NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3Njg2ODYsImV4cCI6MjEwNjM0NDY4Nn0.CWbm4WwvLsqZccgWaMClCJ8JxmCchLVRlaYvDEhiC1o", // Dhruv's Supabase Anon Key
  PROCESSED_LABEL: "Tracker_Processed",                 // Gmail label applied to processed emails
  MAX_EMAILS_PER_RUN: 30                               // Process up to 30 emails per execution
};

var BANK_SENDERS = [
  "alerts@hdfcbank.net",
  "InstaAlerts@hdfcbank.net",
  "alerts@hdfcbank.com",
  "alerts@kotak.com",
  "nodereply@kotak.com",
  "credit_cards@icicibank.com",
  "alerts@icicibank.com",
  "AmericanExpress@welcome.aexp.com",
  "no-reply@paytm.com",
  "noreply@phonepe.com",
  "googlepay-noreply@google.com",
  "alerts@cred.club",
  "members@cred.club",
  "auto-message@amazonpay.in"
];

var SUBJECT_KEYWORDS = [
  "debited",
  "spent",
  "credited",
  "\"UPI txn\"",
  "\"UPI transaction\"",
  "\"UPI payment\"",
  "\"transaction alert\"",
  "\"Update on your\"",
  "\"Payment to\"",
  "\"Sent Rs\"",
  "\"Paid to\"",
  "\"Paid successfully\"",
  "\"Transaction Successful\"",
  "\"Money Sent\"",
  "\"Money Transferred\"",
  "\"Payment Confirmation\"",
  "statement",
  "\"due date\"",
  "\"bill generated\"",
  "\"total amount due\"",
  "e-statement"
];

/**
 * Main Sync Function - Runs every 5 or 15 minutes via Time-Driven Trigger
 */
function syncBankEmailsToSupabase() {
  Logger.log("Starting syncBankEmailsToSupabase execution...");

  var isConfigValid = checkSupabaseConfig();
  if (!isConfigValid) {
    Logger.log("❌ [CONFIG ERROR] Supabase credentials are not configured! Please set SUPABASE_URL and SUPABASE_ANON_KEY in CONFIG.");
    return;
  }

  var label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  var query = buildSearchQuery(true); // Exclude already processed emails
  var threads = GmailApp.search(query, 0, CONFIG.MAX_EMAILS_PER_RUN);
  Logger.log("Found " + threads.length + " candidate email threads to process.");

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var threadSuccess = true;
    var threadHasFinancials = false;

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      try {
        var clean = extractCleanText(msg);
        var subject = msg.getSubject();

        // 1. Statement / Bill Alert Check
        if (isStatementEmail(subject, clean.combined)) {
          threadHasFinancials = true;
          var bill = parseStatementEmail(msg, clean);
          if (bill && bill.card_name && bill.total_due > 0) {
            var bSuccess = postCardBillToSupabase(bill);
            if (bSuccess) {
              Logger.log("Captured Card Statement: " + bill.card_name + " | Due: " + bill.due_date + " | Rs." + bill.total_due);
            } else {
              threadSuccess = false;
              Logger.log("⚠️ [WARN] Failed to post card statement for: " + bill.card_name);
            }
          }
        } 
        // 2. Regular Transaction Alert Check
        else if (isFinancialEmail(subject, clean.combined)) {
          threadHasFinancials = true;
          var tx = parseTransactionEmail(msg, clean);
          if (tx && tx.amount > 0) {
            var success = postToSupabase(tx);
            if (success) {
              Logger.log("Imported (" + tx.status + "): " + tx.date + " | Rs." + tx.amount + " | " + tx.account + " | " + tx.category + " | " + tx.description);
            } else {
              threadSuccess = false;
              Logger.log("❌ [ERROR] postToSupabase returned false for: " + subject);
            }
          } else {
            threadSuccess = false;
            Logger.log("⚠️ [WARN] Financial keywords detected but amount could not be parsed in: '" + subject + "'. Thread will NOT be marked processed.");
          }
        } else {
          // Non-financial / Promotional email
          Logger.log("ℹ️ [INFO] Skipping non-transaction / promo email: '" + subject + "'");
        }
      } catch (err) {
        threadSuccess = false;
        Logger.log("❌ [ERROR] Exception parsing message " + msg.getId() + ": " + err.toString());
      }
    }

    // CRITICAL: Only label the thread if:
    // 1) Financial email(s) were successfully posted to Supabase, OR
    // 2) The thread contains ONLY non-financial emails (e.g. promo newsletter).
    // If a financial email failed to parse or failed to post to Supabase, DO NOT label it!
    if (!threadHasFinancials || threadSuccess) {
      threads[i].addLabel(label);
    } else {
      Logger.log("⚠️ [NOTICE] Thread " + threads[i].getId() + " was NOT labeled with " + CONFIG.PROCESSED_LABEL + " due to parsing or posting failure.");
    }
  }
  Logger.log("syncBankEmailsToSupabase finished.");
}

/**
 * Diagnostic & Audit Tool: Scans recent 15 emails without modifying labels + Tests Supabase Ping
 */
function testRecentEmails() {
  Logger.log("==================================================================");
  Logger.log("🧪 RUNNING GMAIL TO SUPABASE DIAGNOSTIC & TEST SCAN (READ-ONLY)");
  Logger.log("==================================================================");

  // 1. Supabase Connection Test
  Logger.log("Step 1: Testing Supabase Connection...");
  var isConfigValid = checkSupabaseConfig();
  if (!isConfigValid) {
    Logger.log("❌ SUPABASE CONFIGURATION ERROR: Please set SUPABASE_URL and SUPABASE_ANON_KEY in CONFIG!");
  } else {
    try {
      var pingUrl = CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/accounts?select=name&limit=1";
      var pingRes = UrlFetchApp.fetch(pingUrl, {
        method: "GET",
        headers: {
          "apikey": CONFIG.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY
        },
        muteHttpExceptions: true
      });
      var pCode = pingRes.getResponseCode();
      if (pCode >= 200 && pCode < 300) {
        Logger.log("✅ Supabase Connection: SUCCESS (Status " + pCode + " - Database reachable!)");
      } else {
        Logger.log("❌ Supabase Connection: FAILED with Status " + pCode + ": " + pingRes.getContentText());
      }
    } catch (e) {
      Logger.log("❌ Supabase Ping Exception: " + e.toString());
    }
  }

  // 2. Scan Candidate Emails (Without label restriction)
  Logger.log("\nStep 2: Scanning last 15 candidate emails in Gmail (No labels modified)...");
  var query = buildSearchQuery(false); // false = don't exclude Tracker_Processed
  var threads = GmailApp.search(query, 0, 15);
  Logger.log("Found " + threads.length + " candidate email threads.\n");

  var txCount = 0;
  var billCount = 0;
  var skipCount = 0;

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      var clean = extractCleanText(msg);
      var subject = msg.getSubject();
      var from = msg.getFrom();
      var dateStr = formatDate(msg.getDate());

      Logger.log("------------------------------------------------------------------");
      Logger.log("[" + (i + 1) + "." + (j + 1) + "] Date: " + dateStr + " | From: " + from);
      Logger.log("Subject: " + subject);

      if (isStatementEmail(subject, clean.combined)) {
        var bill = parseStatementEmail(msg, clean);
        Logger.log("📄 RESULT: Statement Detected!");
        Logger.log("   Card: " + bill.card_name + " | Total Due: Rs." + bill.total_due + " | Min Due: Rs." + bill.min_due + " | Due Date: " + bill.due_date);
        billCount++;
      } else if (isFinancialEmail(subject, clean.combined)) {
        var tx = parseTransactionEmail(msg, clean);
        if (tx && tx.amount > 0) {
          Logger.log("💰 RESULT: Transaction Extracted!");
          Logger.log("   Type: " + tx.transaction_type + " | Amount: Rs." + tx.amount + " | Account: " + tx.account);
          Logger.log("   Merchant: " + tx.description + " | Category: " + tx.category + " | Status: " + tx.status);
          txCount++;
        } else {
          Logger.log("⚠️ RESULT: Financial email detected, but amount extraction returned 0!");
          Logger.log("   Snippet: " + clean.plain.substring(0, 120).replace(/\n/g, " "));
        }
      } else {
        Logger.log("ℹ️ RESULT: Non-financial / Promotional email. Skipped.");
        skipCount++;
      }
    }
  }

  Logger.log("==================================================================");
  Logger.log("📊 DIAGNOSTIC SCAN SUMMARY:");
  Logger.log("   Candidate Threads Checked: " + threads.length);
  Logger.log("   Transactions Extracted:    " + txCount);
  Logger.log("   Statements Extracted:      " + billCount);
  Logger.log("   Non-Financial / Skipped:   " + skipCount);
  Logger.log("==================================================================");
}

/**
 * RECOVERY TOOL: Reprocess recent emails from the past N hours (default 72h / 3 days)
 * Ignores the 'Tracker_Processed' filter so any missed transactions are captured immediately!
 */
function reprocessRecentEmails(hoursBack) {
  hoursBack = hoursBack || 72; // Default to 72 hours (3 days)
  Logger.log("==================================================================");
  Logger.log("🔄 REPROCESSING EMAILS FROM THE LAST " + hoursBack + " HOURS");
  Logger.log("==================================================================");

  var isConfigValid = checkSupabaseConfig();
  if (!isConfigValid) {
    Logger.log("❌ SUPABASE CONFIGURATION ERROR: Please set SUPABASE_URL and SUPABASE_ANON_KEY in CONFIG before reprocessing!");
    return;
  }

  var label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  var days = Math.max(1, Math.ceil(hoursBack / 24));
  var timeFilter = "newer_than:" + days + "d";
  var query = buildSearchQuery(false, timeFilter);

  Logger.log("Query: " + query);
  var threads = GmailApp.search(query, 0, 50);
  Logger.log("Found " + threads.length + " candidate threads in the last " + hoursBack + " hours.");

  var cutoffTime = new Date(Date.now() - (hoursBack * 60 * 60 * 1000));
  var recoveredCount = 0;
  var statementCount = 0;
  var failedCount = 0;

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    var threadSuccess = true;
    var threadHasFinancials = false;

    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      if (msg.getDate() < cutoffTime) continue; // Outside requested window

      var clean = extractCleanText(msg);
      var subject = msg.getSubject();

      try {
        if (isStatementEmail(subject, clean.combined)) {
          threadHasFinancials = true;
          var bill = parseStatementEmail(msg, clean);
          if (bill && bill.card_name && bill.total_due > 0) {
            var sSuccess = postCardBillToSupabase(bill);
            if (sSuccess) {
              statementCount++;
              Logger.log("✅ [STATEMENT REPROCESSED] Card: " + bill.card_name + " | Due: Rs." + bill.total_due + " on " + bill.due_date);
            } else {
              threadSuccess = false;
              failedCount++;
            }
          }
        } else if (isFinancialEmail(subject, clean.combined)) {
          threadHasFinancials = true;
          var tx = parseTransactionEmail(msg, clean);
          if (tx && tx.amount > 0) {
            var postSuccess = postToSupabase(tx);
            if (postSuccess) {
              recoveredCount++;
              Logger.log("✅ [RECOVERED TX] " + tx.date + " | Rs." + tx.amount + " | " + tx.account + " | " + tx.category + " | " + tx.description);
            } else {
              threadSuccess = false;
              failedCount++;
              Logger.log("❌ [POST FAILED] For: " + subject);
            }
          } else {
            threadSuccess = false;
            Logger.log("⚠️ [PARSE FAILED] Could not extract amount from: " + subject);
          }
        }
      } catch (err) {
        threadSuccess = false;
        Logger.log("❌ [ERROR] Message " + msg.getId() + ": " + err.toString());
      }
    }

    if (threadHasFinancials && threadSuccess) {
      threads[i].addLabel(label);
    }
  }

  Logger.log("==================================================================");
  Logger.log("🏁 REPROCESSING COMPLETE!");
  Logger.log("   Transactions Recovered / Synced: " + recoveredCount);
  Logger.log("   Card Statements Synced:          " + statementCount);
  Logger.log("   Failed Transactions:             " + failedCount);
  Logger.log("==================================================================");
}

/**
 * Builds the Gmail Search Query string
 */
function buildSearchQuery(excludeProcessed, extraFilter) {
  var senderQuery = "from:(" + BANK_SENDERS.join(" OR ") + ")";
  var subjectQuery = "subject:(" + SUBJECT_KEYWORDS.join(" OR ") + ")";
  var query = "(" + senderQuery + " OR " + subjectQuery + ")";

  if (excludeProcessed) {
    query = "(-label:" + CONFIG.PROCESSED_LABEL + ") " + query;
  }
  if (extraFilter) {
    query = extraFilter + " " + query;
  }
  return query;
}

/**
 * Checks if Supabase credentials are configured in CONFIG
 */
function checkSupabaseConfig() {
  if (!CONFIG.SUPABASE_URL || CONFIG.SUPABASE_URL.indexOf("YOUR_PROJECT_REF") !== -1 ||
      !CONFIG.SUPABASE_ANON_KEY || CONFIG.SUPABASE_ANON_KEY.indexOf("YOUR_SUPABASE_ANON_KEY") !== -1) {
    return false;
  }
  return true;
}

/**
 * Detect if message contains financial transaction indicators
 */
function isFinancialEmail(subject, text) {
  var s = (subject + " " + text).toLowerCase();

  // Filter out pure promotional marketing emails that talk about offers or future discounts
  if (s.indexOf("exclusive offer") !== -1 || s.indexOf("plan your vacation") !== -1 || s.indexOf("get up to") !== -1) {
    if (s.indexOf("debited") === -1 && s.indexOf("spent") === -1 && s.indexOf("paid") === -1 && s.indexOf("sent") === -1) {
      return false;
    }
  }

  // Filter out pure login OTPs that are not transaction debits
  var isOtpOnly = (s.indexOf("one time password") !== -1 || s.indexOf("otp") !== -1) && 
                  s.indexOf("debited") === -1 && s.indexOf("spent") === -1 && s.indexOf("paid") === -1 && s.indexOf("sent") === -1;
  if (isOtpOnly) return false;

  var hasActionVerb = (
    s.indexOf("debited") !== -1 ||
    s.indexOf("spent") !== -1 ||
    s.indexOf("paid") !== -1 ||
    s.indexOf("sent") !== -1 ||
    s.indexOf("transferred") !== -1 ||
    s.indexOf("credited") !== -1 ||
    s.indexOf("withdrawn") !== -1 ||
    s.indexOf("charged") !== -1 ||
    s.indexOf("transaction") !== -1 ||
    s.indexOf("txn") !== -1 ||
    s.indexOf("purchase") !== -1 ||
    s.indexOf("upi") !== -1
  );

  var hasCurrencyIndicator = (
    s.indexOf("rs") !== -1 ||
    s.indexOf("inr") !== -1 ||
    s.indexOf("₹") !== -1
  );

  return hasActionVerb && hasCurrencyIndicator;
}

/**
 * Detect if message is a Credit Card Statement or Bill Due notification
 */
function isStatementEmail(subject, body) {
  var text = (subject + " " + body).toLowerCase();
  var isStatement = (
    text.indexOf("statement") !== -1 ||
    text.indexOf("bill generated") !== -1 ||
    text.indexOf("payment due date") !== -1 ||
    text.indexOf("total amount due") !== -1 ||
    text.indexOf("total due") !== -1 ||
    text.indexOf("e-statement") !== -1 ||
    text.indexOf("credit card bill") !== -1
  );
  var isCard = (
    text.indexOf("credit card") !== -1 ||
    text.indexOf("card ending") !== -1 ||
    text.indexOf("cardmember") !== -1 ||
    text.indexOf("american express") !== -1 ||
    text.indexOf("amex") !== -1 ||
    text.indexOf("coral") !== -1 ||
    text.indexOf("amazon pay") !== -1 ||
    text.indexOf("moneyback") !== -1 ||
    text.indexOf("pixel") !== -1 ||
    text.indexOf("roar") !== -1
  );
  return isStatement && isCard;
}

/**
 * Extracts and sanitizes plain text and HTML representations of an email
 */
function extractCleanText(msg) {
  var plain = msg.getPlainBody() || "";
  var html = msg.getBody() || "";

  // Convert HTML tables and tags into readable line breaks and decoded symbols
  var htmlClean = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|tr|td|th|li|h[1-6])>/gi, " \n ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#8377;|&rupee;/gi, "₹")
    .replace(/&#8360;/gi, "Rs.")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[\u00A0\u200B\u200C\u200D]/g, " ");

  var plainClean = plain
    .replace(/&#8377;|&rupee;/gi, "₹")
    .replace(/&#8360;/gi, "Rs.")
    .replace(/&nbsp;/gi, " ")
    .replace(/[\u00A0\u200B\u200C\u200D]/g, " ");

  return {
    subject: msg.getSubject() || "",
    plain: plainClean,
    html: htmlClean,
    combined: (msg.getSubject() || "") + "\n" + plainClean + "\n" + htmlClean
  };
}

/**
 * Parse regular transaction email
 */
function parseTransactionEmail(msg, cleanData) {
  cleanData = cleanData || extractCleanText(msg);
  var from = msg.getFrom().toLowerCase();
  var subject = cleanData.subject;
  var fullText = cleanData.combined;
  var date = formatDate(msg.getDate());

  var amount = extractAmount(subject, fullText);
  if (!amount || amount <= 0) return null;

  var isCredit = /credited|received|refund|deposited/i.test(fullText) && !/debited|spent/i.test(subject);
  var account = detectAccount(from, subject, fullText);
  var merchant = detectMerchant(subject, fullText);
  var classification = autoClassify(merchant, isCredit, subject, fullText);

  // If internal transfer / ATM cash withdrawal
  var toAccount = classification.to_account || null;

  return {
    id: "gmail_" + msg.getId(), // Deterministic ID prevents duplicate rows on re-runs
    date: date,
    transaction_type: classification.type,
    category: classification.category,
    amount: amount,
    description: merchant ? merchant : subject.substring(0, 50),
    account: account,
    to_account: toAccount,
    status: classification.isKnown ? "approved" : "pending_review", // Hybrid auto-approval
    source: "gmail"
  };
}

/**
 * Parse Credit Card Statement Email to extract Due Date, Total Due, Min Due
 */
function parseStatementEmail(msg, cleanData) {
  cleanData = cleanData || extractCleanText(msg);
  var from = msg.getFrom().toLowerCase();
  var subject = cleanData.subject;
  var fullText = cleanData.combined;
  var date = formatDate(msg.getDate());

  var cardName = detectAccount(from, subject, fullText);

  // Extract Total Amount Due
  var totalDue = 0;
  var totalDueMatch = fullText.match(/(?:total\s+amount\s+due|total\s+due|bill\s+amount)\s*(?::|-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (totalDueMatch && totalDueMatch[1]) {
    totalDue = parseNumber(totalDueMatch[1]);
  } else {
    totalDue = extractAmount(subject, fullText);
  }

  // Extract Minimum Amount Due
  var minDue = 0;
  var minDueMatch = fullText.match(/(?:min(?:imum)?\s+amount\s+due|min\s+due)\s*(?::|-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (minDueMatch && minDueMatch[1]) {
    minDue = parseNumber(minDueMatch[1]);
  }

  // Extract Payment Due Date
  var dueDate = "";
  var dueDateMatch = fullText.match(/(?:payment\s+due\s+date|due\s+date|pay\s+by|due\s+on)\s*(?::|-)?\s*([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{2,4})/i);
  if (dueDateMatch && dueDateMatch[1]) {
    dueDate = normalizeDateString(dueDateMatch[1].trim());
  }

  // Fallback: Statement date + 18 days
  if (!dueDate) {
    var d = new Date(msg.getDate());
    d.setDate(d.getDate() + 18);
    dueDate = formatDate(d);
  }

  return {
    msg_id: msg.getId(),
    card_name: cardName,
    statement_date: date,
    due_date: dueDate,
    total_due: totalDue,
    min_due: minDue,
    raw_subject: subject
  };
}

/**
 * Intelligent Multi-Priority Amount Extractor
 * Prevents picking up Account Balances or Credit Limits
 */
function extractAmount(subject, text) {
  var sText = subject + " " + text;

  // 1. High priority: Check Subject line for direct amount
  var subjMatch = subject.match(/(?:Rs\.?|INR|₹)\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (subjMatch && subjMatch[1]) {
    var amt = parseNumber(subjMatch[1]);
    if (amt > 0) return amt;
  }

  // 2. High priority: Action-verb + Amount in body
  var verbBeforePatterns = [
    /(?:debited\s*(?:by|for|with)?|spent|paid|payment\s+of|sent|transferred|withdrawn|charged|purchase\s+of|txn\s+of|transaction\s+of)\s*(?::|-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:txn\s+amount|transaction\s+amount|transfer\s+amount|bill\s+amount|total\s+amount|amount\s+debited|debited\s+amount)\s*(?::|-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    /(?:amount|amt)\s*(?::|-)?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i
  ];

  for (var i = 0; i < verbBeforePatterns.length; i++) {
    var match = sText.match(verbBeforePatterns[i]);
    if (match && match[1]) {
      var amt = parseNumber(match[1]);
      if (amt > 0) return amt;
    }
  }

  // 3. High priority: Amount + Action-verb in body
  var verbAfterPattern = /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:has\s+been\s+)?(?:debited|spent|paid|transferred|withdrawn|credited|approved|deducted)/i;
  var verbAfterMatch = sText.match(verbAfterPattern);
  if (verbAfterMatch && verbAfterMatch[1]) {
    var amt = parseNumber(verbAfterMatch[1]);
    if (amt > 0) return amt;
  }

  // 4. Fallback: Search all currency patterns, strictly excluding balance / credit limit occurrences
  var generalRegex = /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi;
  var m;
  while ((m = generalRegex.exec(sText)) !== null) {
    var matchIndex = m.index;
    var candidateStr = m[1];
    var amt = parseNumber(candidateStr);

    if (amt > 0) {
      var startIndex = Math.max(0, matchIndex - 35);
      var preceding = sText.substring(startIndex, matchIndex).toLowerCase();
      var isBalanceOrLimit = /(?:bal|balance|avl|avail|limit|credit\s+limit|avbl|outstanding)/i.test(preceding);
      if (!isBalanceOrLimit) {
        return amt;
      }
    }
  }

  return 0;
}

function parseNumber(str) {
  if (!str) return 0;
  var clean = str.replace(/,/g, '').replace(/^\s+|\s+$/g, '');
  var num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}

/**
 * Maps bank alerts to Dhruv's 9 Configured Accounts
 */
function detectAccount(from, subject, body) {
  var text = (from + " " + subject + " " + body).toLowerCase();

  // 1. American Express Credit Card
  if (text.indexOf("american express") !== -1 || text.indexOf("amex") !== -1 || from.indexOf("aexp.com") !== -1) {
    return "American Express Credit Card";
  }

  // 2. Roar CC Rupay / Unity Bank
  if (text.indexOf("roar") !== -1 || text.indexOf("unity bank") !== -1 || text.indexOf("unity small finance") !== -1) {
    return "Roar CC Rupay";
  }

  // 3. ICICI Credit Cards
  if (text.indexOf("coral") !== -1) {
    return "ICICI - Coral Credit Card";
  }
  if (text.indexOf("amazon pay") !== -1 || (text.indexOf("icici") !== -1 && text.indexOf("amazon") !== -1)) {
    return "ICICI - Amazon Pay Credit Card";
  }
  if (from.indexOf("credit_cards@icicibank.com") !== -1 || (text.indexOf("icici") !== -1 && text.indexOf("credit card") !== -1)) {
    return "ICICI - Amazon Pay Credit Card";
  }

  // 4. HDFC Credit Cards
  if (text.indexOf("pixel") !== -1) {
    return "HDFC - Pixel Play Credit Card";
  }
  if (text.indexOf("money back") !== -1 || text.indexOf("moneyback") !== -1) {
    return "HDFC - Money Back Plus Credit Card";
  }
  if (text.indexOf("hdfc") !== -1 && text.indexOf("credit card") !== -1) {
    return "HDFC - Money Back Plus Credit Card";
  }

  // 5. Kotak Mahindra Bank
  if (text.indexOf("kotak") !== -1 || from.indexOf("kotak.com") !== -1) {
    return "Kotak Bank Account";
  }

  // 6. ATM / Cash Withdrawal
  if (text.indexOf("atm cash") !== -1 || text.indexOf("cash withdrawal") !== -1 || text.indexOf("withdrawn cash") !== -1) {
    return "HDFC Bank Account";
  }

  // 7. HDFC Bank Account (Dhruv's Primary Salary & UPI Account)
  if (text.indexOf("hdfc") !== -1 || from.indexOf("hdfcbank") !== -1) {
    return "HDFC Bank Account";
  }

  // Fallback default
  return "HDFC Bank Account";
}

/**
 * Extracts and normalizes Merchant Name
 */
function detectMerchant(subject, body) {
  var text = subject + "\n" + body;

  var patterns = [
    /(?:paid\s+to|spent\s+at|charged\s+at|used\s+at|purchase\s+at)\s+([A-Za-z0-9\s\.\&\*\-]+?)(?:\s+on|\s+via|\s+using|\s+ref|\.|\n|,)/i,
    /(?:to\s+vpa|vpa)\s+([a-zA-Z0-9\.\_\-]+@[a-zA-Z0-9]+)/i,
    /(?:at|to|info:)\s+([A-Za-z0-9\s\.\&\*\-]+?)(?:\s+on|\s+via|\s+using|\s+ref|\.|\n|,)/i,
    /(?:sent\s+to|transferred\s+to|payment\s+to)\s+([A-Za-z0-9\s\.\&\*\-]+?)(?:\s+on|\s+via|\s+using|\s+ref|\.|\n|,)/i
  ];

  for (var i = 0; i < patterns.length; i++) {
    var match = text.match(patterns[i]);
    if (match && match[1]) {
      var candidate = match[1].trim();
      if (candidate.indexOf("@") !== -1) {
        candidate = candidate.split("@")[0].replace(/[\._\-]+/g, " ");
      }
      candidate = candidate.replace(/\b\d{5,}\b/g, "").trim();
      candidate = candidate.replace(/\s+(is|has|was|completed|successful|approved|done)\b.*$/i, "").trim();
      candidate = candidate.replace(/\s+upi$/i, "").trim();
      if (candidate.length >= 2 && !/^(the|your|a|an|account|rs|inr|account\s+ending)$/i.test(candidate)) {
        return cleanMerchantName(candidate);
      }
    }
  }

  // Known merchant names fallback check
  var KNOWN_MERCHANTS = [
    "Swiggy", "Zomato", "Blinkit", "Zepto", "Instamart", "BigBasket", "DMart",
    "Amazon", "Flipkart", "Myntra", "Ajio", "Zara", "H&M", "Uniqlo", "Nykaa", "Meesho",
    "Uber", "Ola", "Rapido", "IRCTC", "IndiGo", "MakeMyTrip",
    "Spotify", "Netflix", "BookMyShow", "Apple", "YouTube", "Hotstar", "Prime Video",
    "Airtel", "Jio", "Vodafone", "Vi",
    "HPCL", "BPCL", "IOCL", "Shell", "Indian Oil", "Petrol",
    "Apollo", "PharmEasy", "1mg", "Netmeds",
    "Zerodha", "Groww", "Angel One", "Upstox",
    "Starbucks", "McDonald", "Burger King", "Domino", "KFC"
  ];

  var lowerText = text.toLowerCase();
  for (var k = 0; k < KNOWN_MERCHANTS.length; k++) {
    var mName = KNOWN_MERCHANTS[k];
    if (lowerText.indexOf(mName.toLowerCase()) !== -1) {
      return mName;
    }
  }

  return "";
}

function cleanMerchantName(str) {
  if (!str) return "";
  var clean = str.replace(/\s+/g, ' ').trim();
  if (clean === clean.toUpperCase() || clean === clean.toLowerCase()) {
    clean = clean.split(' ').map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  }
  return clean.substring(0, 40);
}

/**
 * Intelligent Auto-Bifurcation + Known Merchant Verification
 * Maps to Dhruv's exact database schema categories
 */
function autoClassify(merchant, isCredit, subject, body) {
  var m = (merchant + " " + subject + " " + body).toLowerCase();

  // 1. CREDITS / INCOME
  if (isCredit) {
    if (m.indexOf("salary") !== -1 || m.indexOf("bismarck") !== -1 || m.indexOf("payroll") !== -1) {
      return { type: "Income", category: "Paycheck (Bismarck Salary)", isKnown: true };
    }
    if (m.indexOf("dad") !== -1) {
      return { type: "Income", category: "Dad - Reimbursed", isKnown: true };
    }
    if (m.indexOf("anant") !== -1) {
      return { type: "Income", category: "Anant - Reimbursed", isKnown: true };
    }
    if (m.indexOf("kotak") !== -1 || m.indexOf("stock") !== -1 || m.indexOf("dividend") !== -1) {
      return { type: "Income", category: "Kotak - Stock Proceeds", isKnown: true };
    }
    if (m.indexOf("surcharge") !== -1) {
      return { type: "Income", category: "Fuel Surcharge", isKnown: true };
    }
    return { type: "Income", category: "Other Income", isKnown: false };
  }

  // 2. CASH WITHDRAWAL (Transfer)
  if (m.indexOf("atm cash") !== -1 || m.indexOf("cash withdrawal") !== -1 || m.indexOf("withdrawn cash") !== -1) {
    return { type: "Transfer", category: "Internal Transfer (Between Accounts)", to_account: "Cash", isKnown: true };
  }

  // 3. CARD BILL PAYMENTS (Transfer)
  if (m.indexOf("bill payment") !== -1 || m.indexOf("cc payment") !== -1 || m.indexOf("card payment") !== -1 || m.indexOf("credit card bill") !== -1) {
    if (m.indexOf("amazon") !== -1) return { type: "Transfer", category: "Card Bill Payment - ICICI - Amazon Pay", to_account: "ICICI - Amazon Pay Credit Card", isKnown: true };
    if (m.indexOf("coral") !== -1) return { type: "Transfer", category: "Card Bill Payment - ICICI - Coral", to_account: "ICICI - Coral Credit Card", isKnown: true };
    if (m.indexOf("amex") !== -1 || m.indexOf("american express") !== -1) return { type: "Transfer", category: "Card Bill Payment - American Express", to_account: "American Express Credit Card", isKnown: true };
    if (m.indexOf("pixel") !== -1) return { type: "Transfer", category: "Card Bill Payment - HDFC - Pixel Play", to_account: "HDFC - Pixel Play Credit Card", isKnown: true };
    if (m.indexOf("moneyback") !== -1 || m.indexOf("money back") !== -1) return { type: "Transfer", category: "Card Bill Payment - HDFC - Money Back Plus", to_account: "HDFC - Money Back Plus Credit Card", isKnown: true };
    if (m.indexOf("roar") !== -1 || m.indexOf("unity") !== -1) return { type: "Transfer", category: "Card Bill Payment - Unity - Roar", to_account: "Roar CC Rupay", isKnown: true };
    return { type: "Transfer", category: "Card Bill Payment - ICICI - Amazon Pay", to_account: "ICICI - Amazon Pay Credit Card", isKnown: true };
  }

  // 4. DEBT & EMIs
  if (m.indexOf("l&t") !== -1 || m.indexOf("scooter") !== -1) return { type: "Debt", category: "Scooter Loan (L&T Finance)", isKnown: true };
  if (m.indexOf("watch emi") !== -1) return { type: "Debt", category: "Watch EMI", isKnown: true };
  if (m.indexOf("lenskart") !== -1) return { type: "Debt", category: "Lenskart EMI", isKnown: true };
  if (m.indexOf("flipkart emi") !== -1) return { type: "Debt", category: "Flipkart EMI", isKnown: true };
  if (m.indexOf("iphone") !== -1) return { type: "Debt", category: "iPhone 17 Pro EMI", isKnown: true };
  if (m.indexOf("education loan") !== -1 || m.indexOf("sem1 fee") !== -1) return { type: "Debt", category: "Education Loan (Sem1 Fee)", isKnown: true };

  // 5. SAVINGS / INVESTMENTS
  if (m.indexOf("zerodha") !== -1 || m.indexOf("groww") !== -1 || m.indexOf("angel") !== -1 || m.indexOf("stocks") !== -1 || m.indexOf("upstox") !== -1) {
    return { type: "Savings", category: "Stocks", isKnown: true };
  }
  if (m.indexOf("mutual fund") !== -1 || m.indexOf("sip") !== -1 || m.indexOf("uti") !== -1 || m.indexOf("nippon") !== -1) {
    return { type: "Savings", category: "Mutual Funds", isKnown: true };
  }

  // 6. PERSON LEDGERS (Debits)
  if (m.indexOf("dad") !== -1 && (m.indexOf("paid") !== -1 || m.indexOf("sent") !== -1)) {
    return { type: "Expense", category: "Dad - Paid", isKnown: true };
  }
  if (m.indexOf("bismarck") !== -1 && (m.indexOf("paid") !== -1 || m.indexOf("sent") !== -1)) {
    return { type: "Expense", category: "Bismarck - Paid", isKnown: true };
  }
  if (m.indexOf("anant") !== -1 && (m.indexOf("paid") !== -1 || m.indexOf("sent") !== -1)) {
    return { type: "Expense", category: "Anant - Paid", isKnown: true };
  }

  // 7. KNOWN VERIFIED EXPENSES (Auto-Approved)
  if (m.indexOf("swiggy") !== -1 || m.indexOf("zomato") !== -1 || m.indexOf("mcdonald") !== -1 || 
      m.indexOf("starbucks") !== -1 || m.indexOf("burger king") !== -1 || m.indexOf("domino") !== -1 || 
      m.indexOf("kfc") !== -1 || m.indexOf("restaurant") !== -1 || m.indexOf("cafe") !== -1 || 
      m.indexOf("chutney") !== -1 || m.indexOf("frankie") !== -1 || m.indexOf("juice") !== -1 ||
      m.indexOf("pizza") !== -1 || m.indexOf("bakery") !== -1 || m.indexOf("chai") !== -1 || m.indexOf("coffee") !== -1) {
    return { type: "Expense", category: "Food & Dining", isKnown: true };
  }

  if (m.indexOf("hpcl") !== -1 || m.indexOf("bpcl") !== -1 || m.indexOf("iocl") !== -1 || 
      m.indexOf("petrol") !== -1 || m.indexOf("fuel") !== -1 || m.indexOf("shell") !== -1 ||
      m.indexOf("indian oil") !== -1 || m.indexOf("bharat petroleum") !== -1 || m.indexOf("cng") !== -1) {
    return { type: "Expense", category: "Fuel", isKnown: true };
  }

  if (m.indexOf("blinkit") !== -1 || m.indexOf("zepto") !== -1 || m.indexOf("instamart") !== -1 || 
      m.indexOf("bigbasket") !== -1 || m.indexOf("dmart") !== -1 || m.indexOf("grocer") !== -1 ||
      m.indexOf("supermarket") !== -1 || m.indexOf("reliance fresh") !== -1) {
    return { type: "Expense", category: "Groceries", isKnown: true };
  }

  if (m.indexOf("spotify") !== -1 || m.indexOf("netflix") !== -1 || m.indexOf("bookmyshow") !== -1 || 
      m.indexOf("apple") !== -1 || m.indexOf("icloud") !== -1 || m.indexOf("prime video") !== -1 || 
      m.indexOf("youtube") !== -1 || m.indexOf("hotstar") !== -1 || m.indexOf("cinema") !== -1 ||
      m.indexOf("pvr") !== -1 || m.indexOf("inox") !== -1) {
    return { type: "Expense", category: "Entertainment", isKnown: true };
  }

  if (m.indexOf("amazon") !== -1 || m.indexOf("flipkart") !== -1 || m.indexOf("myntra") !== -1 || 
      m.indexOf("ajio") !== -1 || m.indexOf("zara") !== -1 || m.indexOf("h&m") !== -1 ||
      m.indexOf("uniqlo") !== -1 || m.indexOf("nykaa") !== -1 || m.indexOf("tata cliq") !== -1 ||
      m.indexOf("meesho") !== -1 || m.indexOf("decathlon") !== -1) {
    return { type: "Expense", category: "Shopping", isKnown: true };
  }

  if (m.indexOf("apollo") !== -1 || m.indexOf("pharmeasy") !== -1 || m.indexOf("1mg") !== -1 ||
      m.indexOf("hospital") !== -1 || m.indexOf("clinic") !== -1 || m.indexOf("pharmacy") !== -1 ||
      m.indexOf("medical") !== -1 || m.indexOf("doctor") !== -1 || m.indexOf("netmeds") !== -1) {
    return { type: "Expense", category: "Medical", isKnown: true };
  }

  if (m.indexOf("uber") !== -1 || m.indexOf("ola") !== -1 || m.indexOf("rapido") !== -1 || 
      m.indexOf("irctc") !== -1 || m.indexOf("indigo") !== -1 || m.indexOf("railway") !== -1 ||
      m.indexOf("flight") !== -1 || m.indexOf("fastag") !== -1 || m.indexOf("toll") !== -1 ||
      m.indexOf("metro") !== -1) {
    return { type: "Expense", category: "Transport", isKnown: true };
  }

  if (m.indexOf("recharge") !== -1 || m.indexOf("airtel") !== -1 || m.indexOf("jio") !== -1 || 
      m.indexOf("vodafone") !== -1 || m.indexOf("vi ") !== -1 || m.indexOf("bsnl") !== -1) {
    return { type: "Expense", category: "Mobile Recharge (own 2 numbers)", isKnown: true };
  }

  if (m.indexOf("broadband") !== -1 || m.indexOf("wifi") !== -1 || m.indexOf("act fibernet") !== -1) {
    return { type: "Expense", category: "Internet", isKnown: true };
  }

  // 8. FALLBACK (Pending Review)
  return { type: "Expense", category: "Other Expense", isKnown: false };
}

/**
 * Post regular transaction to Supabase
 * Handles errors and logs exact response body
 */
function postToSupabase(transaction) {
  if (!checkSupabaseConfig()) {
    Logger.log("❌ [CONFIG ERROR] Supabase credentials not set! Update SUPABASE_URL and SUPABASE_ANON_KEY in CONFIG.");
    return false;
  }

  var url = CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/transactions?on_conflict=id";
  var options = {
    method: "POST",
    headers: {
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    payload: JSON.stringify(transaction),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var responseText = response.getContentText();

    if (code >= 200 && code < 300) {
      return true;
    } else {
      Logger.log("❌ [SUPABASE ERROR " + code + "] Response: " + responseText);
      Logger.log("   Failed Payload: " + JSON.stringify(transaction));
      return false;
    }
  } catch (err) {
    Logger.log("❌ [NETWORK/FETCH ERROR] " + err.toString());
    return false;
  }
}

/**
 * Post Card Bill Statement to Supabase card_bills & register pending bill payment
 */
function postCardBillToSupabase(bill) {
  if (!checkSupabaseConfig()) {
    Logger.log("❌ [CONFIG ERROR] Supabase credentials not set in CONFIG.");
    return false;
  }

  var billsUrl = CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/card_bills?on_conflict=card_name,due_date";
  var billRecord = {
    card_name: bill.card_name,
    statement_date: bill.statement_date,
    due_date: bill.due_date,
    total_due: bill.total_due,
    min_due: bill.min_due,
    is_paid: false,
    notes: bill.raw_subject ? bill.raw_subject.substring(0, 100) : "Captured from Gmail"
  };

  var billSuccess = false;
  try {
    var response = UrlFetchApp.fetch(billsUrl, {
      method: "POST",
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      payload: JSON.stringify(billRecord),
      muteHttpExceptions: true
    });
    var code = response.getResponseCode();
    if (code >= 200 && code < 300) {
      billSuccess = true;
    } else {
      Logger.log("⚠️ [CARD BILLS POST ERROR " + code + "] " + response.getContentText());
    }
  } catch (e) {
    Logger.log("⚠️ [CARD BILLS FETCH EXCEPTION] " + e.toString());
  }

  // Also register a notification intimation record in transactions pending review
  var catName = "Card Bill Payment - " + bill.card_name.replace(" Credit Card", "").trim();
  var intimationTx = {
    id: "gmail_bill_" + (bill.msg_id || (bill.card_name + "_" + bill.due_date).replace(/\s+/g, "_")),
    date: bill.due_date,
    transaction_type: "Transfer",
    category: catName,
    amount: bill.total_due,
    description: "💳 e-Statement: Bill Due on " + bill.due_date + " (Min: Rs." + bill.min_due + ")",
    account: "HDFC Bank Account",
    to_account: bill.card_name,
    status: "pending_review",
    source: "gmail"
  };

  var txSuccess = postToSupabase(intimationTx);
  return billSuccess || txSuccess;
}

function formatDate(d) {
  if (!d) return "";
  var year = d.getFullYear();
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

function normalizeDateString(str) {
  try {
    var parts = str.split(/[-\/\s\.]+/);
    if (parts.length >= 3) {
      var d = parseInt(parts[0], 10);
      var m = parts[1];
      var y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;

      var monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      var mIdx = -1;
      if (isNaN(parseInt(m, 10))) {
        mIdx = monthNames.indexOf(m.toLowerCase().substring(0, 3));
      } else {
        mIdx = parseInt(m, 10) - 1;
      }

      if (mIdx >= 0 && mIdx < 12 && d >= 1 && d <= 31) {
        var mm = ("0" + (mIdx + 1)).slice(-2);
        var dd = ("0" + d).slice(-2);
        return y + "-" + mm + "-" + dd;
      }
    }
  } catch (e) {}
  return "";
}

function getOrCreateLabel(name) {
  var label = GmailApp.getUserLabelByName(name);
  if (!label) {
    label = GmailApp.createLabel(name);
  }
  return label;
}
