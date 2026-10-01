// FRESH START SETUP - EFFECTIVE 1ST OCTOBER 2026
// Active transactions start clean from 1st October 2026 with customizable opening balances.
// Historical July-Sept transactions are preserved in window.ARCHIVED_DATA for reference.

window.INITIAL_DATA = {
  booksStartDate: "2026-10-01",
  activeMonth: "2026-10",
  transactions: [], // Fresh start: 0 active transactions!
  security: {
    defaultPin: "1234",
    pinHash: "ca1be9e2534f95e439dd905233c2cadf4be34117c0c9a790965f412ceb14ce23",
    pinSalt: "a1b2c3d4e5f60718293a4b5c6d7e8f90",
    pinEnabled: true,
    autoLockTimeout: "180000"
  },
  supabaseConfig: {
    url: "",
    anonKey: ""
  },
  accounts: [
    {
        "color":  "#004c8f",
        "name":  "HDFC Bank Account",
        "opening_balance":  25000,
        "type":  "Bank",
        "badge":  "Primary Salary \u0026 Debits"
    },
    {
        "color":  "#ed1c24",
        "name":  "Kotak Bank Account",
        "opening_balance":  10000,
        "type":  "Bank",
        "badge":  "Stock Investments \u0026 Liquidity"
    },
    {
        "color":  "#10b981",
        "name":  "Cash",
        "opening_balance":  1000,
        "type":  "Cash",
        "badge":  "Physical Cash in Hand"
    },
    {
        "opening_balance":  0,
        "name":  "American Express Credit Card",
        "color":  "#006fcf",
        "type":  "Credit Card",
        "billing_cycle_day":  8,
        "payment_due_day":  26,
        "payment_due_date":  "2026-10-26",
        "current_bill_amount":  0,
        "credit_limit":  360000
    },
    {
        "opening_balance":  0,
        "name":  "ICICI - Amazon Pay Credit Card",
        "color":  "#f59e0b",
        "type":  "Credit Card",
        "billing_cycle_day":  23,
        "payment_due_day":  12,
        "payment_due_date":  "2026-10-12",
        "current_bill_amount":  0,
        "credit_limit":  120000
    },
    {
        "opening_balance":  0,
        "name":  "ICICI - Coral Credit Card",
        "color":  "#ea580c",
        "type":  "Credit Card",
        "billing_cycle_day":  21,
        "payment_due_day":  10,
        "payment_due_date":  "2026-10-10",
        "current_bill_amount":  0,
        "credit_limit":  100000
    },
    {
        "opening_balance":  0,
        "name":  "Roar CC Rupay",
        "color":  "#8b5cf6",
        "type":  "Credit Card",
        "billing_cycle_day":  20,
        "payment_due_day":  9,
        "payment_due_date":  "2026-10-09",
        "current_bill_amount":  0,
        "credit_limit":  150000
    },
    {
        "opening_balance":  0,
        "name":  "HDFC - Money Back Plus Credit Card",
        "color":  "#1e40af",
        "type":  "Credit Card",
        "billing_cycle_day":  16,
        "payment_due_day":  5,
        "payment_due_date":  "2026-10-05",
        "current_bill_amount":  0,
        "credit_limit":  69000
    },
    {
        "opening_balance":  0,
        "name":  "HDFC - Pixel Play Credit Card",
        "color":  "#3b82f6",
        "type":  "Credit Card",
        "billing_cycle_day":  16,
        "payment_due_day":  5,
        "payment_due_date":  "2026-10-05",
        "current_bill_amount":  0,
        "credit_limit":  15000
    }
],
  personOpeningBalances: {
    "Anant":  0,
    "Bismarck":  0,
    "Dad":  0
},
  emiSchedule: [
    {
        "name":  "iPhone 17 Pro EMI",
        "monthly_emi":  11250,
        "original_amount":  135000,
        "card":  "ICICI - Coral Credit Card",
        "total_tenure":  12,
        "status":  "Active (Starts Oct 2026)",
        "months_remaining":  12
    },
    {
        "name":  "Watch EMI",
        "monthly_emi":  2894.67,
        "original_amount":  8418.07,
        "card":  "ICICI - Amazon Pay Credit Card",
        "total_tenure":  3,
        "status":  "Closed in Aug 2026",
        "months_remaining":  0
    },
    {
        "name":  "Scooter Loan (L\u0026T Finance)",
        "monthly_emi":  8265,
        "original_amount":  45000,
        "card":  "HDFC Bank Account",
        "total_tenure":  6,
        "status":  "Closed in July 2026",
        "months_remaining":  0
    }
],
  categories: [
    {
        "color":  "#10b981",
        "icon":  "briefcase",
        "name":  "Paycheck (Bismarck Salary)",
        "type":  "Income"
    },
    {
        "color":  "#059669",
        "icon":  "trending-up",
        "name":  "Kotak - Stock Proceeds",
        "type":  "Income"
    },
    {
        "color":  "#34d399",
        "icon":  "refresh-cw",
        "name":  "Dad - Reimbursed",
        "type":  "Income"
    },
    {
        "color":  "#6ee7b7",
        "icon":  "repeat",
        "name":  "Bismarck - Reimbursed",
        "type":  "Income"
    },
    {
        "color":  "#38bdf8",
        "icon":  "user-check",
        "name":  "Anant - Reimbursed",
        "type":  "Income"
    },
    {
        "color":  "#a7f3d0",
        "icon":  "percent",
        "name":  "Fuel Surcharge",
        "type":  "Income"
    },
    {
        "color":  "#047857",
        "icon":  "dollar-sign",
        "name":  "Other Income",
        "type":  "Income"
    },
    {
        "color":  "#f97316",
        "icon":  "utensils",
        "name":  "Food \u0026 Dining",
        "type":  "Expense"
    },
    {
        "color":  "#ea580c",
        "icon":  "fuel",
        "name":  "Fuel",
        "type":  "Expense"
    },
    {
        "color":  "#fb923c",
        "icon":  "shopping-cart",
        "name":  "Groceries",
        "type":  "Expense"
    },
    {
        "color":  "#f43f5e",
        "icon":  "shopping-bag",
        "name":  "Shopping",
        "type":  "Expense"
    },
    {
        "color":  "#ec4899",
        "icon":  "film",
        "name":  "Entertainment",
        "type":  "Expense"
    },
    {
        "color":  "#ef4444",
        "icon":  "heart-pulse",
        "name":  "Medical",
        "type":  "Expense"
    },
    {
        "color":  "#f59e0b",
        "icon":  "car",
        "name":  "Transport",
        "type":  "Expense"
    },
    {
        "color":  "#d97706",
        "icon":  "wrench",
        "name":  "Vehicle Maintenance",
        "type":  "Expense"
    },
    {
        "color":  "#84cc16",
        "icon":  "users",
        "name":  "Household Help / Local Vendors",
        "type":  "Expense"
    },
    {
        "color":  "#e11d48",
        "icon":  "heart",
        "name":  "Family Support (Mom)",
        "type":  "Expense"
    },
    {
        "color":  "#06b6d4",
        "icon":  "wifi",
        "name":  "Internet",
        "type":  "Expense"
    },
    {
        "color":  "#0ea5e9",
        "icon":  "smartphone",
        "name":  "Mobile Recharge (own 2 numbers)",
        "type":  "Expense"
    },
    {
        "color":  "#64748b",
        "icon":  "zap",
        "name":  "Electricity (Dad-reimbursed, not tracked)",
        "type":  "Expense"
    },
    {
        "color":  "#94a3b8",
        "icon":  "flame",
        "name":  "Gas (Dad-reimbursed, not tracked)",
        "type":  "Expense"
    },
    {
        "color":  "#3b82f6",
        "icon":  "shield-check",
        "name":  "Life Insurance",
        "type":  "Expense"
    },
    {
        "color":  "#2563eb",
        "icon":  "shield",
        "name":  "Health Insurance",
        "type":  "Expense"
    },
    {
        "color":  "#78716c",
        "icon":  "trash-2",
        "name":  "City Garbage",
        "type":  "Expense"
    },
    {
        "color":  "#a8a29e",
        "icon":  "credit-card",
        "name":  "Bank Charges",
        "type":  "Expense"
    },
    {
        "color":  "#8b5cf6",
        "icon":  "user-check",
        "name":  "Dad - Paid",
        "type":  "Expense"
    },
    {
        "color":  "#6366f1",
        "icon":  "building",
        "name":  "Bismarck - Paid",
        "type":  "Expense"
    },
    {
        "color":  "#38bdf8",
        "icon":  "user",
        "name":  "Anant - Paid",
        "type":  "Expense"
    },
    {
        "color":  "#6b7280",
        "icon":  "tag",
        "name":  "Other Expense",
        "type":  "Expense"
    },
    {
        "color":  "#4338ca",
        "icon":  "smartphone",
        "name":  "iPhone 17 Pro EMI",
        "type":  "Debt"
    },
    {
        "color":  "#dc2626",
        "icon":  "graduation-cap",
        "name":  "Education Loan (Sem1 Fee)",
        "type":  "Debt"
    },
    {
        "color":  "#b91c1c",
        "icon":  "truck",
        "name":  "Scooter Loan (L\u0026T Finance)",
        "type":  "Debt"
    },
    {
        "color":  "#991b1b",
        "icon":  "watch",
        "name":  "Watch EMI",
        "type":  "Debt"
    },
    {
        "color":  "#7f1d1d",
        "icon":  "glasses",
        "name":  "Lenskart EMI",
        "type":  "Debt"
    },
    {
        "color":  "#c2410c",
        "icon":  "package",
        "name":  "Flipkart EMI",
        "type":  "Debt"
    },
    {
        "color":  "#b45309",
        "icon":  "bike",
        "name":  "Bike EMI",
        "type":  "Debt"
    },
    {
        "color":  "#0284c7",
        "icon":  "book-open",
        "name":  "Semester 2 Fee Fund (due Nov)",
        "type":  "Savings"
    },
    {
        "color":  "#0369a1",
        "icon":  "life-buoy",
        "name":  "Emergency Fund",
        "type":  "Savings"
    },
    {
        "color":  "#075985",
        "icon":  "car",
        "name":  "Car Fund (long-term, post-wedding)",
        "type":  "Savings"
    },
    {
        "color":  "#15803d",
        "icon":  "line-chart",
        "name":  "Stocks",
        "type":  "Savings"
    },
    {
        "color":  "#166534",
        "icon":  "pie-chart",
        "name":  "Mutual Funds",
        "type":  "Savings"
    },
    {
        "color":  "#9333ea",
        "icon":  "gift",
        "name":  "Wedding Fund",
        "type":  "Savings"
    },
    {
        "color":  "#6366f1",
        "icon":  "arrow-right-left",
        "name":  "Internal Transfer (Between Accounts)",
        "type":  "Transfer"
    },
    {
        "color":  "#3b82f6",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - American Express",
        "type":  "Transfer"
    },
    {
        "color":  "#1d4ed8",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - HDFC - Money Back Plus",
        "type":  "Transfer"
    },
    {
        "color":  "#2563eb",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - HDFC - Pixel Play",
        "type":  "Transfer"
    },
    {
        "color":  "#f97316",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - ICICI - Amazon Pay",
        "type":  "Transfer"
    },
    {
        "color":  "#ea580c",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - ICICI - Coral",
        "type":  "Transfer"
    },
    {
        "color":  "#8b5cf6",
        "icon":  "credit-card",
        "name":  "Card Bill Payment - Unity - Roar",
        "type":  "Transfer"
    }
],
  defaultBudgets: [
    {
        "amount":  34439,
        "category":  "Paycheck (Bismarck Salary)",
        "type":  "Income"
    },
    {
        "amount":  2500,
        "category":  "Food \u0026 Dining",
        "type":  "Expense"
    },
    {
        "amount":  1800,
        "category":  "Fuel",
        "type":  "Expense"
    },
    {
        "amount":  700,
        "category":  "Vehicle Maintenance",
        "type":  "Expense"
    },
    {
        "amount":  2000,
        "category":  "Household Help / Local Vendors",
        "type":  "Expense"
    },
    {
        "amount":  426,
        "category":  "Groceries",
        "type":  "Expense"
    },
    {
        "amount":  647,
        "category":  "Shopping",
        "type":  "Expense"
    },
    {
        "amount":  500,
        "category":  "Medical",
        "type":  "Expense"
    },
    {
        "amount":  3500,
        "category":  "Family Support (Mom)",
        "type":  "Expense"
    },
    {
        "amount":  671,
        "category":  "Mobile Recharge (own 2 numbers)",
        "type":  "Expense"
    },
    {
        "amount":  500,
        "category":  "Emergency Fund",
        "type":  "Savings"
    },
    {
        "amount":  11250,
        "category":  "iPhone 17 Pro EMI",
        "type":  "Debt"
    }
],
  rollovers: {
    "2026-10": 25000.00,
    "2026-11": 0.00,
    "2026-12": 0.00
  }
};

