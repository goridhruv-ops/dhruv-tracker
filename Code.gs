/**
 * ==============================================================================
 * DHRUV GORI BUDGET TRACKER - GMAIL TO SUPABASE AUTOMATION (HYBRID WORKFLOW)
 * ==============================================================================
 * Automatically reads transaction & statement emails from banks:
 * - HDFC Bank, ICICI Bank, American Express, Kotak Mahindra, Unity/Roar CC.
 * 
 * Features:
 * 1. Transaction Alerts (Debited, Credited, UPI, POS):
 *    - Auto-bifurcates into Income / Expense / Debt / Savings / Transfer.
 *    - Known recurring merchants (Swiggy, Fuel, Subscriptions) are AUTO-APPROVED.
 *    - New or unknown merchants are saved as 'pending_review' for 1-click review.
 * 
 * 2. Credit Card Statement & Bill Due Alerts:
 *    - Captures Payment Due Date, Total Amount Due, and Minimum Amount Due.
 *    - Auto-populates the Card Due Date and Bill in the Notification Center!
 */

var CONFIG = {
  SUPABASE_URL: "https://YOUR_PROJECT_REF.supabase.co", // Replace with your Supabase URL
  SUPABASE_ANON_KEY: "YOUR_SUPABASE_ANON_KEY",         // Replace with your Supabase Anon Key
  PROCESSED_LABEL: "Tracker_Processed",                 // Gmail label applied to processed emails
  MAX_EMAILS_PER_RUN: 30                               // Process up to 30 emails per execution
};