// Historical Excel backup preserved safely
window.ARCHIVED_DATA = {
  transactions: [
    {
        "id":  "tx_0001",
        "date":  "2026-07-01",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  209,
        "description":  "I-cloud Storage",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0002",
        "date":  "2026-07-02",
        "transaction_type":  "Expense",
        "category":  "Scooter Loan (L\u0026T Finance)",
        "amount":  8265,
        "description":  "paid",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0003",
        "date":  "2026-07-05",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  819,
        "description":  "Chutney plus",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0004",
        "date":  "2026-07-05",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  220,
        "description":  "Kotak",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0005",
        "date":  "2026-07-05",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  2000,
        "description":  "Drashan",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0006",
        "date":  "2026-07-06",
        "transaction_type":  "Expense",
        "category":  "Groceries",
        "amount":  80,
        "description":  "Rahul Kumar",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0007",
        "date":  "2026-07-06",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Amazon Pay",
        "amount":  6059.98,
        "description":  "partial",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0008",
        "date":  "2026-07-06",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  139,
        "description":  "spotify",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0009",
        "date":  "2026-07-07",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  200,
        "description":  "Prem",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0010",
        "date":  "2026-07-07",
        "transaction_type":  "Income",
        "category":  "Paycheck (Bismarck Salary)",
        "amount":  34414,
        "description":  "yeeh",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0011",
        "date":  "2026-07-08",
        "transaction_type":  "Expense",
        "category":  "Household Help / Local Vendors",
        "amount":  144,
        "description":  "Tejas for Eshaan Cake",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0012",
        "date":  "2026-07-08",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  70,
        "description":  "Frankie - Suraj Kumar Jaiswal",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0013",
        "date":  "2026-07-08",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  1200,
        "description":  "Stock closure at loss",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0014",
        "date":  "2026-07-08",
        "transaction_type":  "Expense",
        "category":  "Family Support (Mom)",
        "amount":  3500,
        "description":  "From Cash Withdrawal",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0015",
        "date":  "2026-07-08",
        "transaction_type":  "Expense",
        "category":  "Household Help / Local Vendors",
        "amount":  2000,
        "description":  "From Cash Withdrawal",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0016",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - American Express",
        "amount":  1216,
        "description":  "Full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0017",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - HDFC - Money Back Plus",
        "amount":  773,
        "description":  "Full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0018",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  1544.05,
        "description":  "Train Ticket Mumbai Central to Surat",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0019",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  10,
        "description":  "Ghatkopar to Mumbai Central ticket",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0020",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  114,
        "description":  "Lunch",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0021",
        "date":  "2026-07-14",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  6500,
        "description":  "Taxi in Surat",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0022",
        "date":  "2026-07-14",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  1200,
        "description":  "Hotel Dimple",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0023",
        "date":  "2026-07-15",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  209,
        "description":  "Hotel to Warehouse auto",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0024",
        "date":  "2026-07-15",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  200,
        "description":  "Lunch",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0025",
        "date":  "2026-07-15",
        "transaction_type":  "Expense",
        "category":  "Groceries",
        "amount":  105,
        "description":  "Local ticket Surat to Mumbai",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0026",
        "date":  "2026-07-15",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  2050,
        "description":  "Train Ticket Surat to Mumbai Central",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0027",
        "date":  "2026-07-17",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  5500,
        "description":  "Cash Withdrawal",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0028",
        "date":  "2026-07-18",
        "transaction_type":  "Income",
        "category":  "Dad - Paid",
        "amount":  30000,
        "description":  "Full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0029",
        "date":  "2026-07-18",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  1000,
        "description":  "Darshan",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0030",
        "date":  "2026-07-18",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Coral",
        "amount":  22970.6,
        "description":  "Full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0031",
        "date":  "2026-07-18",
        "transaction_type":  "Income",
        "category":  "Bismarck - Reimbursed",
        "amount":  1000,
        "description":  "Loan",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0032",
        "date":  "2026-07-19",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Amazon Pay",
        "amount":  30000,
        "description":  "Final and Full Payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0033",
        "date":  "2026-07-22",
        "transaction_type":  "Income",
        "category":  "Bismarck - Reimbursed",
        "amount":  13444.46,
        "description":  "Full Clear",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0034",
        "date":  "2026-07-22",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  1000,
        "description":  "System.Xml.XmlElement",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0035",
        "date":  "2026-07-17",
        "transaction_type":  "Expense",
        "category":  "Household Help / Local Vendors",
        "amount":  1700,
        "description":  "Spaa",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0036",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  408,
        "description":  "Sbarro",
        "account":  "American Express Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0037",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  808,
        "description":  "Zudio",
        "account":  "American Express Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0038",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  1175.41,
        "description":  "Agoda Saty Surat",
        "account":  "American Express Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0039",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  498.99,
        "description":  "Wow Momo Airport",
        "account":  "American Express Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0040",
        "date":  "2026-07-24",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  799,
        "description":  "Mobile Recharge 9137741396",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0041",
        "date":  "2026-07-24",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  5000,
        "description":  "Food",
        "account":  "American Express Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0042",
        "date":  "2026-07-24",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  390,
        "description":  "Frankie 2",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0043",
        "date":  "2026-07-25",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  470,
        "description":  "System.Xml.XmlElement",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0044",
        "date":  "2026-07-25",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  700,
        "description":  "Pen for Mamu",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0045",
        "date":  "2026-07-25",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  100,
        "description":  "Boba",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0046",
        "date":  "2026-07-25",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  149.01,
        "description":  "MC Donalds",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0047",
        "date":  "2026-07-25",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  218.82,
        "description":  "MC Donalds",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0048",
        "date":  "2026-07-27",
        "transaction_type":  "Expense",
        "category":  "Medical",
        "amount":  406,
        "description":  "Posture corrector",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0049",
        "date":  "2026-07-27",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  809,
        "description":  "Shivraj Shopping By Daksha",
        "account":  "HDFC - Pixel Play Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0050",
        "date":  "2026-07-13",
        "transaction_type":  "Expense",
        "category":  "Bismarck - Paid",
        "amount":  442,
        "description":  "Home to Ghatkopar Station Auto,Surat station to Hotel Auto, Montessa to Surat Station Auto,Andheri to Ghatkopar Metro",
        "account":  "Cash",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0051",
        "date":  "2026-07-29",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - American Express",
        "amount":  1674.4,
        "description":  "Full Clear to reduce the credit reliance",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0052",
        "date":  "2026-07-29",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - HDFC - Pixel Play",
        "amount":  809,
        "description":  "Cleared to rely low on cards",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0053",
        "date":  "2026-07-29",
        "transaction_type":  "Savings",
        "category":  "Emergency Fund",
        "amount":  500,
        "description":  "Savings for emergency Fund in Kotak",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0054",
        "date":  "2026-08-02",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  199,
        "description":  "Netflix Monthly",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0055",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  199,
        "description":  "Netflix Monthly Charge",
        "account":  "HDFC - Pixel Play Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0056",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Watch EMI",
        "amount":  2894.67,
        "description":  "Watch EMI Interest - 75.27, Principal - 2805.86, CGST - 6.77, SGST - 6.77",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0057",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  -2569.05,
        "description":  "Refund in card due to undeliverability",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0058",
        "date":  "2026-07-29",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  65,
        "description":  "Lunch",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0059",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  20,
        "description":  "Metro to Office",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0060",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  30,
        "description":  "Metro Return to Home from office",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0061",
        "date":  "2026-07-30",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  469.49,
        "description":  "Ravi Fuel",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0062",
        "date":  "2026-07-24",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  239,
        "description":  "Blinkit",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0063",
        "date":  "2026-07-24",
        "transaction_type":  "Expense",
        "category":  "Lenskart EMI",
        "amount":  725.8,
        "description":  "Earbuds EMI Last",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0064",
        "date":  "2026-08-02",
        "transaction_type":  "Income",
        "category":  "Entertainment",
        "amount":  219,
        "description":  "Apple refund",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0065",
        "date":  "2026-08-03",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  3000,
        "description":  "Returned in cash",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0066",
        "date":  "2026-08-03",
        "transaction_type":  "Income",
        "category":  "Dad - Reimbursed",
        "amount":  3000,
        "description":  "In cash",
        "account":  "Cash",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0067",
        "date":  "2026-08-06",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  139,
        "description":  "Spotify auto pay",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0068",
        "date":  "2026-08-07",
        "transaction_type":  "Income",
        "category":  "Paycheck (Bismarck Salary)",
        "amount":  34819,
        "description":  "System.Xml.XmlElement",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0069",
        "date":  "2026-08-08",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Coral",
        "amount":  8283.28,
        "description":  "Full payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0070",
        "date":  "2026-08-09",
        "transaction_type":  "Expense",
        "category":  "Family Support (Mom)",
        "amount":  3500,
        "description":  "Full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0071",
        "date":  "2026-08-10",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  1200,
        "description":  "Paid for me and Vaid to Shreya for T shirt",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0072",
        "date":  "2026-08-10",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  2,
        "description":  "Gpay cashback",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0073",
        "date":  "2026-08-11",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  2,
        "description":  "Gpay Cashback",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0074",
        "date":  "2026-08-12",
        "transaction_type":  "Expense",
        "category":  "Groceries",
        "amount":  70.8,
        "description":  "Bank Charges for Cheque book issue",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0075",
        "date":  "2026-08-02",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  75,
        "description":  "Apple Media",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0076",
        "date":  "2026-08-02",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  200,
        "description":  "Amazon Wallet Recharge",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0077",
        "date":  "2026-08-06",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  1080,
        "description":  "Movie with Anu",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0078",
        "date":  "2026-08-06",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  195,
        "description":  "Wax",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0079",
        "date":  "2026-08-07",
        "transaction_type":  "Expense",
        "category":  "Mobile Recharge (own 2 numbers)",
        "amount":  899,
        "description":  "Recharge for 9029038088",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0080",
        "date":  "2026-08-08",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  1499,
        "description":  "Amazon Prime Annual Subscription",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0081",
        "date":  "2026-08-08",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  2030,
        "description":  "Electricity Bill",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0082",
        "date":  "2026-08-09",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  699,
        "description":  "Paid for Anant\u0027s Bottle. He gave in cash 650",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0083",
        "date":  "2026-08-09",
        "transaction_type":  "Income",
        "category":  "Kotak",
        "amount":  650,
        "description":  "Anant paid for Bottle",
        "account":  "Cash",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0084",
        "date":  "2026-08-09",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  1903,
        "description":  "Pendrive for Dhruv and Anu",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0085",
        "date":  "2026-08-11",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  190,
        "description":  "Kitchen Mat for wet utensils",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0086",
        "date":  "2026-08-12",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  3123,
        "description":  "From 01 to 12 all food expenses",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0087",
        "date":  "2026-08-02",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  2345,
        "description":  "headphones from flipkar Minutes",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0088",
        "date":  "2026-08-09",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  1903,
        "description":  "Pendrive for me and Anu",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0089",
        "date":  "2026-09-12",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  11179.56,
        "description":  "Mattress EMI payment with Interest and GST =38.90+38.90+10669.54+432.22",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0090",
        "date":  "2026-08-16",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  490,
        "description":  "Spare fuel",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0091",
        "date":  "2026-08-17",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  510,
        "description":  "La Pinos",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0092",
        "date":  "2026-08-17",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1133,
        "description":  "12th to 17th food and Dining",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0093",
        "date":  "2026-08-13",
        "transaction_type":  "Savings",
        "category":  "Stocks",
        "amount":  1000,
        "description":  "LenDen invested 1500",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0094",
        "date":  "2026-08-15",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  950,
        "description":  "Dress And Fruit or Pooja",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0095",
        "date":  "2026-08-19",
        "transaction_type":  "Income",
        "category":  "Bismarck - Reimbursed",
        "amount":  17000,
        "description":  "Given in cash and deposited by Dhruv",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0096",
        "date":  "2026-08-19",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Amazon Pay",
        "amount":  32012.04,
        "description":  "Paid in full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0097",
        "date":  "2026-08-19",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - HDFC - Money Back Plus",
        "amount":  1918,
        "description":  "Full payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0098",
        "date":  "2026-08-21",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  8360,
        "description":  "Dress for Anu",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0099",
        "date":  "2026-08-12",
        "transaction_type":  "Expense",
        "category":  "Household Help / Local Vendors",
        "amount":  70.79,
        "description":  "Bank Charges for Cheque Book",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0100",
        "date":  "2026-08-20",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  410,
        "description":  "Gulati",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0101",
        "date":  "2026-08-23",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  2791,
        "description":  "Party to Ved and Prem",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0102",
        "date":  "2026-08-22",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1263,
        "description":  "Food till 22-08-2026",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0103",
        "date":  "2026-08-24",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1280,
        "description":  "Sweets for Office",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0104",
        "date":  "2026-08-25",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1014.68,
        "description":  "Food Till 24-08-2026",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0105",
        "date":  "2026-08-26",
        "transaction_type":  "Income",
        "category":  "Paycheck (Bismarck Salary)",
        "amount":  2886,
        "description":  "Salary arier",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0106",
        "date":  "2026-08-27",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  400,
        "description":  "Jeeja Mam",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0107",
        "date":  "2026-08-28",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  720,
        "description":  "Think Juice",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0108",
        "date":  "2026-08-27",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  418.04,
        "description":  "Airport Road Indian Oil",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0109",
        "date":  "2026-08-31",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1694.86,
        "description":  "Food \u0026 Dining",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0110",
        "date":  "2026-08-30",
        "transaction_type":  "Debt",
        "category":  "Watch EMI",
        "amount":  2887.96,
        "description":  "completed",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0111",
        "date":  "2026-08-31",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  75,
        "description":  "Apple Cloud",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0112",
        "date":  "2026-08-31",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1336,
        "description":  "inculdes cash expenses of Raksha bandhan night Food payment and other weekly expenses",
        "account":  "Cash",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0113",
        "date":  "2026-08-31",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  859,
        "description":  "9323880606 Recharge",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0114",
        "date":  "2026-08-30",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  199,
        "description":  "Netflix",
        "account":  "HDFC - Pixel Play Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0115",
        "date":  "2026-09-07",
        "transaction_type":  "Income",
        "category":  "Paycheck (Bismarck Salary)",
        "amount":  35401,
        "description":  "full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0116",
        "date":  "2026-09-03",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  199,
        "description":  "Netflix",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0117",
        "date":  "2026-09-03",
        "transaction_type":  "Expense",
        "category":  "Entertainment",
        "amount":  139,
        "description":  "Spotify",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0118",
        "date":  "2026-09-07",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  350,
        "description":  "Heena Parween",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0119",
        "date":  "2026-09-08",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  500,
        "description":  "Abhishek Santosh Kumar",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0120",
        "date":  "2026-09-08",
        "transaction_type":  "Expense",
        "category":  "Family Support (Mom)",
        "amount":  5000,
        "description":  "Increase from 3500",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0121",
        "date":  "2026-09-08",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  1500,
        "description":  "Cash withdrawal",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0122",
        "date":  "2026-09-09",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Coral",
        "amount":  9059.24,
        "description":  "Full Payment was 9144 difference paid by cheq points",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0123",
        "date":  "2026-09-11",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  480,
        "description":  "Dinner Pizza and sandwich",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0124",
        "date":  "2026-09-13",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - Unity - Roar",
        "amount":  3127.9,
        "description":  "full payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0125",
        "date":  "2026-09-09",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  2260,
        "description":  "Electricity Bill",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0126",
        "date":  "2026-09-08",
        "transaction_type":  "Income",
        "category":  "Food \u0026 Dining",
        "amount":  1500,
        "description":  "withdrawal",
        "account":  "Cash",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0127",
        "date":  "2026-09-03",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  459.37,
        "description":  "ravi",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0128",
        "date":  "2026-09-09",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  1125,
        "description":  "metro pass",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0129",
        "date":  "2026-09-10",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  452.79,
        "description":  "Ravi",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0130",
        "date":  "2026-09-13",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  2467.22,
        "description":  "Till 13the September",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0131",
        "date":  "2026-09-12",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  1973.2,
        "description":  "System.Xml.XmlElement",
        "account":  "HDFC - Money Back Plus Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0132",
        "date":  "2026-09-16",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  1800,
        "description":  "Pest control",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0133",
        "date":  "2026-09-17",
        "transaction_type":  "Income",
        "category":  "Dad - Reimbursed",
        "amount":  10000,
        "description":  "Part payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0134",
        "date":  "2026-09-16",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - HDFC - Money Back Plus",
        "amount":  1964,
        "description":  "full paid",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0135",
        "date":  "2026-09-16",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Amazon Pay",
        "amount":  13310,
        "description":  "part payment",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0136",
        "date":  "2026-09-18",
        "transaction_type":  "Income",
        "category":  "Dad - Reimbursed",
        "amount":  10000,
        "description":  "part",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0137",
        "date":  "2026-09-19",
        "transaction_type":  "Expense",
        "category":  "Card Bill Payment - ICICI - Amazon Pay",
        "amount":  19821.52,
        "description":  "full",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0138",
        "date":  "2026-09-15",
        "transaction_type":  "Income",
        "category":  "Food \u0026 Dining",
        "amount":  590,
        "description":  "Jeeja Mam",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0139",
        "date":  "2026-09-20",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  70,
        "description":  "Sabudana Khicdi",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0140",
        "date":  "2026-09-20",
        "transaction_type":  "Expense",
        "category":  "Vehicle Maintenance",
        "amount":  100,
        "description":  "Scooty Wash",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0141",
        "date":  "2026-09-20",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  4027.04,
        "description":  "System.Xml.XmlElement",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0142",
        "date":  "2026-09-17",
        "transaction_type":  "Expense",
        "category":  "Vehicle Maintenance",
        "amount":  1234,
        "description":  "Vehicle Insurance",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0143",
        "date":  "2026-09-16",
        "transaction_type":  "Expense",
        "category":  "Fuel",
        "amount":  418.6,
        "description":  "Novotel",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0144",
        "date":  "2026-09-12",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  429,
        "description":  "upper crust",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0145",
        "date":  "2026-09-22",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  320,
        "description":  "21 \u0026 22 Roar Bank",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0146",
        "date":  "2026-09-21",
        "transaction_type":  "Expense",
        "category":  "Medical",
        "amount":  1299,
        "description":  "Unhype kit",
        "account":  "Roar CC Rupay",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0147",
        "date":  "2026-09-23",
        "transaction_type":  "Expense",
        "category":  "Medical",
        "amount":  200,
        "description":  "Harshad Chandra",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0148",
        "date":  "2026-09-26",
        "transaction_type":  "Income",
        "category":  "Food \u0026 Dining",
        "amount":  2000,
        "description":  "See off and Birthday party Prem Paid balance from Jeeja Mam to be recieved",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0149",
        "date":  "2026-09-28",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  30,
        "description":  "Balance for Blachandra bharti book",
        "account":  "HDFC Bank Account",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0150",
        "date":  "2026-09-21",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  584,
        "description":  "Blinkit",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0151",
        "date":  "2026-09-25",
        "transaction_type":  "Expense",
        "category":  "Shopping",
        "amount":  287,
        "description":  "Head Mask Blink it",
        "account":  "ICICI - Coral Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0152",
        "date":  "2026-09-25",
        "transaction_type":  "Expense",
        "category":  "Food \u0026 Dining",
        "amount":  8058,
        "description":  "See off and Birthday Party (Jeeja 7 Prem)",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    },
    {
        "id":  "tx_0153",
        "date":  "2026-09-30",
        "transaction_type":  "Expense",
        "category":  "Dad - Paid",
        "amount":  799,
        "description":  "9.029098088E9",
        "account":  "ICICI - Amazon Pay Credit Card",
        "status":  "approved",
        "source":  "excel_import"
    }
]

};