function syncBankEmailsToSupabase() {
  var label = getOrCreateLabel(CONFIG.PROCESSED_LABEL);
  
  // Comprehensive query matching debit/credit alerts AND statement/bill notifications
  var query = '(-label:' + CONFIG.PROCESSED_LABEL + ') AND (' +
    'from:alerts@hdfcbank.net OR ' +
    'from:hdfcbank.net OR ' +
    'from:credit_cards@icicibank.com OR ' +
    'from:alerts@icicibank.com OR ' +
    'from:AmericanExpress@welcome.aexp.com OR ' +
    'from:alerts@kotak.com OR ' +
    'subject:"debited" OR subject:"spent" OR subject:"credited" OR subject:"UPI txn" OR ' +
    'subject:"statement" OR subject:"due date" OR subject:"bill generated" OR subject:"total amount due"' +
  ')';

  var threads = GmailApp.search(query, 0, CONFIG.MAX_EMAILS_PER_RUN);
  Logger.log("Found " + threads.length + " candidate email threads.");

  for (var i = 0; i < threads.length; i++) {
    var messages = threads[i].getMessages();
    for (var j = 0; j < messages.length; j++) {
      var msg = messages[j];
      try {
        var subject = msg.getSubject();
        var body = msg.getPlainBody();

        // Check if this is a Credit Card Statement / Due Date notification
        if (isStatementEmail(subject, body)) {
          var bill = parseStatementEmail(msg);
          if (bill && bill.card_name && bill.total_due > 0) {
            postCardBillToSupabase(bill);
            Logger.log("Captured Card Statement: " + bill.card_name + " | Due: " + bill.due_date + " | Rs." + bill.total_due);
          }
        } else {
          // Regular transaction email
          var tx = parseTransactionEmail(msg);
          if (tx && tx.amount > 0) {
            var success = postToSupabase(tx);
            if (success) {
              Logger.log("Imported (" + tx.status + "): " + tx.date + " | Rs." + tx.amount + " | " + tx.category + " | " + tx.description);
            }
          }
        }
      } catch (err) {
        Logger.log("Error parsing message " + msg.getId() + ": " + err.toString());
      }
    }
    threads[i].addLabel(label);
  }
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
    text.indexOf("e-statement") !== -1
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
 * Parse Credit Card Statement Email to extract Due Date, Total Due, Min Due
 */
function parseStatementEmail(msg) {
  var from = msg.getFrom().toLowerCase();
  var subject = msg.getSubject();
  var body = msg.getPlainBody();
  var date = formatDate(msg.getDate());
  var fullText = subject + "\n" + body;

  var cardName = detectAccount(from, subject, body);

  // Extract Total Amount Due
  var totalDue = 0;
  var totalDueMatch = fullText.match(/(?:total\s+amount\s+due|total\s+due)\s*(?::|-)?\s*(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (totalDueMatch && totalDueMatch[1]) {
    totalDue = parseFloat(totalDueMatch[1].replace(/,/g, ''));
  } else {
    totalDue = extractAmount(fullText);
  }

  // Extract Minimum Amount Due
  var minDue = 0;
  var minDueMatch = fullText.match(/(?:min(?:imum)?\s+amount\s+due|min\s+due)\s*(?::|-)?\s*(?:Rs\.?|INR)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  if (minDueMatch && minDueMatch[1]) {
    minDue = parseFloat(minDueMatch[1].replace(/,/g, ''));
  }

  // Extract Payment Due Date
  var dueDate = "";
  var dueDateMatch = fullText.match(/(?:payment\s+due\s+date|due\s+date|pay\s+by|due\s+on)\s*(?::|-)?\s*([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{2,4})/i);
  if (dueDateMatch && dueDateMatch[1]) {
    dueDate = normalizeDateString(dueDateMatch[1].trim());
  }

  // Fallback: If no due date found, estimate based on statement date + 18 days
  if (!dueDate) {
    var d = new Date(msg.getDate());
    d.setDate(d.getDate() + 18);
    dueDate = formatDate(d);
  }

  return {
    card_name: cardName,
    statement_date: date,
    due_date: dueDate,
    total_due: totalDue,
    min_due: minDue,
    raw_subject: subject
  };
}

/**
 * Parse regular transaction email
 */
function parseTransactionEmail(msg) {
  var from = msg.getFrom().toLowerCase();
  var subject = msg.getSubject();
  var body = msg.getPlainBody();
  var date = formatDate(msg.getDate());

  var amount = extractAmount(subject + " " + body);
  if (!amount || amount <= 0) return null;

  var isCredit = /credited|received|refund|deposited/i.test(subject + " " + body) && !/debited|spent/i.test(subject);
  var account = detectAccount(from, subject, body);
  var merchant = detectMerchant(subject, body);
  var classification = autoClassify(merchant, isCredit, subject, body);

  return {
    date: date,
    transaction_type: classification.type,
    category: classification.category,
    amount: amount,
    description: merchant ? merchant : subject.substring(0, 50),
    account: account,
    status: classification.isKnown ? "approved" : "pending_review", // Hybrid auto-approval
    source: "gmail"
  };
}

function extractAmount(text) {
  var regex = /(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  var match = text.match(regex);
  if (match && match[1]) {
    var clean = match[1].replace(/,/g, '');
    return parseFloat(clean);
  }
  return 0;
}

function detectAccount(from, subject, body) {
  var text = (from + " " + subject + " " + body).toLowerCase();
  
  if (text.indexOf("amazon pay") !== -1 || (text.indexOf("icici") !== -1 && text.indexOf("amazon") !== -1)) {
    return "ICICI - Amazon Pay Credit Card";
  }
  if (text.indexOf("coral") !== -1) {
    return "ICICI - Coral Credit Card";
  }
  if (text.indexOf("american express") !== -1 || text.indexOf("amex") !== -1) {
    return "American Express Credit Card";
  }
  if (text.indexOf("pixel") !== -1) {
    return "HDFC - Pixel Play Credit Card";
  }
  if (text.indexOf("money back") !== -1 || text.indexOf("moneyback") !== -1) {
    return "HDFC - Money Back Plus Credit Card";
  }
  if (text.indexOf("roar") !== -1 || text.indexOf("rupay") !== -1) {
    return "Roar CC Rupay";
  }
  if (text.indexOf("kotak") !== -1) {
    return "Kotak Bank Account";
  }
  if (text.indexOf("hdfc") !== -1) {
    return "HDFC Bank Account";
  }
  return "HDFC Bank Account";
}

function detectMerchant(subject, body) {
  var text = subject + "\n" + body;
  var atMatch = text.match(/(?:at|to|info:)\s+([A-Za-z0-9\s\.\&\*\-]+?)(?:\s+on|\s+via|\s+using|\s+ref|\.|\n)/i);
  if (atMatch && atMatch[1] && atMatch[1].trim().length > 2) {
    return atMatch[1].trim().replace(/\s+/g, ' ').substring(0, 40);
  }
  return "";
}

/**
 * Intelligent Auto-Bifurcation + Known Merchant Verification
 */
function autoClassify(merchant, isCredit, subject, body) {
  var m = (merchant + " " + subject + " " + body).toLowerCase();

  // 1. CREDITS / INCOME
  if (isCredit) {
    if (m.indexOf("salary") !== -1 || m.indexOf("bismarck") !== -1) {
      return { type: "Income", category: "Paycheck (Bismarck Salary)", isKnown: true };
    }
    if (m.indexOf("dad") !== -1) {
      return { type: "Income", category: "Dad - Reimbursed", isKnown: true };
    }
    if (m.indexOf("kotak") !== -1) {
      return { type: "Income", category: "Kotak - Stock Proceeds", isKnown: true };
    }
    if (m.indexOf("surcharge") !== -1) {
      return { type: "Income", category: "Fuel Surcharge", isKnown: true };
    }
    return { type: "Income", category: "Other Income", isKnown: false };
  }

  // 2. CARD BILL PAYMENTS (Transfers)
  if (m.indexOf("bill payment") !== -1 || m.indexOf("cc payment") !== -1 || m.indexOf("card payment") !== -1) {
    if (m.indexOf("amazon") !== -1) return { type: "Transfer", category: "Card Bill Payment - ICICI - Amazon Pay", isKnown: true };
    if (m.indexOf("coral") !== -1) return { type: "Transfer", category: "Card Bill Payment - ICICI - Coral", isKnown: true };
    if (m.indexOf("amex") !== -1 || m.indexOf("american express") !== -1) return { type: "Transfer", category: "Card Bill Payment - American Express", isKnown: true };
    if (m.indexOf("pixel") !== -1) return { type: "Transfer", category: "Card Bill Payment - HDFC - Pixel Play", isKnown: true };
    if (m.indexOf("moneyback") !== -1) return { type: "Transfer", category: "Card Bill Payment - HDFC - Money Back Plus", isKnown: true };
    if (m.indexOf("roar") !== -1) return { type: "Transfer", category: "Card Bill Payment - Unity - Roar", isKnown: true };
  }

  // 3. DEBT & EMIs
  if (m.indexOf("l&t") !== -1 || m.indexOf("scooter") !== -1) return { type: "Debt", category: "Scooter Loan (L&T Finance)", isKnown: true };
  if (m.indexOf("watch emi") !== -1) return { type: "Debt", category: "Watch EMI", isKnown: true };
  if (m.indexOf("lenskart") !== -1) return { type: "Debt", category: "Lenskart EMI", isKnown: true };
  if (m.indexOf("flipkart emi") !== -1) return { type: "Debt", category: "Flipkart EMI", isKnown: true };
  if (m.indexOf("iphone") !== -1) return { type: "Debt", category: "iPhone 17 Pro EMI", isKnown: true };

  // 4. SAVINGS / INVESTMENTS
  if (m.indexOf("zerodha") !== -1 || m.indexOf("groww") !== -1 || m.indexOf("angel") !== -1 || m.indexOf("stocks") !== -1) {
    return { type: "Savings", category: "Stocks", isKnown: true };
  }
  if (m.indexOf("mutual fund") !== -1 || m.indexOf("sip") !== -1) {
    return { type: "Savings", category: "Mutual Funds", isKnown: true };
  }

  // 5. KNOWN VERIFIED EXPENSES (Auto-Approved)
  if (m.indexOf("swiggy") !== -1 || m.indexOf("zomato") !== -1 || m.indexOf("mcdonald") !== -1 || 
      m.indexOf("starbucks") !== -1 || m.indexOf("burger king") !== -1 || m.indexOf("domino") !== -1 || 
      m.indexOf("kfc") !== -1 || m.indexOf("restaurant") !== -1 || m.indexOf("cafe") !== -1 || 
      m.indexOf("chutney") !== -1 || m.indexOf("frankie") !== -1 || m.indexOf("juice") !== -1) {
    return { type: "Expense", category: "Food & Dining", isKnown: true };
  }

  if (m.indexOf("hpcl") !== -1 || m.indexOf("bpcl") !== -1 || m.indexOf("iocl") !== -1 || 
      m.indexOf("petrol") !== -1 || m.indexOf("fuel") !== -1 || m.indexOf("shell") !== -1) {
    return { type: "Expense", category: "Fuel", isKnown: true };
  }

  if (m.indexOf("blinkit") !== -1 || m.indexOf("zepto") !== -1 || m.indexOf("instamart") !== -1 || 
      m.indexOf("bigbasket") !== -1 || m.indexOf("dmart") !== -1) {
    return { type: "Expense", category: "Groceries", isKnown: true };
  }

  if (m.indexOf("spotify") !== -1 || m.indexOf("netflix") !== -1 || m.indexOf("bookmyshow") !== -1 || 
      m.indexOf("apple") !== -1 || m.indexOf("icloud") !== -1 || m.indexOf("prime video") !== -1 || 
      m.indexOf("youtube") !== -1) {
    return { type: "Expense", category: "Entertainment", isKnown: true };
  }

  if (m.indexOf("amazon") !== -1 || m.indexOf("flipkart") !== -1 || m.indexOf("myntra") !== -1 || 
      m.indexOf("ajio") !== -1 || m.indexOf("zara") !== -1) {
    return { type: "Expense", category: "Shopping", isKnown: true };
  }

  if (m.indexOf("uber") !== -1 || m.indexOf("ola") !== -1 || m.indexOf("rapido") !== -1 || 
      m.indexOf("irctc") !== -1 || m.indexOf("indigo") !== -1) {
    return { type: "Expense", category: "Transport", isKnown: true };
  }

  if (m.indexOf("recharge") !== -1 || m.indexOf("airtel") !== -1 || m.indexOf("jio") !== -1 || m.indexOf("vodafone") !== -1) {
    return { type: "Expense", category: "Mobile Recharge (own 2 numbers)", isKnown: true };
  }

  // Fallback: Needs review
  return { type: "Expense", category: "Other Expense", isKnown: false };
}

/**
 * Post regular transaction to Supabase
 */
function postToSupabase(transaction) {
  var url = CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/transactions";
  var options = {
    method: "POST",
    headers: {
      "apikey": CONFIG.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      "Prefer": "return=minimal"
    },
    payload: JSON.stringify(transaction),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  return (code >= 200 && code < 300);
}

/**
 * Post Card Bill Statement to Supabase card_bills & register pending bill payment
 */
function postCardBillToSupabase(bill) {
  // 1. Post to card_bills table
  var billsUrl = CONFIG.SUPABASE_URL.replace(/\/$/, "") + "/rest/v1/card_bills";
  var billRecord = {
    card_name: bill.card_name,
    statement_date: bill.statement_date,
    due_date: bill.due_date,
    total_due: bill.total_due,
    min_due: bill.min_due,
    is_paid: false,
    notes: bill.raw_subject ? bill.raw_subject.substring(0, 100) : "Captured from Gmail"
  };

  try {
    UrlFetchApp.fetch(billsUrl, {
      method: "POST",
      headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      payload: JSON.stringify(billRecord),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log("Notice: card_bills table write: " + e.toString());
  }

  // 2. Also register a notification intimation record in transactions pending review
  var catName = "Card Bill Payment - " + bill.card_name.replace(" Credit Card", "").trim();
  var intimationTx = {
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

  postToSupabase(intimationTx);
}

function formatDate(d) {
  var year = d.getFullYear();
  var month = ("0" + (d.getMonth() + 1)).slice(-2);
  var day = ("0" + d.getDate()).slice(-2);
  return year + "-" + month + "-" + day;
}

function normalizeDateString(str) {
  try {
    // E.g. "20-Oct-2026" or "20/10/2026" or "20-10-2026"
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
