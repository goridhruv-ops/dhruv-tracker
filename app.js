/**
 * ==============================================================================
 * DHRUV GORI BUDGET TRACKER - COMPLETE APPLICATION LOGIC
 * Implements Fresh Start (1st October 2026) & Books of Accounts Setup
 * ==============================================================================
 */

function cleanSupabaseUrl(rawUrl) {
  if (!rawUrl) return "";
  return String(rawUrl).trim().replace(/\/rest\/v1\/?$/i, "").replace(/\/+$/, "");
}

// Global Application State
const State = {
  booksStartDate: localStorage.getItem("tracker_books_start_date") || (window.INITIAL_DATA ? window.INITIAL_DATA.booksStartDate : "2026-10-01"),
  activeMonth: localStorage.getItem("tracker_active_month") || (window.INITIAL_DATA ? window.INITIAL_DATA.activeMonth : "2026-10"),
  transactions: [],
  categories: [],
  accounts: [],
  personOpeningBalances: {},
  emiSchedule: [],
  defaultBudgets: [],
  rollovers: {},
  supabase: null,
  supabaseConfig: {
    url: cleanSupabaseUrl(localStorage.getItem("tracker_sb_url") || (window.INITIAL_DATA && window.INITIAL_DATA.supabaseConfig && window.INITIAL_DATA.supabaseConfig.url) || ""),
    key: String(localStorage.getItem("tracker_sb_key") || (window.INITIAL_DATA && window.INITIAL_DATA.supabaseConfig && (window.INITIAL_DATA.supabaseConfig.anonKey || window.INITIAL_DATA.supabaseConfig.key)) || "").trim()
  },
  geminiApiKey: localStorage.getItem("tracker_gemini_key") || "",
  charts: {
    categoryDoughnut: null,
    cashflowBar: null
  },
  editingTxId: null,
  notifications: [],
  notificationThreshold: parseFloat(localStorage.getItem("tracker_notif_threshold")) || 70,
  dismissedNotifs: JSON.parse(localStorage.getItem("tracker_dismissed_notifs") || "[]"),
  cardBills: JSON.parse(localStorage.getItem("tracker_card_bills") || "{}"),
  activeNotifFilter: "all",
  isSmartBannerDismissed: sessionStorage.getItem("tracker_banner_dismissed") === "true",
  themeMode: localStorage.getItem("tracker_theme_mode") || "system", // 'system' | 'dark' | 'light'
  security: {
    pinEnabled: localStorage.getItem("tracker_pin_enabled") !== "false",
    pinHash: localStorage.getItem("tracker_pin_hash") || (window.INITIAL_DATA?.security?.pinHash || "ca1be9e2534f95e439dd905233c2cadf4be34117c0c9a790965f412ceb14ce23"),
    pinSalt: localStorage.getItem("tracker_pin_salt") || (window.INITIAL_DATA?.security?.pinSalt || "a1b2c3d4e5f60718293a4b5c6d7e8f90"),
    autoLockTimeout: localStorage.getItem("tracker_autolock_timeout") || "180000",
    isLocked: false,
    activePinBuffer: "",
    inMemoryKey: null,
    privacyMode: localStorage.getItem("tracker_privacy_mode") === "true"
  },
  cardVaultView: localStorage.getItem("tracker_card_vault_view") || "deck", // 'deck' | 'table'
  decryptedVault: {}, // in-memory decrypted card credentials: { [cardName]: { cardNumber, expiry, cvv, pin, holderName, notes } }
  chatHistory: [
    { sender: "assistant", text: "👋 Hi Dhruv! Your Books of Accounts are configured for a fresh start from **1st October 2026**. Ask me about bank balances, tell me to log an expense, or transfer funds!" }
  ]
};

// Known Merchant Classification Rules (Hybrid Rule)
const MERCHANT_RULES = [
  { match: ["swiggy", "zomato", "mcdonald", "mc donald", "starbucks", "burger king", "domino", "kfc", "subway", "haldiram", "restaurant", "cafe", "chutney", "frankie", "juice", "pastry", "cake", "dining", "eats", "lunch", "dinner", "pizza"], type: "Expense", category: "Food & Dining", isKnown: true },
  { match: ["recharge", "airtel", "jio", "vodafone", "vi ", "bsnl"], type: "Expense", category: "Mobile Recharge (own 2 numbers)", isKnown: true },
  { match: ["broadband", "wifi", "act fibernet"], type: "Expense", category: "Internet", isKnown: true },
  { match: ["hpcl", "bpcl", "iocl", "petrol", "fuel", "shell", "indian oil", "bharat petroleum", "cng"], type: "Expense", category: "Fuel", isKnown: true },
  { match: ["blinkit", "zepto", "instamart", "bigbasket", "dmart", "grocer", "supermarket", "reliance fresh"], type: "Expense", category: "Groceries", isKnown: true },
  { match: ["spotify", "netflix", "bookmyshow", "apple", "icloud", "prime video", "youtube", "hotstar", "cinema", "movie", "pvr", "inox"], type: "Expense", category: "Entertainment", isKnown: true },
  { match: ["amazon", "flipkart", "myntra", "ajio", "zara", "h&m", "uniqlo", "nykaa", "tata cliq", "meesho"], type: "Expense", category: "Shopping", isKnown: true },
  { match: ["apollo", "pharmeasy", "1mg", "hospital", "clinic", "pharmacy", "medical", "doctor", "health", "netmeds"], type: "Expense", category: "Medical", isKnown: true },
  { match: ["uber", "ola", "rapido", "irctc", "railway", "train", "flight", "indigo", "akasa", "fastag", "toll plaza", "toll booth"], type: "Expense", category: "Transport", isKnown: true },
  { match: ["card bill payment", "cc payment", "credit card payment", "credit card bill"], type: "Transfer", category: "Card Bill Payment - ICICI - Amazon Pay", isKnown: true },
  { match: ["emi", "loan", "installment"], type: "Debt", category: "Loan / EMI Payment", isKnown: true },
  { match: ["zerodha", "groww", "angel", "stocks", "upstox"], type: "Savings", category: "Stocks", isKnown: true },
  { match: ["mutual fund", "sip", "uti", "hdfc mf", "nippon"], type: "Savings", category: "Mutual Funds", isKnown: true },
  { match: ["salary", "paycheck", "bismarck salary", "payroll"], type: "Income", category: "Paycheck (Bismarck Salary)", isKnown: true }
];

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", async () => {
  initTheme();
  initPrivacyMode();
  initSupabase();
  await initSecurity();
  await loadData();
  setupEventListeners();
  populateMonthFilter();
  renderApp();
  if (window.lucide) {
    lucide.createIcons();
  }
});

// Adaptive System & Manual Theme Engine
function initTheme() {
  const savedMode = State.themeMode;
  applyTheme(savedMode);

  // Dynamically listen to device OS theme changes
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (State.themeMode === "system") {
        applyTheme("system");
      }
    });
  }
}

function cycleTheme() {
  const current = State.themeMode;
  let next = "dark";
  if (current === "system") next = "dark";
  else if (current === "dark") next = "light";
  else next = "system";

  State.themeMode = next;
  localStorage.setItem("tracker_theme_mode", next);
  applyTheme(next);
  showToast(`Theme: ${next === "system" ? "Auto (Device Mode)" : next === "dark" ? "Dark Mode" : "Light Mode"}`);
}

function applyTheme(mode) {
  let effective = mode;
  if (mode === "system") {
    effective = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", effective);
  updateThemeIcon(mode, effective);
  if (typeof renderCharts === "function") renderCharts();
}

function updateThemeIcon(mode) {
  const btn = document.getElementById("themeToggleBtn");
  if (!btn) return;
  if (mode === "system") btn.innerHTML = `<i data-lucide="sun-moon" style="width:16px;height:16px;"></i>`;
  else if (mode === "dark") btn.innerHTML = `<i data-lucide="moon" style="width:16px;height:16px;"></i>`;
  else btn.innerHTML = `<i data-lucide="sun" style="width:16px;height:16px;"></i>`;
  if (window.lucide) {
    lucide.createIcons();
  }
}

// Privacy Blur Engine ("Coffee Shop Mode")
function initPrivacyMode() {
  if (State.security.privacyMode) {
    document.documentElement.setAttribute("data-privacy", "true");
    const btn = document.getElementById("privacyToggleBtn");
    if (btn) {
      btn.innerHTML = `<i data-lucide="eye-off" style="width:16px;height:16px;"></i>`;
      if (window.lucide) {
        lucide.createIcons();
      }
    }
  }

  window.addEventListener("keydown", (e) => {
    if (e.shiftKey && (e.key === "P" || e.key === "p")) {
      e.preventDefault();
      togglePrivacyMode();
    }
  });
}

function togglePrivacyMode() {
  const current = document.documentElement.getAttribute("data-privacy") === "true";
  const next = !current;
  document.documentElement.setAttribute("data-privacy", next ? "true" : "false");
  State.security.privacyMode = next;
  localStorage.setItem("tracker_privacy_mode", next ? "true" : "false");
  const btn = document.getElementById("privacyToggleBtn");
  if (btn) {
    btn.innerHTML = next 
      ? `<i data-lucide="eye-off" style="width:16px;height:16px;"></i>` 
      : `<i data-lucide="eye" style="width:16px;height:16px;"></i>`;
    if (window.lucide) {
      lucide.createIcons();
    }
  }
  showToast(next ? "Privacy Blur Activated (Public Mode)" : "Privacy Blur Disabled");
}

let realtimeChannel = null;

function setupSupabaseRealtime() {
  if (!State.supabase) return;
  if (realtimeChannel) {
    try { State.supabase.removeChannel(realtimeChannel); } catch (e) {}
  }

  try {
    realtimeChannel = State.supabase
      .channel("public-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        console.log("⚡ Realtime: transaction changed in Supabase cloud", payload);
        loadData().then(() => renderApp());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "settings" }, (payload) => {
        console.log("⚡ Realtime: settings changed in Supabase cloud", payload);
        loadData().then(() => renderApp());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "card_bills" }, (payload) => {
        console.log("⚡ Realtime: card_bills changed in Supabase cloud", payload);
        loadData().then(() => renderApp());
      })
      .subscribe((status) => {
        console.log("Supabase Realtime channel status:", status);
      });
  } catch (err) {
    console.warn("Could not attach Supabase Realtime channel:", err);
  }
}

// Supabase Initialization
function initSupabase() {
  let { url, key } = State.supabaseConfig;
  url = cleanSupabaseUrl(url);
  key = (key || "").trim();
  State.supabaseConfig.url = url;
  State.supabaseConfig.key = key;

  const statusEl = document.getElementById("syncStatusBadge");
  
  if (url && key && window.supabase) {
    try {
      State.supabase = window.supabase.createClient(url, key);
      if (statusEl) {
        statusEl.className = "badge";
        statusEl.style.background = "var(--income)";
        statusEl.style.color = "#fff";
        statusEl.innerHTML = "● Supabase Connected";
      }
      setupSupabaseRealtime();
      return true;
    } catch (e) {
      console.error("Supabase init error:", e);
    }
  }

  if (statusEl) {
    statusEl.className = "badge";
    statusEl.style.background = "var(--warning)";
    statusEl.style.color = "#fff";
    statusEl.innerHTML = "● Local Mode";
  }
  return false;
}

// Load Data with Full Cloud Synchronization
async function loadData() {
  const localSaved = localStorage.getItem("tracker_transactions");

  // 1. Synchronize Books Setup (Start Date, Opening Balances, Person Balances) from Supabase
  if (State.supabase) {
    try {
      const { data: bsData, error: bsErr } = await State.supabase
        .from("settings")
        .select("value")
        .eq("key", "books_setup")
        .maybeSingle();

      if (!bsErr && bsData && bsData.value) {
        const val = bsData.value;
        if (val.startDate) {
          State.booksStartDate = val.startDate;
          localStorage.setItem("tracker_books_start_date", val.startDate);
        }
        if (val.accOpenings) {
          localStorage.setItem("tracker_account_openings", JSON.stringify(val.accOpenings));
        }
        if (val.personOpenings) {
          State.personOpeningBalances = { ...State.personOpeningBalances, ...val.personOpenings };
          localStorage.setItem("tracker_person_opening_balances", JSON.stringify(State.personOpeningBalances));
        }
        if (val.rollovers) {
          State.rollovers = { ...State.rollovers, ...val.rollovers };
          localStorage.setItem("tracker_rollovers", JSON.stringify(State.rollovers));
        }
      } else if (!bsErr && (!bsData || !bsData.value)) {
        // Seed local books setup to Supabase if not yet configured in cloud
        const localStartDate = localStorage.getItem("tracker_books_start_date") || State.booksStartDate;
        const localAccOpenings = localStorage.getItem("tracker_account_openings") ? JSON.parse(localStorage.getItem("tracker_account_openings")) : null;
        const localPersonOpenings = localStorage.getItem("tracker_person_opening_balances") ? JSON.parse(localStorage.getItem("tracker_person_opening_balances")) : null;
        const localRollovers = localStorage.getItem("tracker_rollovers") ? JSON.parse(localStorage.getItem("tracker_rollovers")) : State.rollovers;
        if (localAccOpenings || localStartDate || localRollovers) {
          await State.supabase.from("settings").upsert({
            key: "books_setup",
            value: {
              startDate: localStartDate,
              accOpenings: localAccOpenings || {},
              personOpenings: localPersonOpenings || {},
              rollovers: localRollovers || {},
              updatedAt: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          }, { onConflict: "key" });
        }
      }
    } catch (e) {
      console.warn("Books setup cloud sync notice:", e);
    }
  }

  // 2. Synchronize Transactions from Supabase
  if (State.supabase) {
    try {
      const { data: txs, error } = await State.supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(1000);

      if (!error && txs) {
        if (txs.length === 0 && localSaved) {
          // If cloud is empty but this device has local transactions, migrate them to cloud!
          try {
            const parsedLocal = JSON.parse(localSaved);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              const eligible = parsedLocal.filter(t => t.date);
              if (eligible.length > 0) {
                console.log("Migrating local transactions to Supabase cloud:", eligible.length);
                for (const t of eligible) {
                  await State.supabase.from("transactions").upsert(t);
                }
                State.transactions = eligible;
              } else {
                State.transactions = [];
              }
            } else {
              State.transactions = [];
            }
          } catch (pe) {
            State.transactions = [];
          }
        } else {
          State.transactions = txs;
          saveLocalTransactions(txs);
        }
      } else if (localSaved) {
        State.transactions = JSON.parse(localSaved);
      } else {
        State.transactions = [];
      }
    } catch (err) {
      if (localSaved) State.transactions = JSON.parse(localSaved);
      else State.transactions = [];
    }
  } else {
    if (localSaved) {
      State.transactions = JSON.parse(localSaved);
    } else {
      State.transactions = [];
    }
  }

  // 3. Load Categories, Accounts, EMIs, and Budgets
  State.categories = window.INITIAL_DATA ? [...window.INITIAL_DATA.categories] : [];
  const savedCustomAccounts = localStorage.getItem("tracker_accounts_custom");
  if (savedCustomAccounts) {
    try {
      State.accounts = JSON.parse(savedCustomAccounts);
      // Seamlessly upgrade / sync new card definitions & schedules from INITIAL_DATA
      if (window.INITIAL_DATA && window.INITIAL_DATA.accounts) {
        window.INITIAL_DATA.accounts.forEach(initAcc => {
          const existing = State.accounts.find(a => 
            a.name === initAcc.name || 
            (initAcc.aliases && initAcc.aliases.includes(a.name)) ||
            (a.aliases && a.aliases.includes(initAcc.name))
          );
          if (!existing) {
            State.accounts.push(JSON.parse(JSON.stringify(initAcc)));
          } else {
            existing.name = initAcc.name;
            existing.statement_schedule = initAcc.statement_schedule;
            existing.due_schedule = initAcc.due_schedule;
            existing.billing_cycle_day = initAcc.billing_cycle_day;
            existing.payment_due_day = initAcc.payment_due_day;
            existing.payment_due_date = initAcc.payment_due_date;
            existing.is_following_month = initAcc.is_following_month;
            existing.theme_class = initAcc.theme_class || existing.theme_class;
            existing.network = initAcc.network || existing.network;
            existing.aliases = initAcc.aliases;
            if (initAcc.credit_limit && (!existing.credit_limit || existing.credit_limit === 0)) {
              existing.credit_limit = initAcc.credit_limit;
            }
          }
        });
      }
    } catch(e) {
      State.accounts = window.INITIAL_DATA ? JSON.parse(JSON.stringify(window.INITIAL_DATA.accounts)) : [];
    }
  } else {
    State.accounts = window.INITIAL_DATA ? JSON.parse(JSON.stringify(window.INITIAL_DATA.accounts)) : [];
  }
  State.emiSchedule = window.INITIAL_DATA ? JSON.parse(JSON.stringify(window.INITIAL_DATA.emiSchedule)) : [];
  State.defaultBudgets = window.INITIAL_DATA ? [...window.INITIAL_DATA.defaultBudgets] : [];
  State.rollovers = window.INITIAL_DATA ? { ...window.INITIAL_DATA.rollovers } : {};
  State.personOpeningBalances = window.INITIAL_DATA ? { ...window.INITIAL_DATA.personOpeningBalances } : { "Dad": 0, "Bismarck": 0, "Anant": 0 };

  // Load custom saved opening balances if configured
  const savedAccountOpenings = localStorage.getItem("tracker_account_openings");
  if (savedAccountOpenings) {
    try {
      const accOpenings = JSON.parse(savedAccountOpenings);
      State.accounts.forEach(a => {
        if (accOpenings[a.name] !== undefined) a.opening_balance = accOpenings[a.name];
      });
    } catch (e) {}
  }

  const savedPersonOpenings = localStorage.getItem("tracker_person_opening_balances");
  if (savedPersonOpenings) {
    try {
      State.personOpeningBalances = JSON.parse(savedPersonOpenings);
    } catch (e) {}
  }

  // Load custom saved rollovers if configured
  const savedRollovers = localStorage.getItem("tracker_rollovers");
  if (savedRollovers) {
    try {
      State.rollovers = JSON.parse(savedRollovers);
    } catch (e) {}
  }

  // Load custom saved card bills & due dates
  const savedCardBills = localStorage.getItem("tracker_card_bills");
  if (savedCardBills) {
    try {
      State.cardBills = JSON.parse(savedCardBills);
      State.accounts.forEach(a => {
        if (State.cardBills[a.name]) {
          if (State.cardBills[a.name].due_date) a.payment_due_date = State.cardBills[a.name].due_date;
          if (State.cardBills[a.name].total_due !== undefined) a.current_bill_amount = State.cardBills[a.name].total_due;
          if (State.cardBills[a.name].is_paid !== undefined) a.is_bill_paid = State.cardBills[a.name].is_paid;
        }
      });
    } catch (e) {}
  }

  // 4. Load cloud card bills from Supabase if connected
  if (State.supabase) {
    try {
      const { data: bills } = await State.supabase.from("card_bills").select("*");
      if (bills && bills.length > 0) {
        bills.forEach(b => {
          State.cardBills[b.card_name] = {
            due_date: b.due_date,
            total_due: parseFloat(b.total_due) || 0,
            min_due: parseFloat(b.min_due) || 0,
            is_paid: Boolean(b.is_paid)
          };
        });
        State.accounts.forEach(a => {
          const bill = State.cardBills[a.name] || Object.entries(State.cardBills).find(([k, v]) => 
            a.name.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(a.name.toLowerCase()) ||
            (a.aliases && a.aliases.some(alias => k.toLowerCase().includes(alias.toLowerCase())))
          )?.[1];
          if (bill) {
            if (bill.due_date) a.payment_due_date = bill.due_date;
            if (bill.total_due !== undefined) a.current_bill_amount = bill.total_due;
            if (bill.is_paid !== undefined) a.is_bill_paid = bill.is_paid;
          }
        });
      }
    } catch (e) {
      console.warn("Cloud card bills sync notice:", e);
    }
  }

  populateCategorySelects();
  populateAccountSelects();
}

function saveLocalTransactions(txs) {
  localStorage.setItem("tracker_transactions", JSON.stringify(txs));
}

// Navigation & Tab Switching
function setupEventListeners() {
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".nav-tab").forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-tab");
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add("active");

      // Sync mobile bottom dock items if applicable
      document.querySelectorAll(".dock-item").forEach(d => {
        d.classList.toggle("active", d.getAttribute("data-tab") === targetId);
      });

      if (targetId === "analytics") {
        setTimeout(renderCharts, 100);
      }
      if (window.lucide) {
        lucide.createIcons();
      }
    });
  });

  const monthSelect = document.getElementById("monthSelect");
  if (monthSelect) {
    monthSelect.addEventListener("change", (e) => {
      State.activeMonth = e.target.value;
      localStorage.setItem("tracker_active_month", e.target.value);
      renderApp();
    });
  }

  const txTypeInput = document.getElementById("txTypeInput");
  if (txTypeInput) {
    txTypeInput.addEventListener("change", (e) => {
      updateCategoryDropdownForType(e.target.value);
    });
  }

  const txDescInput = document.getElementById("txDescInput");
  if (txDescInput) {
    txDescInput.addEventListener("input", (e) => {
      const match = autoClassifyText(e.target.value);
      if (match) {
        setTransactionTypeBtn(match.type);
        updateCategoryDropdownForType(match.type);
        const catSelect = document.getElementById("txCategoryInput");
        if (catSelect) catSelect.value = match.category;
      }
    });
  }

  const smartParserInput = document.getElementById("smartParserInput");
  if (smartParserInput) {
    smartParserInput.addEventListener("input", (e) => {
      runLiveParser(e.target.value);
    });
  }

  const saveSettingsBtn = document.getElementById("saveSettingsBtn");
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", saveSupabaseSettings);
  }

  // Gemini Chat Enter Key
  const chatInput = document.getElementById("geminiChatInput");
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendGeminiChatMessage();
      }
    });
  }

  // Passcode Setup Modal Input Handling
  const setupPinInput = document.getElementById("setupPinInput");
  const setupConfirmPinInput = document.getElementById("setupConfirmPinInput");
  if (setupPinInput && setupConfirmPinInput) {
    setupPinInput.addEventListener("input", (e) => {
      if (e.target.value.length === 4) {
        setupConfirmPinInput.focus();
      }
    });
    setupPinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        setupConfirmPinInput.focus();
      }
    });
    setupConfirmPinInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        savePasscodeFromModal();
      }
    });
  }

  // Backdrop click to dismiss passcode setup modal
  const pSetupModal = document.getElementById("passcodeSetupModal");
  if (pSetupModal) {
    pSetupModal.addEventListener("click", (e) => {
      if (e.target.id === "passcodeSetupModal") {
        closePasscodeSetupModal();
      }
    });
  }

  // Backdrop click to dismiss Quick Log Modal
  const qModal = document.getElementById("quickLogModal");
  if (qModal) {
    qModal.addEventListener("click", (e) => {
      if (e.target.id === "quickLogModal") {
        closeQuickLogModal();
      }
    });
  }

  // Keyboard Enter shortcut on amount & desc inputs
  const qAmt = document.getElementById("quickLogAmountInput");
  if (qAmt) {
    qAmt.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuickLogTransaction();
      }
    });
  }

  const qDesc = document.getElementById("quickLogDescInput");
  if (qDesc) {
    qDesc.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submitQuickLogTransaction();
      }
    });
  }

  // Global keyboard shortcuts (Shift+L for Lock) & lock screen numpad support
  window.addEventListener("keydown", (e) => {
    // Shift + L: Quick Lock / Open Passcode Setup
    if (e.shiftKey && (e.key === "L" || e.key === "l")) {
      e.preventDefault();
      handleHeaderLockClick();
      return;
    }

    // Physical keypad support on lock screen
    if (State.security.isLocked) {
      const qModal = document.getElementById("quickLogModal");
      const isQuickLogOpen = qModal && qModal.classList.contains("active");
      if (!isQuickLogOpen) {
        if (e.key >= "0" && e.key <= "9") {
          e.preventDefault();
          enterPinDigit(e.key);
        } else if (e.key === "Backspace") {
          e.preventDefault();
          deletePinDigit();
        }
      }
    }
  });
}

function populateMonthFilter() {
  const select = document.getElementById("monthSelect");
  if (!select) return;

  const months = new Set();
  months.add("2026-10");
  months.add("2026-11");
  months.add("2026-12");

  State.transactions.forEach(t => {
    if (t.date && t.date >= State.booksStartDate) {
      months.add(t.date.substring(0, 7));
    }
  });

  const sorted = Array.from(months).sort();
  select.innerHTML = `<option value="all">📅 All Time (Since ${State.booksStartDate})</option>`;
  
  sorted.forEach(m => {
    const d = new Date(m + "-01");
    const monthName = d.toLocaleString('default', { month: 'long', year: 'numeric' });
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `📅 ${monthName}`;
    if (m === State.activeMonth) opt.selected = true;
    select.appendChild(opt);
  });
}

function populateCategorySelects() {
  updateCategoryDropdownForType("Expense");
}

function updateCategoryDropdownForType(type) {
  const select = document.getElementById("txCategoryInput");
  if (!select) return;

  const filtered = State.categories.filter(c => {
    if (type === "Transfer") return c.type === "Transfer" || c.name.startsWith("Card Bill Payment") || c.name.includes("Transfer");
    return c.type === type;
  });

  select.innerHTML = filtered.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
}

function populateAccountSelects() {
  const select = document.getElementById("txAccountInput");
  if (select) {
    select.innerHTML = State.accounts.map(a => `<option value="${a.name}">${a.name} (${a.type})</option>`).join("");
  }
  const fromSelect = document.getElementById("transferFromInput");
  if (fromSelect) {
    fromSelect.innerHTML = State.accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join("");
  }
  const toSelect = document.getElementById("transferToInput");
  if (toSelect) {
    toSelect.innerHTML = State.accounts.map(a => `<option value="${a.name}">${a.name}</option>`).join("");
  }
}

function setTransactionTypeBtn(type) {
  document.querySelectorAll(".type-btn").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-type") === type);
  });
  const input = document.getElementById("txTypeInput");
  if (input) input.value = type;
}

// ==========================================
// CORE FINANCIAL CALCULATIONS
// Live Bank Balances, Dynamic People Ledgers, Cards, EMIs
// ==========================================
function getFilteredTransactions() {
  // Only transactions on or after books start date
  const validTxs = State.transactions.filter(t => t.date && t.date >= State.booksStartDate);
  if (State.activeMonth === "all") return validTxs;
  return validTxs.filter(t => t.date.startsWith(State.activeMonth));
}

function calculateFinancials() {
  const allActiveApproved = State.transactions.filter(t => t.date && t.date >= State.booksStartDate && t.status !== "rejected");
  const monthTxs = getFilteredTransactions().filter(t => t.status !== "rejected");
  const activeMonthKey = State.activeMonth === "all" ? (State.booksStartDate ? State.booksStartDate.substring(0, 7) : "2026-10") : State.activeMonth;
  const rollover = (State.rollovers && State.rollovers[State.activeMonth] !== undefined)
    ? State.rollovers[State.activeMonth]
    : ((State.rollovers && State.rollovers[activeMonthKey] !== undefined)
        ? State.rollovers[activeMonthKey]
        : ((State.rollovers && State.rollovers["2026-10"]) || 0.0));

  // 1. LIVE BANK BALANCES (Opening Balance B/F + All Inflows - All Outflows)
  const hdfcAcc = State.accounts.find(a => a.name === "HDFC Bank Account");
  const kotakAcc = State.accounts.find(a => a.name === "Kotak Bank Account");
  const cashAcc = State.accounts.find(a => a.name === "Cash");

  let hdfcBalance = hdfcAcc ? (hdfcAcc.opening_balance || 0) : 25000.00;
  let kotakBalance = kotakAcc ? (kotakAcc.opening_balance || 0) : 10000.00;
  let cashBalance = cashAcc ? (cashAcc.opening_balance || 0) : 1000.00;

  const hdfcLedger = [];
  const kotakLedger = [];

  const sortedAll = [...allActiveApproved].sort((a, b) => new Date(a.date) - new Date(b.date));

  sortedAll.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    const isIncome = t.transaction_type === "Income";
    const isExpense = t.transaction_type === "Expense";
    const isDebt = t.transaction_type === "Debt";
    const isTransfer = t.transaction_type === "Transfer";

    // --- HDFC BANK ACCOUNT ---
    if (t.account === "HDFC Bank Account") {
      let debit = 0;
      let credit = 0;

      if (isIncome) {
        credit = amt;
        hdfcBalance += amt;
      } else if (isExpense || isDebt) {
        debit = amt;
        hdfcBalance -= amt;
      } else if (isTransfer) {
        debit = amt;
        hdfcBalance -= amt;
        if (t.to_account === "Kotak Bank Account") kotakBalance += amt;
        if (t.to_account === "Cash") cashBalance += amt;
      }

      hdfcLedger.push({
        date: t.date,
        description: t.description || t.category,
        category: t.category,
        debit,
        credit,
        runningBalance: hdfcBalance
      });
    }

    // --- KOTAK BANK ACCOUNT ---
    if (t.account === "Kotak Bank Account") {
      let debit = 0;
      let credit = 0;

      if (isIncome) {
        credit = amt;
        kotakBalance += amt;
      } else if (isExpense || isDebt) {
        debit = amt;
        kotakBalance -= amt;
      } else if (isTransfer) {
        debit = amt;
        kotakBalance -= amt;
        if (t.to_account === "HDFC Bank Account") {
          hdfcBalance += amt;
          hdfcLedger.push({
            date: t.date,
            description: `Transfer from Kotak: ${t.description}`,
            category: "Internal Transfer",
            debit: 0,
            credit: amt,
            runningBalance: hdfcBalance
          });
        }
      }

      kotakLedger.push({
        date: t.date,
        description: t.description || t.category,
        category: t.category,
        debit,
        credit,
        runningBalance: kotakBalance
      });
    }

    // Cash Account
    if (t.account === "Cash") {
      if (isExpense) cashBalance -= amt;
      if (isIncome) cashBalance += amt;
    }
  });

  // 2. MONTH-FILTERED CASH FLOW METRICS (Living Spends vs Transfers)
  let totalIncome = 0;
  let totalExpense = 0;
  let totalDebt = 0;
  let totalSavings = 0;
  let totalCardPayments = 0;

  const categoryTotals = {};
  const accountTotals = {};

  monthTxs.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    const cat = t.category || "Uncategorized";
    const acc = t.account || "HDFC Bank Account";

    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
    accountTotals[acc] = (accountTotals[acc] || 0) + amt;

    if (t.transaction_type === "Income") {
      totalIncome += amt;
    } else if (t.transaction_type === "Debt") {
      totalDebt += amt;
    } else if (t.transaction_type === "Savings") {
      totalSavings += amt;
    } else if (t.transaction_type === "Transfer" || cat.startsWith("Card Bill Payment")) {
      totalCardPayments += amt;
    } else {
      totalExpense += amt;
    }
  });

  const totalOutflows = totalExpense + totalDebt + totalSavings;
  const netLeftover = rollover + totalIncome - totalOutflows;

  // 3. DYNAMIC PERSON LEDGERS (Including Opening Balances B/F)
  const personMap = {};
  State.categories.forEach(c => {
    const paidMatch = c.name.match(/^(.+?)\s*-\s*Paid$/i);
    const reimbMatch = c.name.match(/^(.+?)\s*-\s*Reimbursed$/i);
    if (paidMatch) {
      const name = paidMatch[1].trim();
      const openBal = State.personOpeningBalances[name] || 0;
      if (!personMap[name]) personMap[name] = { name, openingBalance: openBal, paid: 0, reimbursed: 0, txs: [] };
    }
    if (reimbMatch) {
      const name = reimbMatch[1].trim();
      const openBal = State.personOpeningBalances[name] || 0;
      if (!personMap[name]) personMap[name] = { name, openingBalance: openBal, paid: 0, reimbursed: 0, txs: [] };
    }
  });

  allActiveApproved.forEach(t => {
    const amt = parseFloat(t.amount) || 0;
    const paidMatch = (t.category || "").match(/^(.+?)\s*-\s*Paid$/i);
    const reimbMatch = (t.category || "").match(/^(.+?)\s*-\s*Reimbursed$/i);

    if (paidMatch) {
      const name = paidMatch[1].trim();
      if (!personMap[name]) personMap[name] = { name, openingBalance: 0, paid: 0, reimbursed: 0, txs: [] };
      personMap[name].paid += amt;
      personMap[name].txs.push(t);
    }
    if (reimbMatch) {
      const name = reimbMatch[1].trim();
      if (!personMap[name]) personMap[name] = { name, openingBalance: 0, paid: 0, reimbursed: 0, txs: [] };
      personMap[name].reimbursed += amt;
      personMap[name].txs.push(t);
    }
  });

  const peopleLedgers = Object.values(personMap).map(p => ({
    name: p.name,
    openingBalance: p.openingBalance,
    totalPaid: p.paid,
    totalReimbursed: p.reimbursed,
    balanceReceivable: p.openingBalance + p.paid - p.reimbursed,
    txCount: p.txs.length
  }));

  // 4. EXECUTIVE FINANCIAL SOLVENCY & NET BALANCE ENGINE
  const totalLiquidCash = hdfcBalance + kotakBalance + cashBalance;

  // Credit Card Liabilities
  const cards = (State.accounts || []).filter(a => a.type === "Credit Card" && a.is_active !== false);
  let totalCardLiabilities = 0;
  cards.forEach(c => {
    const spends = monthTxs
      .filter(t => t.account === c.name && t.transaction_type === "Expense")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const cleanCardName = c.name.toLowerCase().replace("credit card", "").trim();
    const paid = monthTxs
      .filter(t => t.category && t.category.toLowerCase().includes(cleanCardName) && (t.transaction_type === "Transfer" || t.transaction_type === "Expense"))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const opening = c.opening_balance || 0;
    const cardClosing = Math.max(0, opening + spends - paid);
    const effectiveDue = c.is_bill_paid ? cardClosing : Math.max(cardClosing, c.current_bill_amount || 0);
    totalCardLiabilities += effectiveDue;
  });

  // Active Monthly EMIs
  const totalMonthlyEmis = (State.emiSchedule || [])
    .filter(e => (parseInt(e.months_remaining, 10) || 0) > 0)
    .reduce((sum, e) => sum + (parseFloat(e.monthly_emi) || 0), 0);

  // People Payables & Receivables
  const peopleReceivables = peopleLedgers
    .filter(p => p.balanceReceivable > 0)
    .reduce((sum, p) => sum + p.balanceReceivable, 0);

  const peoplePayables = peopleLedgers
    .filter(p => p.balanceReceivable < 0)
    .reduce((sum, p) => sum + Math.abs(p.balanceReceivable), 0);

  // Total Liabilities Due (Cards + EMIs + Dhruv debts to people)
  const totalLiabilitiesDue = totalCardLiabilities + totalMonthlyEmis + peoplePayables;

  // Income & Inflows
  const budgetedIncome = (State.defaultBudgets || [])
    .filter(b => b.type === "Income")
    .reduce((sum, b) => sum + (parseFloat(b.amount) || 0), 0);
  const totalIncomeBudgeted = budgetedIncome > 0 ? budgetedIncome : 34439;
  const remainingIncomeToReceive = Math.max(0, totalIncomeBudgeted - totalIncome);
  const totalExpectedInflows = remainingIncomeToReceive + peopleReceivables;

  // Immediate Liquid Buffer & Current Net Position
  const currentLiquidBuffer = totalLiquidCash - totalCardLiabilities;
  const currentNetPosition = totalLiquidCash - totalLiabilitiesDue;

  // Expected Living Spends (Monthly living expense budget)
  const expectedLivingSpends = 25000;
  const remainingLivingSpends = Math.max(0, expectedLivingSpends - totalExpense);

  // Projected Month-End Net Standing
  const projectedMonthEndNet = totalLiquidCash + totalExpectedInflows - totalLiabilitiesDue - remainingLivingSpends;
  const isNetPositive = projectedMonthEndNet >= 0;

  return {
    hdfcBalance,
    kotakBalance,
    cashBalance,
    totalLiquidCash,
    totalCardLiabilities,
    totalMonthlyEmis,
    peoplePayables,
    totalLiabilitiesDue,
    totalIncomeBudgeted,
    remainingIncomeToReceive,
    peopleReceivables,
    totalExpectedInflows,
    currentLiquidBuffer,
    expectedLivingSpends,
    remainingLivingSpends,
    projectedMonthEndNet,
    isNetPositive,
    currentNetPosition,
    hdfcLedger: hdfcLedger.reverse().slice(0, 20),
    kotakLedger: kotakLedger.reverse().slice(0, 20),
    rollover,
    totalIncome,
    totalExpense,
    totalDebt,
    totalSavings,
    totalCardPayments,
    totalOutflows,
    netLeftover,
    categoryTotals,
    accountTotals,
    peopleLedgers
  };
}

// ==========================================
// RENDER ALL UI SECTIONS
// ==========================================
function renderApp() {
  const fin = calculateFinancials();
  renderBankBalances(fin);
  renderMetrics(fin);
  renderCashFlowSummary(fin);
  renderCreditCardTracker(fin);
  renderEmiSchedule();
  renderDynamicPersonLedgers(fin.peopleLedgers);
  renderDualBankLedgers(fin);
  renderTransactionsTable();
  renderReviewInbox();
  renderNotifications(fin);
  renderCharts();
  updateReviewBadge();
  if (window.lucide) {
    lucide.createIcons();
  }
}

function renderAll() {
  renderApp();
}
window.renderAll = renderAll;

function renderBankBalances(fin) {
  const fmt = (n) => "₹" + Math.round(n).toLocaleString("en-IN");

  const hdfcEl = document.getElementById("displayHdfcBalance");
  if (hdfcEl) hdfcEl.textContent = fmt(fin.hdfcBalance);

  const kotakEl = document.getElementById("displayKotakBalance");
  if (kotakEl) kotakEl.textContent = fmt(fin.kotakBalance);

  const cashEl = document.getElementById("displayCashBalance");
  if (cashEl) cashEl.textContent = fmt(fin.cashBalance);
}

function renderSolvencyCard(fin) {
  const card = document.getElementById("solvencyHeroCard");
  if (!card) return;

  const fmt = (num) => "₹" + Math.round(Math.abs(num)).toLocaleString("en-IN");
  const isPos = fin.isNetPositive;

  // Toggle card state class
  if (isPos) {
    card.classList.add("is-positive");
    card.classList.remove("is-negative");
  } else {
    card.classList.add("is-negative");
    card.classList.remove("is-positive");
  }

  // Status Badge
  const badge = document.getElementById("solvencyStatusBadge");
  if (badge) {
    if (isPos) {
      badge.textContent = `🟢 NET POSITIVE (+${fmt(fin.projectedMonthEndNet)})`;
    } else {
      badge.textContent = `🔴 NET NEGATIVE (-${fmt(fin.projectedMonthEndNet)})`;
    }
  }

  // Subtitle
  const subtitle = document.getElementById("solvencySubtitle");
  if (subtitle) {
    subtitle.textContent = isPos
      ? "Fully Solvent: Liquid cash & upcoming inflows comfortably cover all monthly commitments"
      : "Solvency Alert: Total liabilities & upcoming spends exceed available liquid funds & inflows";
  }

  // 1. Liquid Cash Available
  const liquidEl = document.getElementById("solvencyLiquidVal");
  if (liquidEl) liquidEl.textContent = fmt(fin.totalLiquidCash);
  const liquidSub = document.getElementById("solvencyLiquidSub");
  if (liquidSub) liquidSub.textContent = `HDFC (${fmt(fin.hdfcBalance)}) + Kotak (${fmt(fin.kotakBalance)}) + Cash (${fmt(fin.cashBalance)})`;

  // 2. Upcoming Inflows
  const inflowsEl = document.getElementById("solvencyInflowsVal");
  if (inflowsEl) inflowsEl.textContent = "+" + fmt(fin.totalExpectedInflows);
  const inflowsSub = document.getElementById("solvencyInflowsSub");
  if (inflowsSub) inflowsSub.textContent = `Pending Salary (${fmt(fin.remainingIncomeToReceive)}) + Receivables (${fmt(fin.peopleReceivables)})`;

  // 3. Liabilities Due
  const liabEl = document.getElementById("solvencyLiabilitiesVal");
  if (liabEl) liabEl.textContent = "-" + fmt(fin.totalLiabilitiesDue);
  const liabSub = document.getElementById("solvencyLiabilitiesSub");
  if (liabSub) liabSub.textContent = `Credit Cards (${fmt(fin.totalCardLiabilities)}) + Active EMIs (${fmt(fin.totalMonthlyEmis)})`;

  // 4. Projected Net Position
  const netEl = document.getElementById("solvencyNetVal");
  if (netEl) {
    netEl.textContent = (isPos ? "+" : "-") + fmt(fin.projectedMonthEndNet);
    netEl.style.color = isPos ? "var(--income)" : "var(--expense)";
  }
  const netSub = document.getElementById("solvencyNetSub");
  if (netSub) netSub.textContent = isPos ? "Projected Month-End Surplus" : "Projected Month-End Deficit";

  // Dynamic Advice Box
  const adviceBox = document.getElementById("solvencyAdviceBox");
  if (adviceBox) {
    if (isPos) {
      adviceBox.innerHTML = `
        <div class="solvency-advice is-positive">
          <div class="solvency-advice-icon">🛡️</div>
          <div class="solvency-advice-text">
            <strong>Financially Solvent & Safe:</strong> You have a projected month-end surplus buffer of <strong>+${fmt(fin.projectedMonthEndNet)}</strong>.
            Your total liquid cash (<strong>${fmt(fin.totalLiquidCash)}</strong>) plus expected inflows (<strong>${fmt(fin.totalExpectedInflows)}</strong>)
            will cover all credit card dues & EMIs (<strong>${fmt(fin.totalLiabilitiesDue)}</strong>) and estimated remaining living spends (<strong>${fmt(fin.remainingLivingSpends)}</strong>).
            ${fin.currentLiquidBuffer < 0 
              ? `<br><span style="color:var(--warning); font-weight:600;">⚠️ Immediate Liquidity Note:</span> Liquid cash currently trails active card dues by ${fmt(Math.abs(fin.currentLiquidBuffer))}. Once your expected salary/inflows arrive, you will be back in solid surplus.`
              : `Your immediate liquid buffer is strong at <strong>+${fmt(fin.currentLiquidBuffer)}</strong>.`
            }
          </div>
        </div>
      `;
    } else {
      const deficit = fmt(fin.projectedMonthEndNet);
      adviceBox.innerHTML = `
        <div class="solvency-advice is-negative">
          <div class="solvency-advice-icon">🚨</div>
          <div class="solvency-advice-text">
            <strong>Action Needed: Negative Net Position:</strong> Considering all transactions, liabilities, and incoming salary, you have a projected deficit of <strong style="color:var(--expense);">${deficit}</strong>.
            Total obligations due (Cards & EMIs: <strong>${fmt(fin.totalLiabilitiesDue)}</strong>, remaining living budget: <strong>${fmt(fin.remainingLivingSpends)}</strong>)
            exceed your liquid cash (<strong>${fmt(fin.totalLiquidCash)}</strong>) and upcoming inflows (<strong>${fmt(fin.totalExpectedInflows)}</strong>).
            ${fin.peopleReceivables > 0 ? ` Collecting the <strong>${fmt(fin.peopleReceivables)}</strong> owed to you by others will help reduce this deficit.` : ''}
          </div>
        </div>
      `;
    }
  }
}

function renderMetrics(fin) {
  const fmt = (num) => "₹" + Math.round(num).toLocaleString("en-IN");

  const mIncome = document.getElementById("metricIncome");
  if (mIncome) mIncome.textContent = fmt(fin.totalIncome);
  const mExpense = document.getElementById("metricExpense");
  if (mExpense) mExpense.textContent = fmt(fin.totalExpense);
  const mNet = document.getElementById("metricNet");
  if (mNet) {
    mNet.textContent = fmt(fin.netLeftover);
    mNet.style.color = fin.netLeftover >= 0 ? "var(--income)" : "var(--expense)";
  }
  const mSavings = document.getElementById("metricSavings");
  if (mSavings) mSavings.textContent = fmt(fin.totalSavings);
  const mDebt = document.getElementById("metricDebt");
  if (mDebt) mDebt.textContent = fmt(fin.totalDebt);
  const mRollover = document.getElementById("metricRollover");
  if (mRollover) mRollover.textContent = fmt(fin.rollover);

  renderSolvencyCard(fin);
}

function renderCashFlowSummary(fin) {
  const tbody = document.getElementById("cashFlowSummaryBody");
  if (!tbody) return;

  const rows = [
    { label: "Opening Rollover", expected: fin.rollover, actual: fin.rollover, type: "neutral", status: "B/F" },
    { label: "(+) Total Income", expected: fin.totalIncomeBudgeted, actual: fin.totalIncome, type: "income", status: `${fin.totalIncomeBudgeted > 0 ? Math.round((fin.totalIncome / fin.totalIncomeBudgeted) * 100) : 0}% Received` },
    { label: "(-) Living Expenses", expected: fin.expectedLivingSpends, actual: fin.totalExpense, type: "expense", status: `${fin.expectedLivingSpends > 0 ? Math.round((fin.totalExpense / fin.expectedLivingSpends) * 100) : 0}% Spent` },
    { label: "Scheduled Loan / EMI Commitments", expected: fin.totalMonthlyEmis, actual: fin.totalDebt, type: "debt", status: fin.totalDebt >= fin.totalMonthlyEmis ? "Paid" : "Due" },
    { label: "(-) Savings & Investments", expected: 1000, actual: fin.totalSavings, type: "savings", status: `${fin.totalSavings >= 1000 ? 'Funded' : 'Pending'}` },
    { label: "Liquid Cash Available", expected: fin.totalLiquidCash, actual: fin.totalLiquidCash, type: "liquid", status: "Bank + Cash" },
    { label: "Outstanding Card Liabilities & Bills", expected: fin.totalCardLiabilities, actual: fin.totalCardLiabilities, type: "card", status: fin.totalCardLiabilities === 0 ? "Clear" : "Unpaid" },
    { label: "(=) Projected Month-End Net Balance", expected: fin.projectedMonthEndNet, actual: fin.projectedMonthEndNet, type: "net", status: fin.isNetPositive ? "🟢 POSITIVE" : "🔴 NEGATIVE" }
  ];

  tbody.innerHTML = rows.map(r => {
    const isNet = r.type === "net";
    const isLiquid = r.type === "liquid";
    const isCard = r.type === "card";
    const valClass = r.actual >= 0 ? "" : "text-danger";

    let badgeColor = "var(--primary)";
    if (r.type === "net") {
      badgeColor = fin.isNetPositive ? "var(--income)" : "var(--expense)";
    } else if (r.type === "income") {
      badgeColor = r.actual >= r.expected ? "var(--income)" : "var(--warning)";
    } else if (r.type === "expense") {
      badgeColor = r.actual > r.expected ? "var(--expense)" : "var(--income)";
    } else if (r.type === "debt") {
      badgeColor = r.actual >= r.expected ? "var(--income)" : "var(--warning)";
    } else if (isLiquid) {
      badgeColor = r.actual > 0 ? "var(--primary)" : "var(--expense)";
    } else if (isCard) {
      badgeColor = r.actual === 0 ? "var(--income)" : "var(--expense)";
    }

    const rowStyle = isNet
      ? 'font-weight: 800; background: var(--bg-tertiary); border-top: 2px solid var(--border-color);'
      : (isLiquid || isCard)
        ? 'font-weight: 600; background: rgba(255, 255, 255, 0.02);'
        : '';

    return `
      <tr style="${rowStyle}">
        <td><strong>${r.label}</strong></td>
        <td class="privacy-sensitive">₹${Math.round(r.expected).toLocaleString("en-IN")}</td>
        <td class="privacy-sensitive ${valClass}">₹${Math.round(r.actual).toLocaleString("en-IN")}</td>
        <td>
          <span class="badge" style="background: ${badgeColor}; color:#fff; font-weight:700;">
            ${r.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}

// Side-by-Side Dual Bank Ledgers
function renderDualBankLedgers(fin) {
  const hdfcTbody = document.getElementById("hdfcLedgerTableBody");
  if (hdfcTbody) {
    if (fin.hdfcLedger.length === 0) {
      hdfcTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted)">Fresh start! No transactions recorded for HDFC yet. Opening balance is active.</td></tr>`;
    } else {
      hdfcTbody.innerHTML = fin.hdfcLedger.map(l => `
        <tr>
          <td>${l.date}</td>
          <td>${l.description}</td>
          <td style="color:var(--expense);">${l.debit > 0 ? '-₹' + l.debit.toLocaleString("en-IN") : '-'}</td>
          <td style="color:var(--income);">${l.credit > 0 ? '+₹' + l.credit.toLocaleString("en-IN") : '-'}</td>
          <td style="font-weight:700;">₹${Math.round(l.runningBalance).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");
    }
  }

  const kotakTbody = document.getElementById("kotakLedgerTableBody");
  if (kotakTbody) {
    if (fin.kotakLedger.length === 0) {
      kotakTbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted)">Fresh start! No transactions recorded for Kotak yet. Opening balance is active.</td></tr>`;
    } else {
      kotakTbody.innerHTML = fin.kotakLedger.map(l => `
        <tr>
          <td>${l.date}</td>
          <td>${l.description}</td>
          <td style="color:var(--expense);">${l.debit > 0 ? '-₹' + l.debit.toLocaleString("en-IN") : '-'}</td>
          <td style="color:var(--income);">${l.credit > 0 ? '+₹' + l.credit.toLocaleString("en-IN") : '-'}</td>
          <td style="font-weight:700;">₹${Math.round(l.runningBalance).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");
    }
  }
}

// Dynamic Person Ledgers (Dad, Bismarck, Anant, etc.)
function renderDynamicPersonLedgers(ledgers) {
  const grid = document.getElementById("personLedgersGrid");
  if (!grid) return;

  if (ledgers.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);">No person ledgers detected. Create a category like 'Name - Paid' to add one!</p>`;
    return;
  }

  grid.innerHTML = ledgers.map(p => {
    const isSettled = Math.abs(p.balanceReceivable) < 1;
    const isOwed = p.balanceReceivable > 0;
    return `
      <div class="person-card">
        <div class="person-card-header">
          <div class="person-name">
            <span style="font-size: 1.25rem;">👤</span>
            <strong>${p.name}</strong>
          </div>
          <span class="badge" style="background: ${isSettled ? 'var(--income)' : 'var(--warning)'}; color: #fff;">
            ${isSettled ? '✓ Fully Settled' : (isOwed ? 'Receivable' : 'Payable')}
          </span>
        </div>

        <div class="person-stat-line">
          <span style="color:var(--text-muted)">Opening B/F:</span>
          <strong class="privacy-sensitive">₹${Math.round(p.openingBalance || 0).toLocaleString("en-IN")}</strong>
        </div>
        <div class="person-stat-line">
          <span style="color:var(--text-muted)">Paid in Oct:</span>
          <strong class="privacy-sensitive">₹${Math.round(p.totalPaid).toLocaleString("en-IN")}</strong>
        </div>
        <div class="person-stat-line">
          <span style="color:var(--text-muted)">Reimbursed:</span>
          <strong class="privacy-sensitive" style="color:var(--income);">₹${Math.round(p.totalReimbursed).toLocaleString("en-IN")}</strong>
        </div>

        <div class="person-balance-box">
          <span>Net Balance:</span>
          <span class="person-card-balance privacy-sensitive" style="color: ${isSettled ? 'var(--income)' : 'var(--expense)'}; font-size: 1.1rem;">
            ₹${Math.abs(Math.round(p.balanceReceivable)).toLocaleString("en-IN")}
            <small style="font-size:0.75rem; color:var(--text-secondary);">${isOwed ? '(You get back)' : (isSettled ? '' : '(You owe)')}</small>
          </span>
        </div>
      </div>
    `;
  }).join("");
}

// EMI & Debt Schedule
function renderEmiSchedule() {
  const tbody = document.getElementById("emiScheduleTableBody");
  if (!tbody) return;

  if (!State.emiSchedule || State.emiSchedule.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:2rem; color:var(--text-muted);"><span style="font-size:1.3rem;">🎉</span><br><strong>No Active Loans or EMIs</strong><br><small>You have no active debt schedules. Click "+ Add Loan / EMI" above if any new installments occur.</small></td></tr>`;
    return;
  }

  tbody.innerHTML = State.emiSchedule.map(e => `
    <tr>
      <td><strong>${e.name}</strong></td>
      <td class="privacy-sensitive">₹${(e.original_amount || 0).toLocaleString("en-IN")}</td>
      <td><strong class="emi-amount-badge privacy-sensitive">₹${(e.monthly_emi || 0).toLocaleString("en-IN")}</strong> / mo</td>
      <td>${e.total_tenure || 0} mos</td>
      <td>
        <span class="badge" style="background:${e.months_remaining > 0 ? 'var(--primary)' : 'var(--income)'}; color:#fff;">
          ${e.months_remaining > 0 ? e.months_remaining + ' mos left' : '0 (Completed)'}
        </span>
      </td>
      <td><span class="category-pill">${e.card || e.account || 'Account'}</span></td>
      <td><em>${e.status || 'Active'}</em></td>
      <td>
        <button type="button" class="btn btn-secondary" style="font-size:0.7rem; padding:0.25rem 0.5rem; color:var(--expense);" onclick="deleteEmi('${e.name}')" title="Delete EMI Schedule">✕</button>
      </td>
    </tr>
  `).join("");
}

function openAddEmiModal() {
  const accSelect = document.getElementById("newEmiAccountSelect");
  if (accSelect) {
    accSelect.innerHTML = State.accounts
      .filter(a => a.is_active !== false)
      .map(a => `<option value="${a.name}">${a.name}</option>`)
      .join("");
  }
  document.getElementById("newEmiNameInput").value = "";
  document.getElementById("newEmiOriginalInput").value = "";
  document.getElementById("newEmiMonthlyInput").value = "";
  document.getElementById("newEmiTenureInput").value = "12";
  document.getElementById("newEmiRemainingInput").value = "12";
  document.getElementById("addEmiModal").classList.add("active");
}

function closeAddEmiModal() {
  document.getElementById("addEmiModal").classList.remove("active");
}

function saveNewEmi() {
  const name = document.getElementById("newEmiNameInput").value.trim();
  const card = document.getElementById("newEmiAccountSelect").value;
  const orig = parseFloat(document.getElementById("newEmiOriginalInput").value) || 0;
  const monthly = parseFloat(document.getElementById("newEmiMonthlyInput").value) || 0;
  const tenure = parseInt(document.getElementById("newEmiTenureInput").value) || 12;
  const remaining = parseInt(document.getElementById("newEmiRemainingInput").value) || tenure;

  if (!name || monthly <= 0) {
    showToast("Please enter a valid loan/item name and monthly EMI amount!", "warning");
    return;
  }

  if (!State.emiSchedule) State.emiSchedule = [];
  State.emiSchedule = State.emiSchedule.filter(e => e.name.toLowerCase() !== name.toLowerCase());
  State.emiSchedule.push({
    name: name,
    card: card,
    original_amount: orig || (monthly * tenure),
    monthly_emi: monthly,
    total_tenure: tenure,
    months_remaining: remaining,
    status: "Active"
  });

  if (!State.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
    State.categories.push({
      id: "cat_" + Date.now(),
      name: name,
      type: "Debt",
      budget: monthly,
      icon: "credit-card",
      color: "#dc2626"
    });
    localStorage.setItem("tracker_categories", JSON.stringify(State.categories));
  }

  localStorage.setItem("tracker_emi_schedule", JSON.stringify(State.emiSchedule));
  showToast(`✓ Added ${name} to Loan & EMI Schedule!`, "success");
  closeAddEmiModal();
  renderApp();
}

function deleteEmi(emiName) {
  if (!confirm(`Are you sure you want to remove the EMI schedule for "${emiName}"?`)) return;
  State.emiSchedule = State.emiSchedule.filter(e => e.name !== emiName);
  localStorage.setItem("tracker_emi_schedule", JSON.stringify(State.emiSchedule));
  showToast(`Removed "${emiName}" from Loan & EMI schedule`, "info");
  renderApp();
}

// Unified Card Vault & Credit Card Tracker
function renderCreditCardTracker() {
  const deckContainer = document.getElementById("cardVaultDeckContainer");
  const tbody = document.getElementById("creditCardTrackerBody");
  
  const cards = State.accounts.filter(a => a.type === "Credit Card" && a.is_active !== false);
  const txs = getFilteredTransactions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let totalLimit = 0;
  let totalSpend = 0;
  let totalPaid = 0;
  let totalClosing = 0;

  const deckHtml = cards.map(c => {
    totalLimit += (c.credit_limit || 0);

    const spends = txs
      .filter(t => t.account === c.name && t.transaction_type === "Expense")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    totalSpend += spends;

    const paid = txs
      .filter(t => t.category && t.category.toLowerCase().includes(c.name.toLowerCase().replace("credit card", "").trim()) && (t.transaction_type === "Transfer" || t.transaction_type === "Expense"))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    totalPaid += paid;

    const opening = c.opening_balance || 0;
    const closing = Math.max(0, opening + spends - paid);
    totalClosing += closing;
    const available = Math.max(0, (c.credit_limit || 0) - closing);
    const utilPct = c.credit_limit > 0 ? Math.round((closing / c.credit_limit) * 100) : 0;

    // Due Date calculations
    let dueDateStr = c.payment_due_date;
    if (!dueDateStr) {
      const activeYearMonth = State.activeMonth === "all" ? "2026-10" : State.activeMonth;
      const [yearStr, monthStr] = (activeYearMonth || "2026-10").split("-");
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10);

      // If the due date is in the following month
      const isNextMonth = c.is_following_month || (c.billing_cycle_day && c.payment_due_day && c.payment_due_day < c.billing_cycle_day);
      if (isNextMonth) {
        month += 1;
        if (month > 12) {
          month = 1;
          year += 1;
        }
      }
      const dueDay = ("0" + (c.payment_due_day || 15)).slice(-2);
      const dueMonth = ("0" + month).slice(-2);
      dueDateStr = `${year}-${dueMonth}-${dueDay}`;
    }

    const dueObj = new Date(dueDateStr + "T00:00:00");
    const diffDays = Math.ceil((dueObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isPaid = (closing <= 0 && (!c.current_bill_amount || c.is_bill_paid)) || c.is_bill_paid;

    let dueBadgeHtml = "";
    if (isPaid) {
      dueBadgeHtml = `<span class="due-status-pill status-success">✓ Bill Paid</span>`;
    } else if (diffDays < 0) {
      dueBadgeHtml = `<span class="due-status-pill status-danger">🚨 Overdue (${Math.abs(diffDays)}d)</span>`;
    } else if (diffDays <= 3) {
      dueBadgeHtml = `<span class="due-status-pill status-danger">⚠️ ${diffDays === 0 ? 'Due Today' : diffDays === 1 ? 'Due Tomorrow' : 'Due in ' + diffDays + 'd'}</span>`;
    } else if (diffDays <= 7) {
      dueBadgeHtml = `<span class="due-status-pill status-warning">Due in ${diffDays} days</span>`;
    } else {
      dueBadgeHtml = `<span class="due-status-pill status-info">Due in ${diffDays}d</span>`;
    }

    // Vault credentials for this card
    const vault = State.decryptedVault[c.name] || {};
    const hasNum = Boolean(vault.cardNumber && vault.cardNumber.length >= 4);
    const maskedNum = hasNum 
      ? vault.cardNumber.replace(/(\d{4})(\d{4})?(\d{4})?(\d{4})?/, (_, a, b, c, d) => `${a} •••• •••• ${d || c || b}`)
      : (c.last4 && c.last4 !== "••••") ? `•••• •••• •••• ${c.last4}` : "•••• •••• •••• ••••";
    
    const expiry = vault.expiry || "••/••";
    const cvv = vault.cvv || "•••";
    const pin = vault.pin || "••••";
    const themeClass = c.theme_class || getCardDefaultTheme(c.name);
    const network = c.network || (c.name.includes("American") ? "Amex" : c.name.includes("Roar") ? "RuPay" : "Visa");
    const safeCardId = encodeURIComponent(c.name).replace(/[^a-zA-Z0-9]/g, "_");

    return `
      <div class="tactile-card ${themeClass}">
        <div class="card-gloss-overlay"></div>
        
        <!-- Top Row -->
        <div class="card-top-row">
          <div class="card-bank-info">
            <span class="card-bank-name">${c.name}</span>
            <span class="card-type-tag">Cycle: ${c.statement_schedule || (formatDayOrdinal(c.billing_cycle_day || 1) + " of month")}</span>
          </div>
          <div class="card-network-logo">${network}</div>
        </div>

        <!-- EMV Chip -->
        <div class="card-chip"></div>

        <!-- 16-Digit Card Number Box -->
        <div class="card-number-box">
          <span class="card-number-val privacy-sensitive" id="cardNumVal_${safeCardId}">${maskedNum}</span>
          <div style="display:flex; gap:0.25rem;">
            ${hasNum ? `<button type="button" class="card-btn-inline" onclick="toggleCardNumberVisibility('${safeCardId}', '${vault.cardNumber}')" title="Show / Hide Number">👁️</button>` : ''}
            <button type="button" class="card-btn-inline" onclick="copyCardValue('${vault.cardNumber || ''}', 'Card Number')" title="Copy 16-digit Number">📋</button>
          </div>
        </div>

        <!-- Sensitive Vault Row: Expiry, CVV, PIN -->
        <div class="card-vault-meta-row">
          <div class="vault-field-group">
            <span class="vault-field-label">Expires</span>
            <div class="vault-field-val-wrap">
              <span class="vault-field-val privacy-sensitive">${expiry}</span>
              ${vault.expiry ? `<button type="button" class="card-btn-inline" onclick="copyCardValue('${vault.expiry}', 'Expiry Date')">📋</button>` : ''}
            </div>
          </div>
          <div class="vault-field-group">
            <span class="vault-field-label">CVV</span>
            <div class="vault-field-val-wrap">
              <span class="vault-field-val card-cvv-val privacy-sensitive" id="cvvVal_${safeCardId}">•••</span>
              ${vault.cvv ? `<button type="button" class="card-btn-inline" onclick="toggleCvvVisibility('${safeCardId}', '${vault.cvv}')">👁️</button>` : ''}
              ${vault.cvv ? `<button type="button" class="card-btn-inline" onclick="copyCardValue('${vault.cvv}', 'CVV')">📋</button>` : ''}
            </div>
          </div>
          <div class="vault-field-group">
            <span class="vault-field-label">ATM PIN</span>
            <div class="vault-field-val-wrap">
              <span class="vault-field-val card-pin-val privacy-sensitive" id="pinVal_${safeCardId}">••••</span>
              ${vault.pin ? `<button type="button" class="card-btn-inline" onclick="togglePinVisibility('${safeCardId}', '${vault.pin}')">👁️</button>` : ''}
              ${vault.pin ? `<button type="button" class="card-btn-inline" onclick="copyCardValue('${vault.pin}', 'Card PIN')">📋</button>` : ''}
            </div>
          </div>
        </div>

        <!-- Limits & Due Date Tray -->
        <div class="card-status-tray">
          <div class="card-stats-split">
            <span style="opacity:0.85;">Used: <strong class="privacy-sensitive">₹${Math.round(closing).toLocaleString("en-IN")}</strong></span>
            <span>Available: <strong class="privacy-sensitive">₹${Math.round(available).toLocaleString("en-IN")}</strong></span>
          </div>

          <div class="card-limit-bar-bg">
            <div class="card-limit-bar-fill" style="width: ${Math.min(100, utilPct)}%; background: ${utilPct > 70 ? 'var(--expense)' : utilPct > 30 ? 'var(--warning)' : '#10b981'};"></div>
          </div>

          <div class="card-stats-split" style="margin-bottom:0.65rem;">
            <div>
              <span>${dueBadgeHtml}</span>
              ${c.due_schedule ? `<div style="font-size:0.68rem; color:var(--text-muted); margin-top:2px; font-weight:500;">Due: ${c.due_schedule}</div>` : ''}
            </div>
            <span style="font-size:0.75rem; opacity:0.85; text-align:right;">Limit: <strong class="card-limit-val privacy-sensitive">₹${(c.credit_limit || 0).toLocaleString("en-IN")}</strong></span>
          </div>

          <!-- Quick Actions -->
          <div class="card-card-actions">
            <button type="button" class="btn-card-action primary-pay" onclick="openPayCardBillModal('${c.name}', ${Math.round(closing)})">
              💳 Pay Bill
            </button>
            <button type="button" class="btn-card-action" onclick="openEditCardModal('${c.name}')">
              ✏️ Vault / Edit
            </button>
          </div>
        </div>
      </div>
    `;
  });

  if (deckContainer) {
    if (deckHtml.length === 0) {
      deckContainer.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding:3rem; background:var(--bg-secondary); border-radius:var(--radius-lg); border:1px dashed var(--border-color);">
          <div style="font-size:2.5rem; margin-bottom:0.75rem;">💳</div>
          <h3>No Cards in Vault Yet</h3>
          <p style="color:var(--text-muted); font-size:0.85rem; margin-top:0.25rem;">
            Click "+ Add New Card" above to register and secure your credit/debit cards.
          </p>
        </div>
      `;
    } else {
      deckContainer.innerHTML = deckHtml.join("");
    }
  }

  // Also populate compact table rows
  if (tbody) {
    const tableRows = cards.map(c => {
      const spends = txs
        .filter(t => t.account === c.name && t.transaction_type === "Expense")
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const paid = txs
        .filter(t => t.category && t.category.toLowerCase().includes(c.name.toLowerCase().replace("credit card", "").trim()) && (t.transaction_type === "Transfer" || t.transaction_type === "Expense"))
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const opening = c.opening_balance || 0;
      const closing = Math.max(0, opening + spends - paid);
      const available = Math.max(0, (c.credit_limit || 0) - closing);
      const utilPct = c.credit_limit > 0 ? Math.round((closing / c.credit_limit) * 100) : 0;

      let dueDateStr = c.payment_due_date;
      if (!dueDateStr) {
        const activeYearMonth = State.activeMonth === "all" ? "2026-10" : State.activeMonth;
        const dayStr = ("0" + (c.payment_due_day || 15)).slice(-2);
        dueDateStr = `${activeYearMonth}-${dayStr}`;
      }

      return `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td class="card-limit-val privacy-sensitive">₹${(c.credit_limit || 0).toLocaleString("en-IN")}</td>
          <td class="privacy-sensitive">₹${Math.round(spends).toLocaleString("en-IN")}</td>
          <td class="privacy-sensitive">₹${Math.round(paid).toLocaleString("en-IN")}</td>
          <td class="privacy-sensitive" style="font-weight: 700; color: ${closing > 0 ? 'var(--expense)' : 'var(--income)'}">
            ₹${Math.round(closing).toLocaleString("en-IN")}
          </td>
          <td>${formatPrettyDate(dueDateStr)}</td>
          <td class="privacy-sensitive">₹${Math.round(available).toLocaleString("en-IN")}</td>
          <td>${utilPct}% limit</td>
          <td>
            <div style="display:flex; align-items:center; gap:0.35rem;">
              <button class="btn btn-primary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="openPayCardBillModal('${c.name}', ${Math.round(closing)})">💳 Pay</button>
              <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onclick="openEditCardModal('${c.name}')">✏️</button>
            </div>
          </td>
        </tr>
      `;
    });

    tableRows.push(`
      <tr style="font-weight: 800; background: var(--bg-tertiary);">
        <td>TOTAL CREDIT CARDS</td>
        <td class="card-limit-val privacy-sensitive">₹${totalLimit.toLocaleString("en-IN")}</td>
        <td class="privacy-sensitive">₹${Math.round(totalSpend).toLocaleString("en-IN")}</td>
        <td class="privacy-sensitive">₹${Math.round(totalPaid).toLocaleString("en-IN")}</td>
        <td class="privacy-sensitive" style="color: var(--expense)">₹${Math.round(totalClosing).toLocaleString("en-IN")}</td>
        <td>-</td>
        <td class="privacy-sensitive">₹${Math.round(totalLimit - totalClosing).toLocaleString("en-IN")}</td>
        <td>${totalLimit > 0 ? Math.round((totalClosing / totalLimit) * 100) : 0}% aggregate</td>
        <td>-</td>
      </tr>
    `);

    tbody.innerHTML = tableRows.join("");
  }
}

// Transactions Table & Mobile Card View
function renderTransactionsTable() {
  const tbody = document.getElementById("transactionsTableBody");
  const mobileList = document.getElementById("mobileTransactionsList");
  if (!tbody && !mobileList) return;

  const search = (document.getElementById("txSearchInput")?.value || "").toLowerCase();
  const typeFilter = document.getElementById("txTypeFilter")?.value || "all";
  const accFilter = document.getElementById("txAccountFilter")?.value || "all";

  let txs = getFilteredTransactions().filter(t => t.status !== "pending_review");

  if (typeFilter !== "all") txs = txs.filter(t => t.transaction_type === typeFilter);
  if (accFilter !== "all") txs = txs.filter(t => t.account === accFilter);
  if (search) {
    txs = txs.filter(t => 
      (t.description && t.description.toLowerCase().includes(search)) ||
      (t.category && t.category.toLowerCase().includes(search)) ||
      (t.account && t.account.toLowerCase().includes(search))
    );
  }

  const countBadge = document.getElementById("txCountBadge");
  if (countBadge) countBadge.textContent = `${txs.length} Transactions`;

  if (txs.length === 0) {
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            ✨ Fresh start active since <strong>${State.booksStartDate}</strong>! No transactions recorded yet.<br>
            Click <strong>+ Add Transaction</strong> or let your Gmail script capture your first online transaction.
          </td>
        </tr>
      `;
    }
    if (mobileList) {
      mobileList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; background: var(--bg-secondary); border-radius: 16px; border: 1px dashed var(--border-color); color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">✨</div>
          <div style="font-weight: 700; color: var(--text-primary); margin-bottom: 0.25rem;">No Transactions Found</div>
          <div style="font-size: 0.8rem; line-height: 1.4;">Active since ${State.booksStartDate}. Tap "+ Add Transaction" below to log a spend.</div>
        </div>
      `;
    }
    return;
  }

  // Category Icon resolver
  const getCategoryIcon = (category, type) => {
    const c = (category || "").toLowerCase();
    if (c.includes("food") || c.includes("dining") || c.includes("swiggy") || c.includes("zomato")) return "🍔";
    if (c.includes("grocery") || c.includes("blinkit") || c.includes("zepto") || c.includes("instamart")) return "🛒";
    if (c.includes("fuel") || c.includes("petrol") || c.includes("diesel")) return "⛽";
    if (c.includes("travel") || c.includes("flight") || c.includes("train") || c.includes("uber") || c.includes("ola")) return "🚕";
    if (c.includes("shopping") || c.includes("amazon") || c.includes("flipkart") || c.includes("myntra")) return "🛍️";
    if (c.includes("bill") || c.includes("electricity") || c.includes("wifi") || c.includes("recharge")) return "💡";
    if (c.includes("salary") || c.includes("bonus") || type === "Income") return "💵";
    if (c.includes("invest") || c.includes("stock") || c.includes("mutual") || c.includes("zerodha") || type === "Savings") return "📈";
    if (c.includes("emi") || c.includes("loan") || type === "Debt") return "💳";
    if (type === "Transfer") return "🔄";
    if (c.includes("health") || c.includes("med") || c.includes("pharmacy")) return "💊";
    return "🏷️";
  };

  // 1. Desktop Table
  if (tbody) {
    tbody.innerHTML = txs.map(t => `
      <tr>
        <td style="white-space: nowrap;">${t.date}</td>
        <td><span class="type-pill ${t.transaction_type}">${t.transaction_type}</span></td>
        <td><span class="category-pill">${t.category}</span></td>
        <td style="font-weight: 700; ${t.transaction_type === 'Income' ? 'color: var(--income);' : ''}">
          ${t.transaction_type === 'Income' ? '+' : '-'}₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}
        </td>
        <td>${t.description || '-'}</td>
        <td style="font-size: 0.8rem; color: var(--text-secondary);">${t.account}${t.to_account ? ' ➔ ' + t.to_account : ''}</td>
        <td style="white-space: nowrap;">
          <button class="btn btn-icon" onclick="editTransaction('${t.id}')" title="Edit">✏️</button>
          <button class="btn btn-icon" onclick="deleteTransaction('${t.id}')" title="Delete">🗑️</button>
        </td>
      </tr>
    `).join("");
  }

  // 2. Mobile Responsive Card List (< 768px)
  if (mobileList) {
    mobileList.innerHTML = txs.map(t => {
      const isIncome = t.transaction_type === "Income";
      const icon = getCategoryIcon(t.category, t.transaction_type);
      const amtStr = `${isIncome ? '+' : '-'}₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}`;
      const descStr = t.description || t.category || "Untitled Transaction";
      const accStr = `${t.account}${t.to_account ? ' ➔ ' + t.to_account : ''}`;
      const typeLower = (t.transaction_type || "expense").toLowerCase();

      return `
        <div class="mobile-tx-card" onclick="editTransaction('${t.id}')">
          <div class="tx-card-icon-wrapper type-${typeLower}">
            <span>${icon}</span>
          </div>
          <div class="tx-card-info">
            <div class="tx-card-title">${descStr}</div>
            <div class="tx-card-meta">
              <span class="tx-card-date">${t.date}</span>
              <span class="tx-card-dot">•</span>
              <span class="tx-card-account-pill">${accStr}</span>
            </div>
          </div>
          <div class="tx-card-value-col">
            <div class="tx-card-amount ${isIncome ? 'val-income' : 'val-expense'}">${amtStr}</div>
            <span class="tx-card-cat-badge">${t.category}</span>
          </div>
          <div class="tx-card-actions" onclick="event.stopPropagation()">
            <button class="btn-tx-action" onclick="deleteTransaction('${t.id}')" title="Delete" aria-label="Delete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }
}

// Review Inbox
function renderReviewInbox() {
  const container = document.getElementById("reviewInboxList");
  if (!container) return;

  const pending = State.transactions.filter(t => t.status === "pending_review");

  if (pending.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; background: var(--bg-secondary); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
        <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎉</div>
        <h3>Inbox is All Clear!</h3>
        <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.25rem;">
          All online transactions from your Mail have been reviewed and approved.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
      <p style="font-size: 0.875rem; color: var(--text-secondary);">
        These transactions were automatically captured from bank alert emails. Verify their category head and click approve.
      </p>
      <button class="btn btn-primary" onclick="approveAllPending()">✓ Approve All (${pending.length})</button>
    </div>
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Account</th>
            <th>Merchant / Description</th>
            <th>Amount</th>
            <th>Bifurcation (Type)</th>
            <th>Category Head</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${pending.map(t => `
            <tr>
              <td>${t.date}</td>
              <td><span class="badge" style="background: #ea4335; color: #fff;">✉️ Gmail</span></td>
              <td>${t.account}</td>
              <td><strong>${t.description}</strong></td>
              <td style="font-weight: 800; font-size: 1rem; color: ${t.transaction_type === 'Income' ? 'var(--income)' : 'var(--text-primary)'}">
                ₹${parseFloat(t.amount || 0).toLocaleString("en-IN")}
              </td>
              <td>
                <select class="form-select" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" onchange="updatePendingType('${t.id}', this.value)">
                  <option value="Expense" ${t.transaction_type === 'Expense' ? 'selected' : ''}>Expense</option>
                  <option value="Income" ${t.transaction_type === 'Income' ? 'selected' : ''}>Income</option>
                  <option value="Debt" ${t.transaction_type === 'Debt' ? 'selected' : ''}>Debt</option>
                  <option value="Savings" ${t.transaction_type === 'Savings' ? 'selected' : ''}>Savings</option>
                  <option value="Transfer" ${t.transaction_type === 'Transfer' ? 'selected' : ''}>Transfer</option>
                </select>
              </td>
              <td>
                <select class="form-select" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;" onchange="updatePendingCategory('${t.id}', this.value)">
                  ${State.categories.map(c => `
                    <option value="${c.name}" ${t.category === c.name ? 'selected' : ''}>${c.name}</option>
                  `).join("")}
                </select>
              </td>
              <td style="white-space: nowrap;">
                <button class="btn btn-primary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem;" onclick="approveTransaction('${t.id}')">✓ Approve</button>
                <button class="btn btn-icon" style="padding: 0.35rem;" onclick="deleteTransaction('${t.id}')" title="Dismiss">✕</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function updateReviewBadge() {
  const pendingCount = State.transactions.filter(t => t.status === "pending_review").length;
  const badge = document.getElementById("reviewBadgeCount");
  if (badge) {
    badge.textContent = pendingCount;
    badge.style.display = pendingCount > 0 ? "inline-flex" : "none";
  }
}

function updatePendingCategory(id, newCat) {
  const tx = State.transactions.find(t => t.id === id);
  if (tx) {
    tx.category = newCat;
    saveLocalTransactions(State.transactions);
  }
}

function updatePendingType(id, newType) {
  const tx = State.transactions.find(t => t.id === id);
  if (tx) {
    tx.transaction_type = newType;
    saveLocalTransactions(State.transactions);
  }
}

async function approveTransaction(id) {
  const tx = State.transactions.find(t => t.id === id);
  if (tx) {
    tx.status = "approved";
    saveLocalTransactions(State.transactions);
    if (State.supabase) {
      await State.supabase.from("transactions").update({ status: "approved", category: tx.category, transaction_type: tx.transaction_type }).eq("id", id);
    }
    showToast("Transaction approved and added to ledger!", "success");
    renderApp();
  }
}

async function approveAllPending() {
  const pending = State.transactions.filter(t => t.status === "pending_review");
  pending.forEach(t => t.status = "approved");
  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    await State.supabase.from("transactions").update({ status: "approved" }).eq("status", "pending_review");
  }

  showToast(`All ${pending.length} transactions approved!`, "success");
  renderApp();
}

// Charts
function renderCharts() {
  const fin = calculateFinancials();
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  const textColor = isDark ? "#cbd5e1" : "#475569";

  const doughnutCanvas = document.getElementById("categoryDoughnutChart");
  if (doughnutCanvas && window.Chart) {
    const cats = Object.entries(fin.categoryTotals)
      .filter(([cat]) => !cat.startsWith("Card Bill Payment") && !cat.includes("Salary") && !cat.includes("Reimbursed"))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    const labels = cats.map(c => c[0]);
    const data = cats.map(c => c[1]);
    const colors = ["#f97316", "#ef4444", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4"];

    if (State.charts.categoryDoughnut) State.charts.categoryDoughnut.destroy();

    State.charts.categoryDoughnut = new Chart(doughnutCanvas, {
      type: "doughnut",
      data: {
        labels: labels.length > 0 ? labels : ["No Expenses Yet in Oct"],
        datasets: [{
          data: data.length > 0 ? data : [1],
          backgroundColor: data.length > 0 ? colors : ["#64748b"],
          borderWidth: 2,
          borderColor: isDark ? "#131b2e" : "#ffffff"
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "right", labels: { color: textColor, boxWidth: 12 } }
        },
        cutout: "65%"
      }
    });
  }

  const barCanvas = document.getElementById("cashflowBarChart");
  if (barCanvas && window.Chart) {
    if (State.charts.cashflowBar) State.charts.cashflowBar.destroy();

    State.charts.cashflowBar = new Chart(barCanvas, {
      type: "bar",
      data: {
        labels: ["Income", "Living Expenses", "Debt & EMIs", "Savings", "Net Balance"],
        datasets: [{
          label: "Amount (₹)",
          data: [fin.totalIncome, fin.totalExpense, fin.totalDebt, fin.totalSavings, fin.netLeftover],
          backgroundColor: ["#10b981", "#ef4444", "#b91c1c", "#0284c7", fin.netLeftover >= 0 ? "#4f46e5" : "#f43f5e"],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { ticks: { color: textColor } },
          x: { ticks: { color: textColor } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }
}

// ==========================================
// BOOKS OF ACCOUNTS & OPENING BALANCES SETUP
// ==========================================
function openBooksSetupModal() {
  document.getElementById("booksStartDateInput").value = State.booksStartDate;
  
  // Opening Rollover (Brought Forward from September)
  const activeMonthKey = State.activeMonth === "all" ? (State.booksStartDate ? State.booksStartDate.substring(0, 7) : "2026-10") : State.activeMonth;
  const rVal = (State.rollovers && State.rollovers[activeMonthKey] !== undefined)
    ? State.rollovers[activeMonthKey]
    : ((State.rollovers && State.rollovers["2026-10"] !== undefined) ? State.rollovers["2026-10"] : 0);
  const rolloverInput = document.getElementById("openBalRollover");
  if (rolloverInput) rolloverInput.value = rVal;

  // Bank accounts
  const hdfc = State.accounts.find(a => a.name === "HDFC Bank Account");
  const kotak = State.accounts.find(a => a.name === "Kotak Bank Account");
  const cash = State.accounts.find(a => a.name === "Cash");
  
  document.getElementById("openBalHdfc").value = hdfc ? (hdfc.opening_balance || 0) : 25000;
  document.getElementById("openBalKotak").value = kotak ? (kotak.opening_balance || 0) : 10000;
  document.getElementById("openBalCash").value = cash ? (cash.opening_balance || 0) : 1000;

  // Credit cards
  const cards = State.accounts.filter(a => a.type === "Credit Card");
  const cardsBox = document.getElementById("cardOpeningsList");
  if (cardsBox) {
    cardsBox.innerHTML = cards.map(c => `
      <div class="opening-row">
        <div>
          <strong>${c.name}</strong><br>
          <small style="color:var(--text-muted)">Limit: ₹${(c.credit_limit || 0).toLocaleString("en-IN")}</small>
        </div>
        <div>
          <input type="number" step="0.01" class="form-input card-open-input" data-card="${c.name}" value="${c.opening_balance || 0}" placeholder="Opening B/F">
        </div>
      </div>
    `).join("");
  }

  // Person ledgers
  const personsBox = document.getElementById("personOpeningsList");
  if (personsBox) {
    const persons = Object.keys(State.personOpeningBalances);
    personsBox.innerHTML = persons.map(name => `
      <div class="opening-row">
        <div>
          <strong>${name}</strong><br>
          <small style="color:var(--text-muted)">Opening Balance B/F (Receivable)</small>
        </div>
        <div>
          <input type="number" step="0.01" class="form-input person-open-input" data-person="${name}" value="${State.personOpeningBalances[name] || 0}" placeholder="0.00">
        </div>
      </div>
    `).join("");
  }

  document.getElementById("booksSetupModal").classList.add("active");
}

function autoSetRolloverFromLiquidCash() {
  const hdfc = parseFloat(document.getElementById("openBalHdfc") ? document.getElementById("openBalHdfc").value : 0) || 0;
  const kotak = parseFloat(document.getElementById("openBalKotak") ? document.getElementById("openBalKotak").value : 0) || 0;
  const cash = parseFloat(document.getElementById("openBalCash") ? document.getElementById("openBalCash").value : 0) || 0;
  const totalLiquid = Math.round((hdfc + kotak + cash) * 100) / 100;
  const rolloverInput = document.getElementById("openBalRollover");
  if (rolloverInput) {
    rolloverInput.value = totalLiquid;
    showToast(`Opening Rollover set to liquid cash sum: ₹${totalLiquid.toLocaleString("en-IN")}`, "info");
  }
}
window.autoSetRolloverFromLiquidCash = autoSetRolloverFromLiquidCash;

function closeBooksSetupModal() {
  document.getElementById("booksSetupModal").classList.remove("active");
}

function saveBooksSetup() {
  const startDate = document.getElementById("booksStartDateInput").value || "2026-10-01";
  State.booksStartDate = startDate;
  localStorage.setItem("tracker_books_start_date", startDate);

  // Rollover
  const activeMonthKey = State.activeMonth === "all" ? (State.booksStartDate ? State.booksStartDate.substring(0, 7) : "2026-10") : State.activeMonth;
  const rolloverInput = document.getElementById("openBalRollover");
  if (rolloverInput) {
    const rVal = parseFloat(rolloverInput.value) || 0;
    if (!State.rollovers) State.rollovers = {};
    State.rollovers[activeMonthKey] = rVal;
    localStorage.setItem("tracker_rollovers", JSON.stringify(State.rollovers));
  }

  // Bank accounts
  const hdfc = State.accounts.find(a => a.name === "HDFC Bank Account");
  if (hdfc) hdfc.opening_balance = parseFloat(document.getElementById("openBalHdfc").value) || 0;

  const kotak = State.accounts.find(a => a.name === "Kotak Bank Account");
  if (kotak) kotak.opening_balance = parseFloat(document.getElementById("openBalKotak").value) || 0;

  const cash = State.accounts.find(a => a.name === "Cash");
  if (cash) cash.opening_balance = parseFloat(document.getElementById("openBalCash").value) || 0;

  // Credit cards
  document.querySelectorAll(".card-open-input").forEach(input => {
    const cardName = input.getAttribute("data-card");
    const val = parseFloat(input.value) || 0;
    const card = State.accounts.find(a => a.name === cardName);
    if (card) card.opening_balance = val;
  });

  // Save account openings map
  const accOpenings = {};
  State.accounts.forEach(a => accOpenings[a.name] = a.opening_balance || 0);
  localStorage.setItem("tracker_account_openings", JSON.stringify(accOpenings));

  // Person openings
  document.querySelectorAll(".person-open-input").forEach(input => {
    const pName = input.getAttribute("data-person");
    const val = parseFloat(input.value) || 0;
    State.personOpeningBalances[pName] = val;
  });
  localStorage.setItem("tracker_person_opening_balances", JSON.stringify(State.personOpeningBalances));

  // Sync to Supabase settings for seamless multi-device consistency
  if (State.supabase) {
    State.supabase.from("settings").upsert({
      key: "books_setup",
      value: {
        startDate: startDate,
        accOpenings: accOpenings,
        personOpenings: State.personOpeningBalances,
        rollovers: State.rollovers,
        updatedAt: new Date().toISOString()
      },
      updated_at: new Date().toISOString()
    }, { onConflict: "key" }).then(() => {
      console.log("Books setup successfully synced to Supabase cloud");
    }).catch(err => {
      console.warn("Could not sync books_setup to Supabase:", err);
    });

    State.supabase.from("settings").upsert({
      key: "rollovers",
      value: State.rollovers,
      updated_at: new Date().toISOString()
    }, { onConflict: "key" }).catch(() => {});
  }

  showToast(`Books of Accounts configured starting from ${startDate}!`, "success");
  closeBooksSetupModal();
  populateMonthFilter();
  renderApp();
}

function freshStartFromDate() {
  const startDate = document.getElementById("booksStartDateInput").value || "2026-10-01";
  if (!confirm(`Are you sure you want to clear historical transactions and start fresh from ${startDate}? Old transactions will be safely archived.`)) {
    return;
  }

  // Clear active transactions, keep fresh slate
  State.transactions = [];
  saveLocalTransactions(State.transactions);

  // Set active month to start date month
  State.activeMonth = startDate.substring(0, 7);
  localStorage.setItem("tracker_active_month", State.activeMonth);

  saveBooksSetup();
  showToast(`Clean fresh start active from ${startDate}! 0 transactions in active ledger.`, "success");
}

function restoreArchivedData() {
  if (!confirm("Do you want to restore the 153 historical transactions (July - Sept 2026) from the Excel backup?")) return;
  if (window.ARCHIVED_DATA && window.ARCHIVED_DATA.transactions) {
    State.transactions = [...window.ARCHIVED_DATA.transactions];
    saveLocalTransactions(State.transactions);
    State.booksStartDate = "2026-07-01";
    localStorage.setItem("tracker_books_start_date", "2026-07-01");
    State.activeMonth = "all";
    localStorage.setItem("tracker_active_month", "all");
    showToast("Restored 153 historical transactions from Excel backup!", "success");
    closeBooksSetupModal();
    populateMonthFilter();
    renderApp();
  }
}

// ==========================================
// 1-CLICK EXCEL SETUP IMPORT & DOWNLOAD
// ==========================================
function downloadSetupExcelTemplate() {
  const link = document.createElement("a");
  link.href = "Dhruv_Financial_OS_Setup_Template.xlsx";
  link.download = "Dhruv_Financial_OS_Setup_Template.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Downloading Dhruv_Financial_OS_Setup_Template.xlsx...", "info");
}

async function handleExcelSetupUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  if (typeof XLSX === "undefined") {
    showToast("Excel parser library is loading. Please try again in a moment.", "warning");
    return;
  }

  showToast("Reading setup workbook...", "info");

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      let importCount = 0;

      // 1. Opening_Balances
      const openSheetName = workbook.SheetNames.find(s => /opening/i.test(s));
      if (openSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[openSheetName], { header: 1 });
        const activeMonthKey = State.activeMonth === "all" ? (State.booksStartDate ? State.booksStartDate.substring(0, 7) : "2026-10") : State.activeMonth;
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const accName = String(row[0]).trim();
          const accType = row[1] ? String(row[1]).trim() : "";
          const openBal = parseFloat(row[2]) || 0;
          const startDate = row[3] ? String(row[3]).trim() : null;
          const desc = row[4] ? String(row[4]).trim() : "";

          if (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
            State.booksStartDate = startDate;
            localStorage.setItem("tracker_books_start_date", startDate);
            const dateInput = document.getElementById("booksStartDateInput");
            if (dateInput) dateInput.value = startDate;
          }

          // Check if this row is Opening Rollover
          if (accName.toLowerCase().includes("rollover") || accType.toLowerCase().includes("rollover") || desc.toLowerCase().includes("rollover")) {
            if (!State.rollovers) State.rollovers = {};
            const rMonth = (startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) ? startDate.substring(0, 7) : activeMonthKey;
            State.rollovers[rMonth] = openBal;
            localStorage.setItem("tracker_rollovers", JSON.stringify(State.rollovers));
            const rolloverInput = document.getElementById("openBalRollover");
            if (rolloverInput) rolloverInput.value = openBal;
            importCount++;
            continue;
          }

          let acc = State.accounts.find(a => a.name.toLowerCase() === accName.toLowerCase());
          if (!acc) {
            acc = State.accounts.find(a => a.name.toLowerCase().includes(accName.toLowerCase()) || accName.toLowerCase().includes(a.name.toLowerCase()));
          }
          if (acc) {
            acc.opening_balance = openBal;
            importCount++;
          }
        }
      }

      // 2. Credit_Cards_Vault
      const cardSheetName = workbook.SheetNames.find(s => /card/i.test(s));
      if (cardSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[cardSheetName], { header: 1 });
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const cardName = String(row[0]).trim();
          const issuer = row[1] ? String(row[1]).trim() : "Bank";
          const network = row[2] ? String(row[2]).trim() : "Visa";
          const last4 = row[3] ? String(row[3]).trim() : "";
          const limit = parseFloat(row[4]) || 0;
          const cycleDay = parseInt(row[5]) || 1;
          const dueDate = row[6] ? String(row[6]).trim() : "";

          // Vault credentials
          const cardNum = row[7] ? String(row[7]).replace(/\s+/g, "").trim() : "";
          const expiry = row[8] ? String(row[8]).trim() : "";
          const cvv = row[9] ? String(row[9]).trim() : "";
          const pin = row[10] ? String(row[10]).trim() : "";

          let card = State.accounts.find(a => a.name.toLowerCase() === cardName.toLowerCase());
          if (!card) {
            card = State.accounts.find(a => a.name.toLowerCase().includes(cardName.toLowerCase()) || cardName.toLowerCase().includes(a.name.toLowerCase()));
          }

          if (card) {
            card.credit_limit = limit || card.credit_limit;
            card.billing_cycle_day = cycleDay || card.billing_cycle_day;
            if (dueDate) card.payment_due_date = dueDate;
            if (last4) card.last4 = last4;
            if (network) card.network = network;
          } else {
            card = {
              name: cardName,
              type: "Credit Card",
              color: "#4f46e5",
              opening_balance: 0,
              credit_limit: limit,
              billing_cycle_day: cycleDay,
              payment_due_date: dueDate || "2026-10-15",
              last4: last4 || "••••",
              network: network,
              is_active: true
            };
            State.accounts.push(card);
          }

          if (cardNum || expiry || cvv || pin) {
            if (!State.decryptedVault) State.decryptedVault = {};
            State.decryptedVault[card.name] = {
              cardNumber: cardNum || (State.decryptedVault[card.name] && State.decryptedVault[card.name].cardNumber) || "",
              expiry: expiry || (State.decryptedVault[card.name] && State.decryptedVault[card.name].expiry) || "",
              cvv: cvv || (State.decryptedVault[card.name] && State.decryptedVault[card.name].cvv) || "",
              pin: pin || (State.decryptedVault[card.name] && State.decryptedVault[card.name].pin) || ""
            };
          }
          importCount++;
        }
      }

      // 3. Person_Ledgers
      const personSheetName = workbook.SheetNames.find(s => /person/i.test(s));
      if (personSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[personSheetName], { header: 1 });
        if (!State.personOpeningBalances) State.personOpeningBalances = {};
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const personName = String(row[0]).trim();
          const openBal = parseFloat(row[2]) || 0;
          State.personOpeningBalances[personName] = openBal;

          const paidCat = `${personName} - Paid`;
          const reimbCat = `${personName} - Reimbursed`;
          if (!State.categories.some(c => c.name === paidCat)) {
            State.categories.push({ id: "cat_" + Date.now() + Math.random(), name: paidCat, type: "Expense", budget: 0 });
          }
          if (!State.categories.some(c => c.name === reimbCat)) {
            State.categories.push({ id: "cat_" + Date.now() + Math.random(), name: reimbCat, type: "Income", budget: 0 });
          }
          importCount++;
        }
      }

      // 4. Loans_and_EMIs
      const emiSheetName = workbook.SheetNames.find(s => /emi|loan/i.test(s));
      if (emiSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[emiSheetName], { header: 1 });
        const newEmis = [];
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const name = String(row[0]).trim();
          const card = row[1] ? String(row[1]).trim() : "Credit Card";
          const orig = parseFloat(row[2]) || 0;
          const monthly = parseFloat(row[3]) || 0;
          const tenure = parseInt(row[4]) || 12;
          const remaining = parseInt(row[6]) !== undefined ? parseInt(row[6]) : tenure;
          const status = row[7] ? String(row[7]).trim() : "Active";
          newEmis.push({
            name: name,
            card: card,
            original_amount: orig,
            monthly_emi: monthly,
            total_tenure: tenure,
            months_remaining: remaining,
            status: status
          });
          importCount++;
        }
        if (newEmis.length > 0) {
          State.emiSchedule = newEmis;
          localStorage.setItem("tracker_emi_schedule", JSON.stringify(State.emiSchedule));
        }
      }

      // 5. Budget_Categories
      const catSheetName = workbook.SheetNames.find(s => /category|budget/i.test(s));
      if (catSheetName) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[catSheetName], { header: 1 });
        for (let i = 2; i < rows.length; i++) {
          const row = rows[i];
          if (!row || !row[0]) continue;
          const catName = String(row[0]).trim();
          const catType = row[1] ? String(row[1]).trim() : "Expense";
          const budget = parseFloat(row[2]) || 0;
          let cat = State.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
          if (cat) {
            cat.budget = budget;
          } else {
            State.categories.push({ id: "cat_" + Date.now() + Math.random(), name: catName, type: catType, budget: budget });
          }
        }
      }

      // Persist to localStorage
      localStorage.setItem("tracker_accounts", JSON.stringify(State.accounts));
      const accOpenings = {};
      State.accounts.forEach(a => accOpenings[a.name] = a.opening_balance || 0);
      localStorage.setItem("tracker_account_openings", JSON.stringify(accOpenings));
      localStorage.setItem("tracker_person_opening_balances", JSON.stringify(State.personOpeningBalances));
      localStorage.setItem("tracker_categories", JSON.stringify(State.categories));
      localStorage.setItem("tracker_rollovers", JSON.stringify(State.rollovers));

      // Sync books setup to Supabase cloud if connected
      if (State.supabase) {
        State.supabase.from("settings").upsert({
          key: "books_setup",
          value: {
            startDate: State.booksStartDate,
            accOpenings: accOpenings,
            personOpenings: State.personOpeningBalances,
            rollovers: State.rollovers,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: "key" }).catch(() => {});

        State.supabase.from("settings").upsert({
          key: "rollovers",
          value: State.rollovers,
          updated_at: new Date().toISOString()
        }, { onConflict: "key" }).catch(() => {});
      }

      if (typeof saveEncryptedVaultToStorage === "function") {
        saveEncryptedVaultToStorage();
      }

      showToast(`✓ Excel Setup Imported! Configured ${importCount} items successfully.`, "success");
      closeBooksSetupModal();
      populateMonthFilter();
      renderApp();

      event.target.value = "";
    } catch (err) {
      console.error("Excel import error:", err);
      showToast("Error importing Excel file: " + (err.message || "Invalid format"), "danger");
    }
  };
  reader.readAsArrayBuffer(file);
}

// ==========================================
// ADD / EDIT TRANSACTION MODAL
// ==========================================
function openAddTransactionModal() {
  State.editingTxId = null;
  document.getElementById("modalTitle").textContent = "Add New Transaction";
  document.getElementById("txDateInput").value = new Date().toISOString().split("T")[0];
  document.getElementById("txAmountInput").value = "";
  document.getElementById("txDescInput").value = "";
  setTransactionTypeBtn("Expense");
  updateCategoryDropdownForType("Expense");
  document.getElementById("txModal").classList.add("active");
  document.getElementById("txAmountInput").focus();
}

function closeModal() {
  document.getElementById("txModal").classList.remove("active");
}

function handleTypeBtnClick(btn) {
  const type = btn.getAttribute("data-type");
  setTransactionTypeBtn(type);
  updateCategoryDropdownForType(type);
}

async function saveTransaction() {
  const type = document.getElementById("txTypeInput").value;
  const date = document.getElementById("txDateInput").value;
  const amount = parseFloat(document.getElementById("txAmountInput").value);
  const category = document.getElementById("txCategoryInput").value;
  const account = document.getElementById("txAccountInput").value;
  const desc = document.getElementById("txDescInput").value;

  if (!amount || amount <= 0) {
    alert("Please enter a valid amount!");
    return;
  }

  const tx = {
    id: State.editingTxId || "tx_" + Date.now(),
    date: date,
    transaction_type: type,
    category: category,
    amount: amount,
    description: desc,
    account: account,
    status: "approved",
    source: "manual",
    created_at: new Date().toISOString()
  };

  if (State.editingTxId) {
    const idx = State.transactions.findIndex(t => t.id === State.editingTxId);
    if (idx !== -1) State.transactions[idx] = tx;
  } else {
    State.transactions.unshift(tx);
  }

  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    try {
      const { error: sbErr } = await State.supabase.from("transactions").upsert(tx);
      if (sbErr) {
        console.error("Supabase upsert error:", sbErr);
        showToast("Cloud sync failed: " + sbErr.message, "error");
      }
    } catch (e) {
      console.warn("Supabase upsert exception:", e);
    }
  }

  showToast("Transaction saved successfully!", "success");
  closeModal();
  renderApp();
}

function editTransaction(id) {
  const tx = State.transactions.find(t => t.id === id);
  if (!tx) return;

  State.editingTxId = id;
  document.getElementById("modalTitle").textContent = "Edit Transaction";
  document.getElementById("txDateInput").value = tx.date;
  document.getElementById("txAmountInput").value = tx.amount;
  document.getElementById("txDescInput").value = tx.description;
  setTransactionTypeBtn(tx.transaction_type);
  updateCategoryDropdownForType(tx.transaction_type);
  document.getElementById("txCategoryInput").value = tx.category;
  document.getElementById("txAccountInput").value = tx.account;

  document.getElementById("txModal").classList.add("active");
}

async function deleteTransaction(id) {
  if (!confirm("Are you sure you want to delete this transaction?")) return;

  State.transactions = State.transactions.filter(t => t.id !== id);
  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    try {
      const { error: sbErr } = await State.supabase.from("transactions").delete().eq("id", id);
      if (sbErr) {
        console.error("Supabase delete error:", sbErr);
        showToast("Cloud delete failed: " + sbErr.message, "error");
      }
    } catch (e) {
      console.warn("Supabase delete exception:", e);
    }
  }

  showToast("Transaction deleted.", "info");
  renderApp();
}

// ==========================================
// INTERNAL TRANSFER ACTION
// ==========================================
function openTransferModal() {
  document.getElementById("transferDateInput").value = new Date().toISOString().split("T")[0];
  document.getElementById("transferAmountInput").value = "";
  document.getElementById("transferNoteInput").value = "";
  document.getElementById("transferModal").classList.add("active");
}

function closeTransferModal() {
  document.getElementById("transferModal").classList.remove("active");
}

async function executeInternalTransfer() {
  const fromAcc = document.getElementById("transferFromInput").value;
  const toAcc = document.getElementById("transferToInput").value;
  const amount = parseFloat(document.getElementById("transferAmountInput").value);
  const date = document.getElementById("transferDateInput").value;
  const note = document.getElementById("transferNoteInput").value;

  if (fromAcc === toAcc) {
    alert("Source and Destination accounts must be different!");
    return;
  }
  if (!amount || amount <= 0) {
    alert("Please enter a valid transfer amount!");
    return;
  }

  const tx = {
    id: "tx_" + Date.now(),
    date: date,
    transaction_type: "Transfer",
    category: "Internal Transfer (Between Accounts)",
    amount: amount,
    description: note || `Transfer: ${fromAcc} ➔ ${toAcc}`,
    account: fromAcc,
    to_account: toAcc,
    status: "approved",
    source: "manual",
    created_at: new Date().toISOString()
  };

  State.transactions.unshift(tx);
  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    try {
      const { error: sbErr } = await State.supabase.from("transactions").insert(tx);
      if (sbErr) {
        console.error("Supabase transfer error:", sbErr);
        showToast("Cloud transfer failed: " + sbErr.message, "error");
      }
    } catch (e) {
      console.warn("Supabase transfer exception:", e);
    }
  }

  showToast(`Transferred ₹${amount} from ${fromAcc} to ${toAcc}!`, "success");
  closeTransferModal();
  renderApp();
}

// ==========================================
// DYNAMIC PERSON LEDGER CREATION
// ==========================================
function openAddPersonModal() {
  document.getElementById("newPersonNameInput").value = "";
  document.getElementById("newPersonOpeningInput").value = "0.00";
  document.getElementById("personModal").classList.add("active");
}

function closePersonModal() {
  document.getElementById("personModal").classList.remove("active");
}

function saveNewPerson() {
  const name = document.getElementById("newPersonNameInput").value.trim();
  const openBal = parseFloat(document.getElementById("newPersonOpeningInput").value) || 0;
  if (!name) {
    alert("Please enter a person's name!");
    return;
  }

  const paidCat = `${name} - Paid`;
  const reimbCat = `${name} - Reimbursed`;

  if (!State.categories.some(c => c.name === paidCat)) {
    State.categories.push({ name: paidCat, type: "Expense", icon: "user-check", color: "#8b5cf6" });
  }
  if (!State.categories.some(c => c.name === reimbCat)) {
    State.categories.push({ name: reimbCat, type: "Income", icon: "refresh-cw", color: "#34d399" });
  }

  State.personOpeningBalances[name] = openBal;
  localStorage.setItem("tracker_person_opening_balances", JSON.stringify(State.personOpeningBalances));

  populateCategorySelects();
  showToast(`Created new ledger for ${name} with ₹${openBal} opening balance!`, "success");
  closePersonModal();
  renderApp();
}

// ==========================================
// GOOGLE GEMINI AI COPILOT CHAT DRAWER
// ==========================================
function toggleGeminiChat() {
  const drawer = document.getElementById("geminiChatDrawer");
  if (drawer) {
    drawer.classList.toggle("open");
    if (drawer.classList.contains("open")) {
      document.getElementById("geminiChatInput")?.focus();
      scrollChatToBottom();
    }
  }
}

function scrollChatToBottom() {
  const box = document.getElementById("geminiChatMessages");
  if (box) box.scrollTop = box.scrollHeight;
}

function handleQuickPrompt(chip) {
  const text = chip.textContent.replace(/^[✨💬📊💰🔄]\s*/, "");
  const input = document.getElementById("geminiChatInput");
  if (input) {
    input.value = text;
    sendGeminiChatMessage();
  }
}

async function sendGeminiChatMessage() {
  const input = document.getElementById("geminiChatInput");
  const prompt = input.value.trim();
  if (!prompt) return;

  State.chatHistory.push({ sender: "user", text: prompt });
  input.value = "";
  renderChatMessages();

  State.chatHistory.push({ sender: "assistant", text: "💭 Thinking...", isTyping: true });
  renderChatMessages();

  try {
    const responseText = await processWithGemini(prompt);
    State.chatHistory = State.chatHistory.filter(m => !m.isTyping);
    State.chatHistory.push({ sender: "assistant", text: responseText });
  } catch (err) {
    State.chatHistory = State.chatHistory.filter(m => !m.isTyping);
    State.chatHistory.push({ sender: "assistant", text: `⚠️ Error: ${err.message}` });
  }

  renderChatMessages();
}

function renderChatMessages() {
  const box = document.getElementById("geminiChatMessages");
  if (!box) return;

  box.innerHTML = State.chatHistory.map(m => `
    <div class="chat-msg ${m.sender}">
      ${m.text}
    </div>
  `).join("");

  scrollChatToBottom();
}

// Gemini Brain + Fallback Natural Language Processor
async function processWithGemini(userPrompt) {
  const fin = calculateFinancials();
  const lower = userPrompt.toLowerCase();

  // 1. Balance queries
  if (lower.includes("balance") || lower.includes("how much money")) {
    return `💰 **Your Live Bank Balances (Books Start ${State.booksStartDate}):**\n- **HDFC Bank Account:** ₹${Math.round(fin.hdfcBalance).toLocaleString("en-IN")}\n- **Kotak Bank Account:** ₹${Math.round(fin.kotakBalance).toLocaleString("en-IN")}\n- **Cash in Hand:** ₹${Math.round(fin.cashBalance).toLocaleString("en-IN")}\n\n*Combined Liquid Cash: ₹${Math.round(fin.hdfcBalance + fin.kotakBalance + fin.cashBalance).toLocaleString("en-IN")}*`;
  }

  // 2. Spending queries
  if (lower.includes("spend") || lower.includes("outflow") || lower.includes("expenses")) {
    return `📊 **Spending Summary for ${State.activeMonth}:**\n- **Direct Living Expenses:** ₹${Math.round(fin.totalExpense).toLocaleString("en-IN")}\n- **Debt / EMIs:** ₹${Math.round(fin.totalDebt).toLocaleString("en-IN")}\n- **Savings:** ₹${Math.round(fin.totalSavings).toLocaleString("en-IN")}\n- **Total Outflow:** ₹${Math.round(fin.totalOutflows).toLocaleString("en-IN")}\n- **Net Leftover:** ₹${Math.round(fin.netLeftover).toLocaleString("en-IN")}`;
  }

  // 3. Person inquiry (Dad, Bismarck, Anant, etc.)
  for (const person of fin.peopleLedgers) {
    if (lower.includes(person.name.toLowerCase())) {
      const isOwed = person.balanceReceivable > 0;
      return `🤝 **${person.name} Ledger Status:**\n- Opening B/F: ₹${Math.round(person.openingBalance || 0).toLocaleString("en-IN")}\n- Total Paid by you: ₹${Math.round(person.totalPaid).toLocaleString("en-IN")}\n- Total Reimbursed: ₹${Math.round(person.totalReimbursed).toLocaleString("en-IN")}\n- **Net Balance:** ₹${Math.abs(Math.round(person.balanceReceivable)).toLocaleString("en-IN")} ${isOwed ? '(You are owed this)' : '✓ Fully settled'}`;
    }
  }

  // 4. Quick natural language transaction addition: e.g. "Add 500 for dinner at Swiggy via HDFC"
  const addMatch = userPrompt.match(/(?:add|paid|spent|bought)\s+(?:rs\.?|inr)?\s*([0-9]+(?:\.[0-9]{1,2})?)\s+(?:for|on)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:via|from|using)\s+([a-zA-Z0-9\s]+))?$/i);
  if (addMatch) {
    const amt = parseFloat(addMatch[1]);
    const desc = addMatch[2].trim();
    const rawAcc = addMatch[3] ? addMatch[3].trim().toLowerCase() : "hdfc";

    let acc = "HDFC Bank Account";
    if (rawAcc.includes("kotak")) acc = "Kotak Bank Account";
    else if (rawAcc.includes("cash")) acc = "Cash";
    else if (rawAcc.includes("amazon")) acc = "ICICI - Amazon Pay Credit Card";
    else if (rawAcc.includes("coral")) acc = "ICICI - Coral Credit Card";
    else if (rawAcc.includes("amex")) acc = "American Express Credit Card";

    const rule = autoClassifyText(desc) || { type: "Expense", category: "Food & Dining" };

    const tx = {
      id: "tx_" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      transaction_type: rule.type,
      category: rule.category,
      amount: amt,
      description: desc,
      account: acc,
      status: "approved",
      source: "gemini_ai",
      created_at: new Date().toISOString()
    };

    State.transactions.unshift(tx);
    saveLocalTransactions(State.transactions);
    if (State.supabase) await State.supabase.from("transactions").insert(tx);

    renderApp();
    return `✅ **Logged Transaction!**\n- **Amount:** ₹${amt}\n- **Category:** ${rule.category} (${rule.type})\n- **Account:** ${acc}\n- **Description:** ${desc}`;
  }

  // 5. Transfer command: e.g. "Transfer 5000 from Kotak to HDFC"
  const transferMatch = userPrompt.match(/transfer\s+(?:rs\.?|inr)?\s*([0-9]+)\s+from\s+([a-zA-Z0-9\s]+)\s+to\s+([a-zA-Z0-9\s]+)/i);
  if (transferMatch) {
    const amt = parseFloat(transferMatch[1]);
    const fromStr = transferMatch[2].trim().toLowerCase();
    const toStr = transferMatch[3].trim().toLowerCase();

    const fromAcc = fromStr.includes("kotak") ? "Kotak Bank Account" : fromStr.includes("cash") ? "Cash" : "HDFC Bank Account";
    const toAcc = toStr.includes("kotak") ? "Kotak Bank Account" : toStr.includes("cash") ? "Cash" : "HDFC Bank Account";

    const tx = {
      id: "tx_" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      transaction_type: "Transfer",
      category: "Internal Transfer (Between Accounts)",
      amount: amt,
      description: `Gemini Transfer: ${fromAcc} ➔ ${toAcc}`,
      account: fromAcc,
      to_account: toAcc,
      status: "approved",
      source: "gemini_ai",
      created_at: new Date().toISOString()
    };

    State.transactions.unshift(tx);
    saveLocalTransactions(State.transactions);
    if (State.supabase) await State.supabase.from("transactions").insert(tx);

    renderApp();
    return `🔄 **Completed Internal Transfer!**\nTransferred ₹${amt.toLocaleString("en-IN")} from **${fromAcc}** to **${toAcc}**. Your live bank balances have been updated!`;
  }

  // 6. Live Gemini API
  if (State.geminiApiKey) {
    try {
      const apiResp = await callLiveGeminiApi(userPrompt, fin);
      return apiResp;
    } catch (e) {
      console.warn("Live Gemini call failed:", e);
    }
  }

  return `💡 I'm here to help you manage your finances! You can ask me:\n- *"What is my live HDFC and Kotak balance?"*\n- *"How much does Bismarck or Dad owe me?"*\n- *"Add 350 for petrol via HDFC"*\n- *"Transfer 2000 from Kotak to HDFC"*\n\n*(Tip: Add your Gemini API key in ⚙️ Settings for full generative reasoning!)*`;
}

async function callLiveGeminiApi(prompt, fin) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${State.geminiApiKey}`;
  const systemPrompt = `You are Dhruv's personal financial copilot. 
Here is his current financial snapshot (Books Start: ${State.booksStartDate}):
- HDFC Bank Balance: ₹${fin.hdfcBalance}
- Kotak Bank Balance: ₹${fin.kotakBalance}
- Cash in Hand: ₹${fin.cashBalance}
- Total Spends This Month: ₹${fin.totalExpense}
- Total Income: ₹${fin.totalIncome}
- Net Balance: ₹${fin.netLeftover}
Answer Dhruv concisely, warmly, and accurately.`;

  const body = {
    contents: [
      { role: "user", parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }] }
    ]
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const json = await res.json();
  if (json.candidates && json.candidates[0].content.parts[0].text) {
    return json.candidates[0].content.parts[0].text;
  }
  throw new Error("No response from Gemini API");
}

// Quick Parser Live Tool
function autoClassifyText(text) {
  const lower = text.toLowerCase();
  for (const rule of MERCHANT_RULES) {
    for (const keyword of rule.match) {
      if (lower.includes(keyword)) {
        return { type: rule.type, category: rule.category };
      }
    }
  }
  return null;
}

function runLiveParser(rawText) {
  const previewBox = document.getElementById("parserResultPreview");
  if (!previewBox) return;

  if (!rawText.trim()) {
    previewBox.style.display = "none";
    return;
  }

  const amtMatch = rawText.match(/(?:Rs\.?|INR)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i);
  const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, "")) : 0;

  let detectedAcc = "HDFC Bank Account";
  const lower = rawText.toLowerCase();
  if (lower.includes("amazon pay")) detectedAcc = "ICICI - Amazon Pay Credit Card";
  else if (lower.includes("coral")) detectedAcc = "ICICI - Coral Credit Card";
  else if (lower.includes("amex") || lower.includes("american express")) detectedAcc = "American Express Credit Card";
  else if (lower.includes("pixel")) detectedAcc = "HDFC - Pixel Play Credit Card";
  else if (lower.includes("moneyback")) detectedAcc = "HDFC - Money Back Plus Credit Card";
  else if (lower.includes("roar")) detectedAcc = "Roar CC Rupay";
  else if (lower.includes("kotak")) detectedAcc = "Kotak Bank Account";

  // Check if this text is a credit card statement or payment due intimation
  const isStatement = /statement|due\s+date|bill\s+generated|total\s+amount\s+due|total\s+due/i.test(rawText);
  if (isStatement) {
    const dueMatch = rawText.match(/(?:due\s+date|pay\s+by|due\s+on)\s*(?::|-)?\s*([0-9]{1,2}[-\/\.][0-9]{1,2}[-\/\.][0-9]{2,4}|[0-9]{1,2}\s+[a-zA-Z]{3,9}\s+[0-9]{2,4})/i);
    const parsedDueDate = dueMatch ? parseDateFlexible(dueMatch[1].trim()) : "";

    previewBox.style.display = "block";
    previewBox.innerHTML = `
      <div style="background: var(--bg-tertiary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--warning); border-left: 4px solid var(--warning);">
        <h4 style="margin-bottom: 0.5rem; color: var(--warning);">💳 Detected Credit Card Statement & Due Date</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
          <div><small style="color:var(--text-muted)">Card Detected</small><br><strong>${detectedAcc}</strong></div>
          <div><small style="color:var(--text-muted)">Total Bill Due</small><br><strong style="color:var(--expense)">₹${amount.toLocaleString("en-IN")}</strong></div>
          <div><small style="color:var(--text-muted)">Payment Due Date</small><br><strong>${parsedDueDate ? formatPrettyDate(parsedDueDate) : 'Auto-Scheduled'}</strong></div>
          <div><small style="color:var(--text-muted)">Alert Status</small><br><span class="badge" style="background:var(--warning); color:#fff;">Due Date Alert</span></div>
        </div>
        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
          <button class="btn btn-primary" onclick="applyParsedCardStatement('${detectedAcc}', ${amount}, '${parsedDueDate}')">
            💳 Update Card Due Date & Add Alert
          </button>
          <button class="btn btn-secondary" onclick="addParsedTransaction(${amount}, 'Transfer', 'Card Bill Payment - ${detectedAcc.replace(' Credit Card', '').trim()}', 'HDFC Bank Account')">
            Record as Card Bill Paid
          </button>
        </div>
      </div>
    `;
    return;
  }

  const isCredit = /credited|received|refund/i.test(rawText) && !/debited|spent/i.test(rawText);
  let detectedType = isCredit ? "Income" : "Expense";
  let detectedCat = isCredit ? "Other Income" : "Other Expense";

  const rule = autoClassifyText(rawText);
  if (rule) {
    detectedType = rule.type;
    detectedCat = rule.category;
  }

  previewBox.style.display = "block";
  previewBox.innerHTML = `
    <div style="background: var(--bg-tertiary); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <h4 style="margin-bottom: 0.5rem; color: var(--primary);">✨ Parsed Transaction Preview</h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
        <div><small style="color:var(--text-muted)">Amount</small><br><strong>₹${amount.toLocaleString("en-IN")}</strong></div>
        <div><small style="color:var(--text-muted)">Type</small><br><span class="type-pill ${detectedType}">${detectedType}</span></div>
        <div><small style="color:var(--text-muted)">Category</small><br><span class="category-pill">${detectedCat}</span></div>
        <div><small style="color:var(--text-muted)">Account</small><br><strong>${detectedAcc}</strong></div>
      </div>
      <button class="btn btn-primary" onclick="addParsedTransaction(${amount}, '${detectedType}', '${detectedCat}', '${detectedAcc}')">
        + Add To Tracker Now
      </button>
    </div>
  `;
}

async function addParsedTransaction(amount, type, cat, acc) {
  const tx = {
    id: "tx_" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    transaction_type: type,
    category: cat,
    amount: amount,
    description: "Parsed via Quick Tool",
    account: acc,
    status: "approved",
    source: "manual",
    created_at: new Date().toISOString()
  };

  State.transactions.unshift(tx);
  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    try {
      await State.supabase.from("transactions").insert(tx);
    } catch (e) {}
  }

  showToast("Parsed transaction saved!", "success");
  document.getElementById("smartParserInput").value = "";
  document.getElementById("parserResultPreview").style.display = "none";
  renderApp();
}

// Settings
function openSettingsModal() {
  document.getElementById("sbUrlInput").value = State.supabaseConfig.url;
  document.getElementById("sbKeyInput").value = State.supabaseConfig.key;
  document.getElementById("geminiKeyInput").value = State.geminiApiKey;
  
  // Security & Passcode fields
  const pinCheck = document.getElementById("securityPinEnabledCheckbox");
  if (pinCheck) pinCheck.checked = State.security.pinEnabled;
  
  const pinSec = document.getElementById("pinConfigSection");
  if (pinSec) pinSec.style.display = State.security.pinEnabled ? "block" : "none";

  const pinInput = document.getElementById("masterPinInput");
  if (pinInput) pinInput.value = State.security.pinHash ? "••••" : "";

  const autoLockSelect = document.getElementById("autoLockTimeoutSelect");
  if (autoLockSelect) autoLockSelect.value = State.security.autoLockTimeout;

  document.getElementById("settingsModal").classList.add("active");
}

function togglePinSecurityOption() {
  const pinCheck = document.getElementById("securityPinEnabledCheckbox");
  const pinSec = document.getElementById("pinConfigSection");
  if (pinSec && pinCheck) {
    pinSec.style.display = pinCheck.checked ? "block" : "none";
  }
}

function closeSettingsModal() {
  document.getElementById("settingsModal").classList.remove("active");
}

async function saveSupabaseSettings() {
  const rawUrl = document.getElementById("sbUrlInput").value.trim();
  const url = cleanSupabaseUrl(rawUrl);
  const key = document.getElementById("sbKeyInput").value.trim();
  const gKey = document.getElementById("geminiKeyInput").value.trim();

  State.supabaseConfig.url = url;
  State.supabaseConfig.key = key;
  State.geminiApiKey = gKey;

  localStorage.setItem("tracker_sb_url", url);
  localStorage.setItem("tracker_sb_key", key);
  localStorage.setItem("tracker_gemini_key", gKey);

  // Handle Security & PIN Settings
  const pinCheck = document.getElementById("securityPinEnabledCheckbox");
  const pinInput = document.getElementById("masterPinInput");
  const autoLockSelect = document.getElementById("autoLockTimeoutSelect");

  if (pinCheck && pinCheck.checked) {
    const enteredPin = pinInput ? pinInput.value.trim() : "";
    if (enteredPin && enteredPin !== "••••") {
      if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
        showToast("Passcode must be exactly 4 digits!", "warning");
        return;
      }
      const salt = VaultCrypto.generateSalt();
      const hash = await VaultCrypto.hashPin(enteredPin, salt);
      State.security.pinEnabled = true;
      State.security.pinHash = hash;
      State.security.pinSalt = salt;
      localStorage.setItem("tracker_pin_enabled", "true");
      localStorage.setItem("tracker_pin_hash", hash);
      localStorage.setItem("tracker_pin_salt", salt);
      sessionStorage.setItem("tracker_pin_session", enteredPin);

      // Derive AES key for in-memory encryption
      const derivedKey = await VaultCrypto.deriveAesKey(enteredPin, salt);
      State.security.inMemoryKey = derivedKey;
    } else if (!State.security.pinHash) {
      showToast("Please enter a 4-digit Passcode!", "warning");
      return;
    } else {
      State.security.pinEnabled = true;
      localStorage.setItem("tracker_pin_enabled", "true");
    }

    if (autoLockSelect) {
      State.security.autoLockTimeout = autoLockSelect.value;
      localStorage.setItem("tracker_autolock_timeout", autoLockSelect.value);
    }
  } else {
    State.security.pinEnabled = false;
    localStorage.setItem("tracker_pin_enabled", "false");
  }

  updateHeaderLockButton();

  if (initSupabase()) {
    // Synchronize security settings for universal PIN across all devices
    try {
      await State.supabase.from("settings").upsert({
        key: "app_security",
        value: {
          pinHash: State.security.pinHash,
          pinSalt: State.security.pinSalt,
          pinEnabled: State.security.pinEnabled,
          updatedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
    } catch (sbSecErr) {
      console.warn("Could not sync app_security to Supabase:", sbSecErr);
    }

    showToast("Settings & Security configurations saved!", "success");
    await loadData();
    renderApp();
  } else {
    showToast("Settings & Security configurations saved locally.", "success");
  }

  closeSettingsModal();
}

// Toast
function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  const icon = type === "success" ? "✓" : type === "danger" ? "✕" : "ℹ";
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// NOTIFICATIONS & INTIMATIONS CENTER CONTROLLERS
// ==========================================

function toggleNotificationsDrawer() {
  const drawer = document.getElementById("notificationsDrawer");
  if (drawer) drawer.classList.toggle("open");
}

function dismissSmartAlertsBanner() {
  const banner = document.getElementById("smartAlertsBanner");
  if (banner) banner.style.display = "none";
  sessionStorage.setItem("tracker_banner_dismissed", "true");
  State.isSmartBannerDismissed = true;
}

function filterNotifications(type, element) {
  State.activeNotifFilter = type;
  document.querySelectorAll(".notif-chip").forEach(c => c.classList.remove("active"));
  if (element) element.classList.add("active");
  const fin = calculateFinancials();
  renderNotifications(fin);
}

function updateNotifThreshold(val) {
  State.notificationThreshold = parseFloat(val) || 70;
  localStorage.setItem("tracker_notif_threshold", State.notificationThreshold);
  showToast(`Budget alert threshold set to ${State.notificationThreshold}%!`, "info");
  const fin = calculateFinancials();
  renderNotifications(fin);
}

function dismissNotification(id) {
  if (!State.dismissedNotifs.includes(id)) {
    State.dismissedNotifs.push(id);
    localStorage.setItem("tracker_dismissed_notifs", JSON.stringify(State.dismissedNotifs));
  }
  const fin = calculateFinancials();
  renderNotifications(fin);
  showToast("Alert dismissed.", "info");
}

function clearDismissedNotifications() {
  State.dismissedNotifs = [];
  localStorage.setItem("tracker_dismissed_notifs", JSON.stringify([]));
  sessionStorage.removeItem("tracker_banner_dismissed");
  State.isSmartBannerDismissed = false;
  showToast("All dismissed alerts restored!", "success");
  const fin = calculateFinancials();
  renderNotifications(fin);
}

function getOrdinalSuffix(day) {
  const n = Math.abs(parseInt(day, 10));
  if (isNaN(n)) return "";
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return "th";
  }
  switch (n % 10) {
    case 1: return "st";
    case 2: return "nd";
    case 3: return "rd";
    default: return "th";
  }
}

function formatDayOrdinal(day) {
  if (day === null || day === undefined || day === "") return "";
  const n = parseInt(day, 10);
  if (isNaN(n)) return `${day}`;
  return `${n}${getOrdinalSuffix(n)}`;
}

if (typeof window !== "undefined") {
  window.getOrdinalSuffix = getOrdinalSuffix;
  window.formatDayOrdinal = formatDayOrdinal;
}

function formatPrettyDate(dateStr) {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function parseDateFlexible(str) {
  if (!str) return "";
  try {
    const parts = str.split(/[-\/\s\.]+/);
    if (parts.length >= 3) {
      let d = parseInt(parts[0], 10);
      let m = parts[1];
      let y = parseInt(parts[2], 10);
      if (y < 100) y += 2000;

      const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
      let mIdx = -1;
      if (isNaN(parseInt(m, 10))) {
        mIdx = months.indexOf(m.toLowerCase().substring(0, 3));
      } else {
        mIdx = parseInt(m, 10) - 1;
      }

      if (mIdx >= 0 && mIdx < 12 && d >= 1 && d <= 31) {
        const mm = ("0" + (mIdx + 1)).slice(-2);
        const dd = ("0" + d).slice(-2);
        return `${y}-${mm}-${dd}`;
      }
    }
  } catch (e) {}
  return str;
}

function generateNotifications(fin) {
  const notifs = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. CREDIT CARD BILL DUE DATES
  const cards = State.accounts.filter(a => a.type === "Credit Card");
  const txs = getFilteredTransactions();

  cards.forEach(c => {
    const spends = txs
      .filter(t => t.account === c.name && t.transaction_type === "Expense")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const paid = txs
      .filter(t => t.category && t.category.toLowerCase().includes(c.name.toLowerCase().replace("credit card", "").trim()) && (t.transaction_type === "Transfer" || t.transaction_type === "Expense"))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const opening = c.opening_balance || 0;
    const closing = Math.max(0, opening + spends - paid);

    let dueDateStr = c.payment_due_date;
    if (!dueDateStr) {
      const activeYearMonth = State.activeMonth === "all" ? "2026-10" : State.activeMonth;
      const dayStr = ("0" + (c.payment_due_day || 15)).slice(-2);
      dueDateStr = `${activeYearMonth}-${dayStr}`;
    }

    const billAmt = c.current_bill_amount > 0 ? c.current_bill_amount : closing;
    const dueObj = new Date(dueDateStr + "T00:00:00");
    const diffDays = Math.ceil((dueObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const isPaid = (closing <= 0 && (!c.current_bill_amount || c.is_bill_paid)) || c.is_bill_paid;

    if (isPaid) {
      notifs.push({
        id: `card_paid_${c.name}`,
        type: "card_due",
        severity: "success",
        isUrgent: false,
        title: `✓ ${c.name}: Bill Paid`,
        body: `Payment for statement due on ${formatPrettyDate(dueDateStr)} is fully cleared! Outstanding: ₹0.`,
        actionType: "view_card",
        cardName: c.name,
        dueDate: dueDateStr,
        amount: 0,
        isSettled: true
      });
    } else if (diffDays < 0) {
      notifs.push({
        id: `card_overdue_${c.name}`,
        type: "card_due",
        severity: "danger",
        isUrgent: true,
        title: `🚨 OVERDUE: ${c.name} Bill Due Date Passed!`,
        body: `Your credit card bill of <strong>₹${Math.round(billAmt).toLocaleString("en-IN")}</strong> was due on <strong>${formatPrettyDate(dueDateStr)}</strong> (${Math.abs(diffDays)} days ago). Pay immediately to avoid penalty!`,
        actionType: "pay_card",
        cardName: c.name,
        dueDate: dueDateStr,
        amount: billAmt,
        daysLeft: diffDays
      });
    } else if (diffDays <= 3) {
      const dueLabel = diffDays === 0 ? "TODAY" : diffDays === 1 ? "TOMORROW" : `in ${diffDays} days`;
      notifs.push({
        id: `card_urgent_${c.name}`,
        type: "card_due",
        severity: "danger",
        isUrgent: true,
        title: `⚠️ URGENT: ${c.name} Bill Due ${dueLabel}!`,
        body: `Credit card bill of <strong>₹${Math.round(billAmt).toLocaleString("en-IN")}</strong> is due on <strong>${formatPrettyDate(dueDateStr)}</strong> (${dueLabel}). Transfer funds from your HDFC account.`,
        actionType: "pay_card",
        cardName: c.name,
        dueDate: dueDateStr,
        amount: billAmt,
        daysLeft: diffDays
      });
    } else if (diffDays <= 7) {
      notifs.push({
        id: `card_soon_${c.name}`,
        type: "card_due",
        severity: "warning",
        isUrgent: false,
        title: `📅 ${c.name} Bill Due Soon`,
        body: `Payment of <strong>₹${Math.round(billAmt).toLocaleString("en-IN")}</strong> is scheduled for <strong>${formatPrettyDate(dueDateStr)}</strong> (${diffDays} days remaining).`,
        actionType: "pay_card",
        cardName: c.name,
        dueDate: dueDateStr,
        amount: billAmt,
        daysLeft: diffDays
      });
    } else {
      notifs.push({
        id: `card_regular_${c.name}`,
        type: "card_due",
        severity: "info",
        isUrgent: false,
        title: `💳 ${c.name}: Next Payment Due`,
        body: `Next bill of <strong>₹${Math.round(billAmt).toLocaleString("en-IN")}</strong> due on <strong>${formatPrettyDate(dueDateStr)}</strong> (${diffDays} days remaining).`,
        actionType: "pay_card",
        cardName: c.name,
        dueDate: dueDateStr,
        amount: billAmt,
        daysLeft: diffDays
      });
    }

    if (c.credit_limit > 0) {
      const utilPct = Math.round((closing / c.credit_limit) * 100);
      if (utilPct >= 70) {
        notifs.push({
          id: `card_limit_${c.name}`,
          type: "credit_limit",
          severity: "warning",
          isUrgent: false,
          title: `⚠️ High Credit Limit Utilization: ${c.name} (${utilPct}%)`,
          body: `You have utilized <strong>${utilPct}%</strong> of your credit limit (₹${Math.round(closing).toLocaleString("en-IN")} / ₹${c.credit_limit.toLocaleString("en-IN")}). Maintain card utilization below 30% for high CIBIL score.`,
          actionType: "pay_card",
          cardName: c.name,
          amount: closing
        });
      }
    }
  });

  // 2. BUDGET HEAD 70%+ UTILIZATION ALERTS
  const threshold = State.notificationThreshold || 70;
  State.defaultBudgets.forEach(b => {
    if (b.type === "Expense" || b.type === "Debt") {
      const spent = fin.categoryTotals[b.category] || 0;
      const budgetAmt = b.amount;
      const pct = budgetAmt > 0 ? Math.round((spent / budgetAmt) * 100) : 0;

      if (pct >= 100) {
        notifs.push({
          id: `head_100_${b.category}`,
          type: "budget_head",
          severity: "danger",
          isUrgent: true,
          title: `🚨 100%+ Budget Exceeded: ${b.category}`,
          body: `You have exceeded 100% of your allocated budget for <strong>${b.category}</strong>! Spent <strong>₹${Math.round(spent).toLocaleString("en-IN")}</strong> of ₹${budgetAmt.toLocaleString("en-IN")} budget (Over by ₹${Math.round(spent - budgetAmt).toLocaleString("en-IN")}).`,
          category: b.category,
          spent: spent,
          budget: budgetAmt,
          utilization: pct,
          actionType: "view_category"
        });
      } else if (pct >= 85) {
        notifs.push({
          id: `head_85_${b.category}`,
          type: "budget_head",
          severity: "danger",
          isUrgent: true,
          title: `⚠️ High Spend Alert (85%+): ${b.category}`,
          body: `You have already utilized <strong>${pct}%</strong> of funds available for <strong>${b.category}</strong> (₹${Math.round(spent).toLocaleString("en-IN")} / ₹${budgetAmt.toLocaleString("en-IN")}). Only ₹${Math.round(budgetAmt - spent).toLocaleString("en-IN")} remaining!`,
          category: b.category,
          spent: spent,
          budget: budgetAmt,
          utilization: pct,
          actionType: "view_category"
        });
      } else if (pct >= threshold) {
        notifs.push({
          id: `head_70_${b.category}`,
          type: "budget_head",
          severity: "warning",
          isUrgent: false,
          title: `⚡ ${threshold}% Limit Reached: ${b.category}`,
          body: `You have already utilized <strong>${pct}%</strong> of funds available for <strong>${b.category}</strong> (₹${Math.round(spent).toLocaleString("en-IN")} spent of ₹${budgetAmt.toLocaleString("en-IN")} allocated). Watch your upcoming spends for this head.`,
          category: b.category,
          spent: spent,
          budget: budgetAmt,
          utilization: pct,
          actionType: "view_category"
        });
      }
    }
  });

  // 3. SCHEDULED EMI ALERT
  const activeEmi = State.emiSchedule.find(e => e.months_remaining > 0);
  if (activeEmi) {
    notifs.push({
      id: `emi_${activeEmi.name}`,
      type: "emi_due",
      severity: "info",
      isUrgent: false,
      title: `📅 Scheduled EMI: ${activeEmi.name}`,
      body: `Monthly EMI of <strong>₹${activeEmi.monthly_emi.toLocaleString("en-IN")}</strong> is scheduled from <strong>${activeEmi.card}</strong> (Tenure: ${activeEmi.months_remaining} of ${activeEmi.total_tenure} months remaining).`,
      actionType: "view_emi"
    });
  }

  // 4. LOW BANK BALANCE WARNING
  if (fin.hdfcBalance < 15000) {
    notifs.push({
      id: "low_bal_hdfc",
      type: "low_balance",
      severity: "warning",
      isUrgent: false,
      title: `🏦 HDFC Account Safety Buffer Alert`,
      body: `Your HDFC balance is currently <strong>₹${Math.round(fin.hdfcBalance).toLocaleString("en-IN")}</strong>, which is below the recommended ₹15,000 liquidity buffer. Consider an internal transfer from Kotak.`,
      actionType: "transfer"
    });
  }

  // 5. MAIL REVIEW INBOX ALERTS
  const pendingReview = State.transactions.filter(t => t.status === "pending_review").length;
  if (pendingReview > 0) {
    notifs.push({
      id: "pending_review_emails",
      type: "review_inbox",
      severity: "info",
      isUrgent: false,
      title: `📥 ${pendingReview} Bank Email Alerts Awaiting Review`,
      body: `You have <strong>${pendingReview}</strong> unverified transaction alerts in your Mail Review Inbox. Review and approve them in 1 click.`,
      actionType: "view_review"
    });
  }

  State.notifications = notifs;
  return notifs;
}

function renderNotifications(fin) {
  const notifs = generateNotifications(fin);
  const activeNotifs = notifs.filter(n => !State.dismissedNotifs.includes(n.id));

  const countAll = activeNotifs.length;
  const countCard = activeNotifs.filter(n => n.type === "card_due").length;
  const countBudget = activeNotifs.filter(n => n.type === "budget_head").length;
  const countUrgent = activeNotifs.filter(n => n.isUrgent).length;

  const countAllEl = document.getElementById("notifCountAll");
  if (countAllEl) countAllEl.textContent = countAll;
  const countCardEl = document.getElementById("notifCountCard");
  if (countCardEl) countCardEl.textContent = countCard;
  const countBudgetEl = document.getElementById("notifCountBudget");
  if (countBudgetEl) countBudgetEl.textContent = countBudget;
  const countUrgentEl = document.getElementById("notifCountUrgent");
  if (countUrgentEl) countUrgentEl.textContent = countUrgent;

  const headerBadge = document.getElementById("headerNotifBadge");
  if (headerBadge) {
    headerBadge.textContent = countAll;
    headerBadge.style.display = countAll > 0 ? "inline-block" : "none";
    if (countUrgent > 0) headerBadge.classList.add("pulse");
    else headerBadge.classList.remove("pulse");
  }

  const tabBadge = document.getElementById("tabNotifBadge");
  if (tabBadge) {
    tabBadge.textContent = countAll;
    tabBadge.style.display = countAll > 0 ? "inline-block" : "none";
  }

  let displayList = activeNotifs;
  if (State.activeNotifFilter === "card_due") {
    displayList = activeNotifs.filter(n => n.type === "card_due");
  } else if (State.activeNotifFilter === "budget_head") {
    displayList = activeNotifs.filter(n => n.type === "budget_head");
  } else if (State.activeNotifFilter === "urgent") {
    displayList = activeNotifs.filter(n => n.isUrgent);
  }

  const listEl = document.getElementById("notifCardsList");
  if (listEl) {
    if (displayList.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; padding: 2.5rem; background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🎉</div>
          <h4 style="color:var(--income); margin-bottom: 0.25rem;">All Clear! No Active Alerts</h4>
          <p style="color:var(--text-muted); font-size:0.85rem;">All credit card bills are on schedule and all budget heads are safely within limits.</p>
        </div>
      `;
    } else {
      listEl.innerHTML = displayList.map(n => renderSingleNotifCard(n)).join("");
    }
  }

  const drawerList = document.getElementById("drawerNotifList");
  if (drawerList) {
    if (activeNotifs.length === 0) {
      drawerList.innerHTML = `<p style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">No active notifications! Everything is smooth.</p>`;
    } else {
      drawerList.innerHTML = activeNotifs.slice(0, 8).map(n => renderSingleNotifCard(n, true)).join("");
    }
  }

  renderSmartAlertsBanner(activeNotifs);
  renderCardDueDatesSummaryTable();
}

function renderSingleNotifCard(n, isCompact = false) {
  let tagClass = "tag-info";
  if (n.severity === "danger") tagClass = "tag-danger";
  else if (n.severity === "warning") tagClass = "tag-warning";

  let tagLabel = n.type.toUpperCase().replace("_", " ");
  if (n.type === "card_due") tagLabel = "CREDIT CARD";
  else if (n.type === "budget_head") tagLabel = `${n.utilization}% BUDGET HEAD`;
  else if (n.type === "credit_limit") tagLabel = "LIMIT ALERT";

  let actionsHtml = "";
  if (!isCompact) {
    if (n.actionType === "pay_card") {
      actionsHtml = `
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.3rem 0.75rem;" onclick="openPayCardBillModal('${n.cardName}', ${n.amount})">
          💳 Pay Bill Now (₹${Math.round(n.amount).toLocaleString("en-IN")})
        </button>
        <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.65rem;" onclick="openCardDueDateModal('${n.cardName}')">
          ✏️ Edit Due Date
        </button>
      `;
    } else if (n.actionType === "view_category") {
      actionsHtml = `
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.3rem 0.75rem;" onclick="viewCategoryTransactions('${n.category}')">
          🔍 View Spends (${n.category})
        </button>
      `;
    } else if (n.actionType === "transfer") {
      actionsHtml = `
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.3rem 0.75rem;" onclick="openTransferModal()">
          🔄 Transfer Funds
        </button>
      `;
    } else if (n.actionType === "view_review") {
      actionsHtml = `
        <button class="btn btn-primary" style="font-size:0.75rem; padding:0.3rem 0.75rem;" onclick="document.querySelector('[data-tab=review]').click()">
          📥 Review Inbox
        </button>
      `;
    }

    actionsHtml += `
      <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.3rem 0.6rem; color:var(--text-muted);" onclick="dismissNotification('${n.id}')" title="Dismiss this notification">
        ✕ Dismiss
      </button>
    `;
  }

  let progressHtml = "";
  if (n.type === "budget_head" && n.utilization) {
    const barColor = n.utilization >= 100 ? "var(--expense)" : n.utilization >= 85 ? "var(--expense)" : "var(--warning)";
    progressHtml = `
      <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-top:0.35rem; color:var(--text-muted);">
        <span>Spent: ₹${Math.round(n.spent).toLocaleString("en-IN")}</span>
        <span>Budget: ₹${Math.round(n.budget).toLocaleString("en-IN")} (${n.utilization}%)</span>
      </div>
      <div class="notif-progress-wrapper">
        <div class="notif-progress-fill" style="width: ${Math.min(100, n.utilization)}%; background: ${barColor};"></div>
      </div>
    `;
  }

  return `
    <div class="notif-card notif-${n.severity}">
      <div class="notif-card-header">
        <div class="notif-title-area">
          <span class="notif-badge-tag ${tagClass}">${tagLabel}</span>
          <span class="notif-title">${n.title}</span>
        </div>
        ${n.dueDate ? `<span class="notif-time-badge">Due: ${formatPrettyDate(n.dueDate)}</span>` : ''}
      </div>
      <div class="notif-body">
        ${n.body}
        ${progressHtml}
      </div>
      ${actionsHtml ? `<div class="notif-card-actions">${actionsHtml}</div>` : ''}
    </div>
  `;
}

function renderSmartAlertsBanner(activeNotifs) {
  const banner = document.getElementById("smartAlertsBanner");
  const textEl = document.getElementById("alertsBannerText");
  if (!banner || !textEl) return;

  if (State.isSmartBannerDismissed || activeNotifs.length === 0) {
    banner.style.display = "none";
    return;
  }

  const urgentList = activeNotifs.filter(n => n.isUrgent);
  const cardDueList = activeNotifs.filter(n => n.type === "card_due" && !n.isSettled);
  const budgetList = activeNotifs.filter(n => n.type === "budget_head");

  const highlights = [];
  if (urgentList.length > 0) {
    highlights.push(`<strong>${urgentList.length} urgent item${urgentList.length > 1 ? 's' : ''}</strong>`);
  }
  if (cardDueList.length > 0) {
    highlights.push(`${cardDueList.length} card bill${cardDueList.length > 1 ? 's' : ''} due`);
  }
  if (budgetList.length > 0) {
    highlights.push(`${budgetList.length} head${budgetList.length > 1 ? 's' : ''} over ${State.notificationThreshold}% budget`);
  }

  textEl.innerHTML = `<strong>Intimation:</strong> ${highlights.join(" • ")}. Click to review and pay before due dates.`;
  banner.style.display = "flex";
}

function renderCardDueDatesSummaryTable() {
  const tbody = document.getElementById("cardDueDatesSummaryBody");
  if (!tbody) return;

  const cards = State.accounts.filter(a => a.type === "Credit Card");
  const txs = getFilteredTransactions();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  tbody.innerHTML = cards.map(c => {
    const spends = txs
      .filter(t => t.account === c.name && t.transaction_type === "Expense")
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const paid = txs
      .filter(t => t.category && t.category.toLowerCase().includes(c.name.toLowerCase().replace("credit card", "").trim()) && (t.transaction_type === "Transfer" || t.transaction_type === "Expense"))
      .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

    const opening = c.opening_balance || 0;
    const closing = Math.max(0, opening + spends - paid);

    let dueDateStr = c.payment_due_date;
    if (!dueDateStr) {
      const activeYearMonth = State.activeMonth === "all" ? "2026-10" : State.activeMonth;
      const dayStr = ("0" + (c.payment_due_day || 15)).slice(-2);
      dueDateStr = `${activeYearMonth}-${dayStr}`;
    }

    const dueObj = new Date(dueDateStr + "T00:00:00");
    const diffDays = Math.ceil((dueObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const billAmt = c.current_bill_amount > 0 ? c.current_bill_amount : closing;
    const isPaid = (closing <= 0 && (!c.current_bill_amount || c.is_bill_paid)) || c.is_bill_paid;

    let statusPill = "";
    if (isPaid) {
      statusPill = `<span class="due-status-pill status-success">✓ Paid / Cleared</span>`;
    } else if (diffDays < 0) {
      statusPill = `<span class="due-status-pill status-danger">🚨 Overdue (${Math.abs(diffDays)}d)</span>`;
    } else if (diffDays <= 3) {
      statusPill = `<span class="due-status-pill status-danger">⚠️ Due in ${diffDays}d</span>`;
    } else if (diffDays <= 7) {
      statusPill = `<span class="due-status-pill status-warning">Due in ${diffDays}d</span>`;
    } else {
      statusPill = `<span class="due-status-pill status-info">Due in ${diffDays}d</span>`;
    }

    return `
      <tr>
        <td><strong>${c.name}</strong></td>
        <td>${c.statement_schedule || (formatDayOrdinal(c.billing_cycle_day || 1) + " of month")}</td>
        <td>
          <strong>${c.due_schedule || formatPrettyDate(dueDateStr)}</strong>
          ${c.due_schedule && dueDateStr ? `<div style="font-size:0.72rem; color:var(--text-muted);">${formatPrettyDate(dueDateStr)}</div>` : ''}
        </td>
        <td>${statusPill}</td>
        <td style="font-weight:700; color:${isPaid ? 'var(--income)' : 'var(--expense)'}">₹${Math.round(billAmt).toLocaleString("en-IN")}</td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-primary" style="font-size:0.75rem; padding:0.25rem 0.6rem;" onclick="openPayCardBillModal('${c.name}', ${Math.round(billAmt)})">
              💳 Pay Bill
            </button>
            <button class="btn btn-secondary" style="font-size:0.75rem; padding:0.25rem 0.5rem;" onclick="openCardDueDateModal('${c.name}')">
              ✏️ Edit
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function viewCategoryTransactions(category) {
  const tab = document.querySelector('[data-tab=transactions]');
  if (tab) tab.click();
  const searchInput = document.getElementById("txSearchInput");
  if (searchInput) {
    searchInput.value = category;
    renderTransactionsTable();
  }
}

function openPayCardBillModal(cardName, amount) {
  openTransferModal();
  const fromEl = document.getElementById("transferFromInput");
  if (fromEl) fromEl.value = "HDFC Bank Account";
  const toEl = document.getElementById("transferToInput");
  if (toEl) toEl.value = cardName;
  const amtEl = document.getElementById("transferAmountInput");
  if (amtEl) amtEl.value = amount > 0 ? Math.round(amount) : "";
  const noteEl = document.getElementById("transferNoteInput");
  if (noteEl) noteEl.value = `Monthly Bill Payment for ${cardName}`;
}

function openCardDueDateModal(cardName) {
  const card = State.accounts.find(a => a.name === cardName);
  if (!card) return;

  document.getElementById("editCardNameInput").value = card.name;
  document.getElementById("displayEditCardName").value = card.name;
  document.getElementById("editCardDueDateInput").value = card.payment_due_date || "";
  document.getElementById("editCardBillAmountInput").value = card.current_bill_amount || "";
  document.getElementById("editCardBillStatusInput").value = card.is_bill_paid ? "Paid" : "Pending";

  document.getElementById("cardDueDateModal").classList.add("active");
}

function closeCardDueDateModal() {
  document.getElementById("cardDueDateModal").classList.remove("active");
}

async function saveCardDueDate() {
  const cardName = document.getElementById("editCardNameInput").value;
  const dueDate = document.getElementById("editCardDueDateInput").value;
  const billAmount = parseFloat(document.getElementById("editCardBillAmountInput").value) || 0;
  const status = document.getElementById("editCardBillStatusInput").value;
  const isPaid = (status === "Paid");

  const card = State.accounts.find(a => a.name === cardName);
  if (card) {
    card.payment_due_date = dueDate;
    card.current_bill_amount = billAmount;
    card.is_bill_paid = isPaid;
  }

  State.cardBills[cardName] = {
    due_date: dueDate,
    total_due: billAmount,
    is_paid: isPaid,
    updated_at: new Date().toISOString()
  };

  localStorage.setItem("tracker_card_bills", JSON.stringify(State.cardBills));

  if (State.supabase) {
    try {
      await State.supabase.from("card_bills").upsert({
        card_name: cardName,
        due_date: dueDate,
        total_due: billAmount,
        is_paid: isPaid
      }, { onConflict: "card_name,due_date" });
    } catch (e) {}
  }

  showToast(`Updated bill & due date for ${cardName}!`, "success");
  closeCardDueDateModal();
  renderApp();
}

async function applyParsedCardStatement(cardName, amount, dueDate) {
  const card = State.accounts.find(a => a.name === cardName);
  if (card) {
    if (dueDate) card.payment_due_date = dueDate;
    if (amount > 0) card.current_bill_amount = amount;
    card.is_bill_paid = false;
  }

  State.cardBills[cardName] = {
    due_date: dueDate || (card ? card.payment_due_date : ""),
    total_due: amount,
    is_paid: false,
    updated_at: new Date().toISOString()
  };
  localStorage.setItem("tracker_card_bills", JSON.stringify(State.cardBills));

  showToast(`Applied statement for ${cardName}: Due on ${dueDate ? formatPrettyDate(dueDate) : 'scheduled date'} (₹${amount})`, "success");
  document.getElementById("smartParserInput").value = "";
  document.getElementById("parserResultPreview").style.display = "none";
  renderApp();
}

// ==============================================================================
// VAULT CRYPTOGRAPHY (ZERO-KNOWLEDGE CLIENT-SIDE AES-256 GCM + PBKDF2)
// ==============================================================================
const VaultCrypto = {
  buf2hex(buf) {
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  },

  hex2buf(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes.buffer;
  },

  generateSalt() {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    return this.buf2hex(salt);
  },

  async hashPin(pin, saltHex) {
    const enc = new TextEncoder();
    const salt = this.hex2buf(saltHex);
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(pin),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      256
    );
    return this.buf2hex(derivedBits);
  },

  async deriveAesKey(pin, saltHex) {
    const enc = new TextEncoder();
    const salt = this.hex2buf(saltHex);
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  },

  async encryptObject(obj, cryptoKey) {
    if (!cryptoKey) return null;
    try {
      const enc = new TextEncoder();
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedData = enc.encode(JSON.stringify(obj));
      const encryptedBuf = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        encodedData
      );
      return {
        iv: this.buf2hex(iv),
        data: this.buf2hex(encryptedBuf)
      };
    } catch (e) {
      console.warn("Vault encryption error:", e);
      return null;
    }
  },

  async decryptObject(encryptedPayload, cryptoKey) {
    if (!cryptoKey || !encryptedPayload || !encryptedPayload.iv || !encryptedPayload.data) return null;
    try {
      const iv = this.hex2buf(encryptedPayload.iv);
      const data = this.hex2buf(encryptedPayload.data);
      const decryptedBuf = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        cryptoKey,
        data
      );
      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decryptedBuf));
    } catch (e) {
      console.warn("Vault decryption error:", e);
      return null;
    }
  }
};

// ==============================================================================
// DUAL-TIER APP SECURITY & LOCK ENGINE
// ==============================================================================
let idleTimer = null;

async function initSecurity() {
  const defaultSalt = window.INITIAL_DATA?.security?.pinSalt || "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const defaultHash = window.INITIAL_DATA?.security?.pinHash || "ca1be9e2534f95e439dd905233c2cadf4be34117c0c9a790965f412ceb14ce23";

  // Fetch universal PIN from Supabase settings if connected
  if (State.supabase) {
    try {
      const { data, error } = await State.supabase
        .from("settings")
        .select("value")
        .eq("key", "app_security")
        .maybeSingle();

      if (!error && data && data.value && data.value.pinHash && data.value.pinSalt) {
        State.security.pinHash = data.value.pinHash;
        State.security.pinSalt = data.value.pinSalt;
        localStorage.setItem("tracker_pin_hash", data.value.pinHash);
        localStorage.setItem("tracker_pin_salt", data.value.pinSalt);
        if (data.value.pinEnabled !== undefined) {
          State.security.pinEnabled = !!data.value.pinEnabled;
          localStorage.setItem("tracker_pin_enabled", State.security.pinEnabled ? "true" : "false");
        }
      } else if (!error && (!data || !data.value || !data.value.pinHash)) {
        // Seed default universal PIN to Supabase if not yet configured
        const currentHash = localStorage.getItem("tracker_pin_hash") || defaultHash;
        const currentSalt = localStorage.getItem("tracker_pin_salt") || defaultSalt;
        await State.supabase.from("settings").upsert({
          key: "app_security",
          value: {
            pinHash: currentHash,
            pinSalt: currentSalt,
            pinEnabled: true,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
      }
    } catch (e) {
      console.warn("Could not sync app_security from Supabase:", e);
    }
  }

  // Fallback to localStorage or universal default
  if (!State.security.pinHash) {
    State.security.pinHash = localStorage.getItem("tracker_pin_hash") || defaultHash;
  }
  if (!State.security.pinSalt) {
    State.security.pinSalt = localStorage.getItem("tracker_pin_salt") || defaultSalt;
  }

  const savedEnabled = localStorage.getItem("tracker_pin_enabled");
  State.security.pinEnabled = savedEnabled === null ? true : savedEnabled === "true";
  State.security.autoLockTimeout = localStorage.getItem("tracker_autolock_timeout") || "180000";

  updateHeaderLockButton();

  // Lock on startup if PIN protection is active
  if (State.security.pinEnabled && State.security.pinHash) {
    lockApp();
  }

  initAutoLock();
}

function updateHeaderLockButton() {
  const lockBtn = document.getElementById("headerLockBtn");
  if (!lockBtn) return;
  if (State.security.pinEnabled && State.security.pinHash) {
    lockBtn.title = "Lock Financial OS (Passcode Protected) [Shift + L]";
  } else {
    lockBtn.title = "Set Up 4-Digit Passcode Protection [Shift + L]";
  }
}

function handleHeaderLockClick() {
  if (State.security.pinEnabled && State.security.pinHash) {
    lockApp();
    showToast("App Locked 🔒", "info");
  } else {
    openPasscodeSetupModal();
  }
}

function openPasscodeSetupModal() {
  const modal = document.getElementById("passcodeSetupModal");
  if (!modal) return;

  const pinInput = document.getElementById("setupPinInput");
  const confirmInput = document.getElementById("setupConfirmPinInput");
  const autoLockSelect = document.getElementById("setupAutoLockSelect");

  if (pinInput) pinInput.value = "";
  if (confirmInput) confirmInput.value = "";
  if (autoLockSelect) {
    autoLockSelect.value = State.security.autoLockTimeout || "180000";
  }

  modal.classList.add("active");
  setTimeout(() => {
    if (pinInput) pinInput.focus();
  }, 150);
}

function closePasscodeSetupModal() {
  const modal = document.getElementById("passcodeSetupModal");
  if (modal) modal.classList.remove("active");
}

async function savePasscodeFromModal() {
  const pinInput = document.getElementById("setupPinInput");
  const confirmInput = document.getElementById("setupConfirmPinInput");
  const autoLockSelect = document.getElementById("setupAutoLockSelect");

  const pin = pinInput ? pinInput.value.trim() : "";
  const confirmPin = confirmInput ? confirmInput.value.trim() : "";

  if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
    showToast("Passcode must be exactly 4 digits (0-9)!", "warning");
    pinInput?.focus();
    return;
  }

  if (pin !== confirmPin) {
    showToast("Passcodes do not match. Please re-enter!", "error");
    if (confirmInput) {
      confirmInput.value = "";
      confirmInput.focus();
    }
    return;
  }

  try {
    const salt = VaultCrypto.generateSalt();
    const hash = await VaultCrypto.hashPin(pin, salt);
    const derivedKey = await VaultCrypto.deriveAesKey(pin, salt);

    State.security.pinEnabled = true;
    State.security.pinHash = hash;
    State.security.pinSalt = salt;
    State.security.inMemoryKey = derivedKey;

    localStorage.setItem("tracker_pin_enabled", "true");
    localStorage.setItem("tracker_pin_hash", hash);
    localStorage.setItem("tracker_pin_salt", salt);
    sessionStorage.setItem("tracker_pin_session", pin);

    if (autoLockSelect) {
      State.security.autoLockTimeout = autoLockSelect.value;
      localStorage.setItem("tracker_autolock_timeout", autoLockSelect.value);
    }

    // Sync to Supabase settings table if connected for universal PIN across all devices
    if (State.supabase) {
      try {
        await State.supabase.from("settings").upsert({
          key: "app_security",
          value: {
            pinHash: hash,
            pinSalt: salt,
            pinEnabled: true,
            updatedAt: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, { onConflict: "key" });
      } catch (sbErr) {
        console.warn("Could not sync updated PIN to Supabase settings:", sbErr);
      }
    }

    // Sync settings modal fields if present
    const settingsPinCheck = document.getElementById("securityPinEnabledCheckbox");
    if (settingsPinCheck) settingsPinCheck.checked = true;
    const pinSec = document.getElementById("pinConfigSection");
    if (pinSec) pinSec.style.display = "block";
    const masterPin = document.getElementById("masterPinInput");
    if (masterPin) masterPin.value = "••••";
    const settingsAutoLock = document.getElementById("autoLockTimeoutSelect");
    if (settingsAutoLock && autoLockSelect) settingsAutoLock.value = autoLockSelect.value;

    updateHeaderLockButton();
    closePasscodeSetupModal();
    showToast("Universal PIN updated successfully! Locking Financial OS 🔒", "success");

    setTimeout(() => {
      lockApp();
    }, 350);
  } catch (err) {
    console.error("Error setting up passcode:", err);
    showToast("Failed to initialize passcode encryption.", "error");
  }
}

function lockApp() {
  if (!State.security.pinEnabled || !State.security.pinHash) {
    openPasscodeSetupModal();
    return;
  }
  State.security.isLocked = true;
  State.security.inMemoryKey = null;
  State.security.activePinBuffer = "";
  State.decryptedVault = {}; // Wipe decrypted credentials from RAM!

  const overlay = document.getElementById("securityLockOverlay");
  if (overlay) overlay.classList.add("active");
  updatePinDots();
}

async function unlockApp(derivedKey) {
  State.security.isLocked = false;
  State.security.inMemoryKey = derivedKey;
  State.security.activePinBuffer = "";

  const overlay = document.getElementById("securityLockOverlay");
  if (overlay) overlay.classList.remove("active");

  // Decrypt all card credentials using in-memory key
  await decryptAllCardVaults();

  showToast("Vault Unlocked! Welcome Dhruv 👋", "success");
  renderApp();
  resetIdleTimer();
}

function enterPinDigit(digit) {
  if (!State.security.isLocked) return;
  if (State.security.activePinBuffer.length < 4) {
    State.security.activePinBuffer += digit;
    updatePinDots();

    if (State.security.activePinBuffer.length === 4) {
      setTimeout(verifyEnteredPin, 100);
    }
  }
}

function deletePinDigit() {
  if (!State.security.isLocked) return;
  if (State.security.activePinBuffer.length > 0) {
    State.security.activePinBuffer = State.security.activePinBuffer.slice(0, -1);
    updatePinDots();
  }
}

function updatePinDots() {
  const dots = document.querySelectorAll("#pinDotsContainer .pin-dot");
  dots.forEach((dot, idx) => {
    if (idx < State.security.activePinBuffer.length) {
      dot.classList.add("filled");
    } else {
      dot.classList.remove("filled");
      dot.classList.remove("error");
    }
  });
}

async function verifyEnteredPin() {
  const pin = State.security.activePinBuffer;
  if (!pin || pin.length !== 4) return;

  let isVerified = false;
  let derivedKey = null;

  // 1. Direct Web-Based Authentication against live Supabase cloud
  if (State.supabase) {
    try {
      const { data, error } = await State.supabase
        .from("settings")
        .select("value")
        .eq("key", "app_security")
        .maybeSingle();

      if (!error && data && data.value && data.value.pinHash && data.value.pinSalt) {
        const liveHash = data.value.pinHash;
        const liveSalt = data.value.pinSalt;
        const testHash = await VaultCrypto.hashPin(pin, liveSalt);

        if (testHash === liveHash) {
          isVerified = true;
          State.security.pinHash = liveHash;
          State.security.pinSalt = liveSalt;
          localStorage.setItem("tracker_pin_hash", liveHash);
          localStorage.setItem("tracker_pin_salt", liveSalt);
          derivedKey = await VaultCrypto.deriveAesKey(pin, liveSalt);
        }
      }
    } catch (e) {
      console.warn("Live cloud PIN check notice:", e);
    }
  }

  // 2. Fallback to cached/local hash if offline or cloud check did not match
  if (!isVerified && State.security.pinHash && State.security.pinSalt) {
    const hash = await VaultCrypto.hashPin(pin, State.security.pinSalt);
    if (hash === State.security.pinHash) {
      isVerified = true;
      derivedKey = await VaultCrypto.deriveAesKey(pin, State.security.pinSalt);
    }
  }

  if (isVerified) {
    sessionStorage.setItem("tracker_pin_session", pin);
    await unlockApp(derivedKey);
  } else {
    const dots = document.querySelectorAll("#pinDotsContainer .pin-dot");
    dots.forEach(d => d.classList.add("error"));
    showToast("Incorrect Passcode. Try again!", "error");

    setTimeout(() => {
      State.security.activePinBuffer = "";
      updatePinDots();
    }, 600);
  }
}

async function resetPinToDefault() {
  if (!confirm("Reset Passcode to default 1234 across all devices?")) return;
  const defaultSalt = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
  const defaultHash = "ca1be9e2534f95e439dd905233c2cadf4be34117c0c9a790965f412ceb14ce23";

  State.security.pinHash = defaultHash;
  State.security.pinSalt = defaultSalt;
  State.security.pinEnabled = true;
  localStorage.setItem("tracker_pin_hash", defaultHash);
  localStorage.setItem("tracker_pin_salt", defaultSalt);
  localStorage.setItem("tracker_pin_enabled", "true");

  if (State.supabase) {
    try {
      await State.supabase.from("settings").upsert({
        key: "app_security",
        value: {
          pinHash: defaultHash,
          pinSalt: defaultSalt,
          pinEnabled: true,
          updatedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });
    } catch (e) {
      console.warn("Could not sync default PIN to Supabase:", e);
    }
  }

  State.security.activePinBuffer = "";
  updatePinDots();
  showToast("Passcode reset to 1234! Enter 1234 to unlock.", "info");
}

window.handleHeaderLockClick = handleHeaderLockClick;
window.openPasscodeSetupModal = openPasscodeSetupModal;
window.closePasscodeSetupModal = closePasscodeSetupModal;
window.savePasscodeFromModal = savePasscodeFromModal;
window.updateHeaderLockButton = updateHeaderLockButton;
window.resetPinToDefault = resetPinToDefault;

function initAutoLock() {
  ["mousemove", "keydown", "touchstart", "scroll", "click"].forEach(ev => {
    window.addEventListener(ev, resetIdleTimer, { passive: true });
  });

  // Handle visibility changes: lock when hidden, sync fresh cloud data when shown
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && State.security.pinEnabled) {
      if (State.security.autoLockTimeout === "immediate" || State.security.autoLockTimeout !== "never") {
        lockApp();
      }
    } else if (!document.hidden && State.supabase) {
      console.log("App foregrounded: fetching fresh data from Supabase cloud...");
      loadData().then(() => renderApp());
    }
  });

  window.addEventListener("focus", () => {
    if (State.supabase) {
      loadData().then(() => renderApp());
    }
  });

  window.addEventListener("pagehide", () => {
    if (State.security.pinEnabled) lockApp();
  });

  resetIdleTimer();
}

function resetIdleTimer() {
  if (State.security.isLocked || !State.security.pinEnabled || State.security.autoLockTimeout === "never") return;
  clearTimeout(idleTimer);
  const ms = parseInt(State.security.autoLockTimeout) || 180000;
  idleTimer = setTimeout(() => {
    if (!State.security.isLocked && State.security.pinEnabled) {
      lockApp();
      showToast("App locked due to inactivity.", "info");
    }
  }, ms);
}

async function decryptAllCardVaults() {
  if (!State.security.inMemoryKey) return;
  const allVaults = JSON.parse(localStorage.getItem("tracker_card_vaults_enc") || "{}");
  for (const cardName in allVaults) {
    const dec = await VaultCrypto.decryptObject(allVaults[cardName], State.security.inMemoryKey);
    if (dec) {
      State.decryptedVault[cardName] = dec;
    }
  }
}

// ==============================================================================
// TIER-1 PRIVACY-SAFE QUICK LOG (iOS BOTTOM PULL-SHEET & 2-TAP QUICK LOG)
// ==============================================================================
function toggleQuickLogSelect(selectId) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const isHidden = el.style.display === "none" || !el.style.display;
  el.style.display = isHidden ? "block" : "none";
  if (isHidden) {
    el.focus();
  }
}

function resolveAccountForChip(matchKey) {
  if (!State.accounts || State.accounts.length === 0) return matchKey;
  const key = matchKey.toLowerCase();
  if (key === "hdfc") {
    const acc = State.accounts.find(a => /hdfc\s+bank/i.test(a.name)) || State.accounts.find(a => /hdfc/i.test(a.name));
    if (acc) return acc.name;
  } else if (key === "kotak") {
    const acc = State.accounts.find(a => /kotak/i.test(a.name));
    if (acc) return acc.name;
  } else if (key.includes("amazon")) {
    const acc = State.accounts.find(a => /amazon/i.test(a.name));
    if (acc) return acc.name;
  } else if (key.includes("amex")) {
    const acc = State.accounts.find(a => /amex|american express/i.test(a.name));
    if (acc) return acc.name;
  } else if (key === "cash") {
    const acc = State.accounts.find(a => /^cash$/i.test(a.name)) || State.accounts.find(a => /cash/i.test(a.name));
    if (acc) return acc.name;
  }
  const fallback = State.accounts.find(a => a.name.toLowerCase().includes(key));
  return fallback ? fallback.name : matchKey;
}

function resolveCategoryForChip(matchKey) {
  if (!State.categories || State.categories.length === 0) return matchKey;
  const key = matchKey.toLowerCase();
  if (key === "food") {
    const cat = State.categories.find(c => /food/i.test(c.name));
    if (cat) return cat.name;
  } else if (key === "grocery") {
    const cat = State.categories.find(c => /grocer/i.test(c.name));
    if (cat) return cat.name;
  } else if (key === "fuel") {
    const cat = State.categories.find(c => /fuel/i.test(c.name) && c.type !== "Income");
    if (cat) return cat.name;
  } else if (key === "travel") {
    const cat = State.categories.find(c => /transport|travel/i.test(c.name));
    if (cat) return cat.name;
  } else if (key === "shopping") {
    const cat = State.categories.find(c => /shopping/i.test(c.name));
    if (cat) return cat.name;
  } else if (key === "bills") {
    const cat = State.categories.find(c => /^bills?$/i.test(c.name)) || State.categories.find(c => /internet|utility|recharge/i.test(c.name));
    if (cat) return cat.name;
    return "Bills";
  }
  const fallback = State.categories.find(c => c.name.toLowerCase().includes(key));
  return fallback ? fallback.name : matchKey;
}

function initQuickLogChips() {
  const accountChips = document.querySelectorAll("#quickLogAccountChips .chip-btn");
  accountChips.forEach(chip => {
    const matchKey = chip.getAttribute("data-account-match") || (chip.textContent || "").trim();
    const resolved = resolveAccountForChip(matchKey);
    chip.dataset.targetValue = resolved;

    chip.onclick = function() {
      accountChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const accSelect = document.getElementById("quickLogAccountSelect");
      if (accSelect) {
        accSelect.value = resolved;
        accSelect.style.display = "none";
      }
    };
  });

  const categoryChips = document.querySelectorAll("#quickLogCategoryChips .chip-btn");
  categoryChips.forEach(chip => {
    const matchKey = chip.getAttribute("data-category-match") || (chip.textContent || "").trim();
    const resolved = resolveCategoryForChip(matchKey);
    chip.dataset.targetValue = resolved;

    chip.onclick = function() {
      categoryChips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const catSelect = document.getElementById("quickLogCategorySelect");
      if (catSelect) {
        catSelect.value = resolved;
        catSelect.style.display = "none";
      }
    };
  });

  // Sync when fallback dropdowns change
  const accSelect = document.getElementById("quickLogAccountSelect");
  if (accSelect && !accSelect.dataset.listenerAttached) {
    accSelect.dataset.listenerAttached = "true";
    accSelect.addEventListener("change", function() {
      const val = accSelect.value;
      let matched = false;
      accountChips.forEach(chip => {
        if (chip.dataset.targetValue === val) {
          chip.classList.add("active");
          matched = true;
        } else {
          chip.classList.remove("active");
        }
      });
      if (!matched) {
        accountChips.forEach(chip => chip.classList.remove("active"));
      }
    });
  }

  const catSelect = document.getElementById("quickLogCategorySelect");
  if (catSelect && !catSelect.dataset.listenerAttached) {
    catSelect.dataset.listenerAttached = "true";
    catSelect.addEventListener("change", function() {
      const val = catSelect.value;
      let matched = false;
      categoryChips.forEach(chip => {
        if (chip.dataset.targetValue === val) {
          chip.classList.add("active");
          matched = true;
        } else {
          chip.classList.remove("active");
        }
      });
      if (!matched) {
        categoryChips.forEach(chip => chip.classList.remove("active"));
      }
    });
  }
}

function setupQuickLogPullDown() {
  const modalContent = document.querySelector("#quickLogModal .modal-content");
  if (!modalContent || modalContent.dataset.swipeSetup) return;
  modalContent.dataset.swipeSetup = "true";

  let startY = 0;
  let currentY = 0;
  let isDragging = false;

  const dragHandle = modalContent.querySelector(".sheet-drag-handle");
  const header = modalContent.querySelector(".modal-header");
  const targets = [dragHandle, header].filter(Boolean);

  targets.forEach(target => {
    target.addEventListener("touchstart", (e) => {
      if (modalContent.scrollTop <= 0) {
        startY = e.touches[0].clientY;
        isDragging = true;
      }
    }, { passive: true });

    target.addEventListener("touchmove", (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      if (diff > 0) {
        modalContent.style.transform = `translateY(${diff}px)`;
      }
    }, { passive: true });

    target.addEventListener("touchend", () => {
      if (!isDragging) return;
      isDragging = false;
      const diff = currentY - startY;
      modalContent.style.transform = "";
      if (diff > 75) {
        closeQuickLogModal();
      }
    }, { passive: true });
  });
}

function openQuickLogModal() {
  const accSelect = document.getElementById("quickLogAccountSelect");
  if (accSelect) {
    accSelect.innerHTML = State.accounts
      .filter(a => a.is_active !== false)
      .map(a => `<option value="${a.name}">${a.name}</option>`)
      .join("");
    accSelect.style.display = "none";
  }

  const catSelect = document.getElementById("quickLogCategorySelect");
  if (catSelect) {
    const expenseCats = State.categories.filter(c => c.type === "Expense" || c.type === "Debt");
    const hasBills = expenseCats.some(c => /^bills?$/i.test(c.name));
    let optsHtml = expenseCats.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
    if (!hasBills) {
      optsHtml += `<option value="Bills">Bills</option>`;
    }
    catSelect.innerHTML = optsHtml;
    catSelect.style.display = "none";
  }

  // Bind and refresh chip values
  initQuickLogChips();

  // Reset inputs
  const amtInput = document.getElementById("quickLogAmountInput");
  if (amtInput) amtInput.value = "";
  const descInput = document.getElementById("quickLogDescInput");
  if (descInput) descInput.value = "";

  // Set default active chips: HDFC and 🍔 Food
  const firstAccChip = document.querySelector("#quickLogAccountChips .chip-btn");
  if (firstAccChip) {
    document.querySelectorAll("#quickLogAccountChips .chip-btn").forEach(c => c.classList.remove("active"));
    firstAccChip.classList.add("active");
    if (accSelect && firstAccChip.dataset.targetValue) {
      accSelect.value = firstAccChip.dataset.targetValue;
    }
  }

  const firstCatChip = document.querySelector("#quickLogCategoryChips .chip-btn");
  if (firstCatChip) {
    document.querySelectorAll("#quickLogCategoryChips .chip-btn").forEach(c => c.classList.remove("active"));
    firstCatChip.classList.add("active");
    if (catSelect && firstCatChip.dataset.targetValue) {
      catSelect.value = firstCatChip.dataset.targetValue;
    }
  }

  const modal = document.getElementById("quickLogModal");
  if (modal) {
    modal.classList.add("active");
  }

  setupQuickLogPullDown();

  setTimeout(() => {
    document.getElementById("quickLogAmountInput")?.focus();
  }, 100);
}

function closeQuickLogModal() {
  const modal = document.getElementById("quickLogModal");
  if (modal) {
    modal.classList.remove("active");
  }
}

async function submitQuickLogTransaction() {
  const amtInput = document.getElementById("quickLogAmountInput");
  const amt = parseFloat(amtInput ? amtInput.value : "");
  if (!amt || amt <= 0) {
    showToast("Please enter a valid amount!", "warning");
    amtInput?.focus();
    return;
  }

  const activeAccChip = document.querySelector("#quickLogAccountChips .chip-btn.active");
  const accSelect = document.getElementById("quickLogAccountSelect");
  const account = (accSelect && accSelect.value) ? accSelect.value : (activeAccChip?.dataset.targetValue || "HDFC Bank Account");

  const activeCatChip = document.querySelector("#quickLogCategoryChips .chip-btn.active");
  const catSelect = document.getElementById("quickLogCategorySelect");
  const category = (catSelect && catSelect.value) ? catSelect.value : (activeCatChip?.dataset.targetValue || "Food & Dining");

  const descInput = document.getElementById("quickLogDescInput");
  const desc = (descInput && descInput.value.trim()) || `${category} (Quick Log)`;

  const tx = {
    id: "tx_" + Date.now(),
    date: new Date().toISOString().split("T")[0],
    transaction_type: "Expense",
    category: category,
    amount: amt,
    description: desc,
    account: account,
    status: "approved",
    source: "manual",
    created_at: new Date().toISOString()
  };

  State.transactions.unshift(tx);
  saveLocalTransactions(State.transactions);

  if (State.supabase) {
    try {
      await State.supabase.from("transactions").insert(tx);
    } catch (e) {
      console.warn("Supabase quick log sync warning:", e);
    }
  }

  closeQuickLogModal();
  showToast(`⚡ Saved ₹${amt.toLocaleString("en-IN")} via ${account}! Vault remains securely locked.`, "success");
}

// ==============================================================================
// UNIFIED CARD VAULT CRUD & MANAGEMENT
// ==============================================================================
function getCardDefaultTheme(cardName) {
  const n = (cardName || "").toLowerCase();
  if (n.includes("amex") || n.includes("american")) return "card-theme-amex";
  if (n.includes("coral")) return "card-theme-icici-coral";
  if (n.includes("amazon")) return "card-theme-icici-amazon";
  if (n.includes("pixel")) return "card-theme-pixel";
  if (n.includes("cheq") || n.includes("au small") || n.includes("au bank")) return "card-theme-cheq";
  if (n.includes("roar") || n.includes("rupay") || n.includes("unity")) return "card-theme-roar";
  if (n.includes("hdfc")) return "card-theme-hdfc";
  if (n.includes("kotak")) return "card-theme-kotak";
  return "card-theme-default";
}

function toggleCardVaultViewMode() {
  const tableWrapper = document.getElementById("creditCardTableWrapper");
  const deckContainer = document.getElementById("cardVaultDeckContainer");
  const btn = document.getElementById("cardViewToggleBtn");

  const isTable = tableWrapper.style.display !== "none";
  if (isTable) {
    tableWrapper.style.display = "none";
    deckContainer.style.display = "grid";
    btn.innerHTML = "📋 Table View";
  } else {
    tableWrapper.style.display = "block";
    deckContainer.style.display = "none";
    btn.innerHTML = "💳 Cards View";
  }
}

function openAddCardModal() {
  document.getElementById("manageCardModalTitle").textContent = "➕ Add New Credit / Debit Card";
  document.getElementById("manageCardOriginalName").value = "";
  document.getElementById("cardNameInput").value = "";
  document.getElementById("cardBankSelect").value = "HDFC Bank";
  document.getElementById("cardNetworkSelect").value = "RuPay";
  document.getElementById("cardCreditLimitInput").value = "100000";
  document.getElementById("cardBillingCycleDayInput").value = "16";
  document.getElementById("cardDueDayInput").value = "5";
  document.getElementById("cardThemeSelect").value = "card-theme-default";
  document.getElementById("cardPerksInput").value = "";

  document.getElementById("vaultHolderNameInput").value = "DHRUV GORI";
  document.getElementById("vaultCardNumberInput").value = "";
  document.getElementById("vaultExpiryInput").value = "";
  document.getElementById("vaultCvvInput").value = "";
  document.getElementById("vaultPinInput").value = "";
  document.getElementById("vaultNotesInput").value = "";

  document.getElementById("btnDeleteCard").style.display = "none";
  document.getElementById("manageCardModal").classList.add("active");
}

function openEditCardModal(cardName) {
  const card = State.accounts.find(a => a.name === cardName);
  if (!card) return;

  document.getElementById("manageCardModalTitle").textContent = `✏️ Edit ${card.name}`;
  document.getElementById("manageCardOriginalName").value = card.name;
  document.getElementById("cardNameInput").value = card.name;
  document.getElementById("cardBankSelect").value = card.bank || "HDFC Bank";
  document.getElementById("cardNetworkSelect").value = card.network || "RuPay";
  document.getElementById("cardCreditLimitInput").value = card.credit_limit || 0;
  document.getElementById("cardBillingCycleDayInput").value = card.billing_cycle_day || 16;
  document.getElementById("cardDueDayInput").value = card.payment_due_day || 5;
  document.getElementById("cardThemeSelect").value = card.theme_class || getCardDefaultTheme(card.name);
  document.getElementById("cardPerksInput").value = card.perks || "";

  const vault = State.decryptedVault[card.name] || {};
  document.getElementById("vaultHolderNameInput").value = vault.holderName || "DHRUV GORI";
  document.getElementById("vaultCardNumberInput").value = vault.cardNumber || "";
  document.getElementById("vaultExpiryInput").value = vault.expiry || "";
  document.getElementById("vaultCvvInput").value = vault.cvv || "";
  document.getElementById("vaultPinInput").value = vault.pin || "";
  document.getElementById("vaultNotesInput").value = vault.notes || "";

  document.getElementById("btnDeleteCard").style.display = "block";
  document.getElementById("manageCardModal").classList.add("active");
}

function closeManageCardModal() {
  document.getElementById("manageCardModal").classList.remove("active");
}

async function saveCardConfiguration() {
  const origName = document.getElementById("manageCardOriginalName").value;
  const name = document.getElementById("cardNameInput").value.trim();
  const bank = document.getElementById("cardBankSelect").value;
  const network = document.getElementById("cardNetworkSelect").value;
  const limit = parseFloat(document.getElementById("cardCreditLimitInput").value) || 0;
  const cycleDay = parseInt(document.getElementById("cardBillingCycleDayInput").value) || 16;
  const dueDay = parseInt(document.getElementById("cardDueDayInput").value) || 5;
  const theme = document.getElementById("cardThemeSelect").value;
  const perks = document.getElementById("cardPerksInput").value.trim();

  if (!name) {
    showToast("Please enter a Card Name!", "warning");
    return;
  }

  // Confidential credentials
  const holderName = document.getElementById("vaultHolderNameInput").value.trim();
  const rawNum = document.getElementById("vaultCardNumberInput").value.replace(/\s+/g, "");
  const expiry = document.getElementById("vaultExpiryInput").value.trim();
  const cvv = document.getElementById("vaultCvvInput").value.trim();
  const pin = document.getElementById("vaultPinInput").value.trim();
  const notes = document.getElementById("vaultNotesInput").value.trim();

  const vaultPayload = {
    holderName,
    cardNumber: rawNum,
    expiry,
    cvv,
    pin,
    notes
  };

  // Encrypt with in-memory key if unlocked
  if (State.security.inMemoryKey) {
    const encPayload = await VaultCrypto.encryptObject(vaultPayload, State.security.inMemoryKey);
    if (encPayload) {
      const allVaults = JSON.parse(localStorage.getItem("tracker_card_vaults_enc") || "{}");
      allVaults[name] = encPayload;
      localStorage.setItem("tracker_card_vaults_enc", JSON.stringify(allVaults));
    }
  }

  State.decryptedVault[name] = vaultPayload;
  const last4 = rawNum.length >= 4 ? rawNum.slice(-4) : "••••";

  let card = State.accounts.find(a => a.name === origName);
  if (card && origName) {
    card.name = name;
    card.bank = bank;
    card.network = network;
    card.credit_limit = limit;
    card.billing_cycle_day = cycleDay;
    card.payment_due_day = dueDay;
    card.theme_class = theme;
    card.perks = perks;
    card.last4 = last4;
  } else {
    card = {
      name: name,
      type: "Credit Card",
      bank: bank,
      network: network,
      credit_limit: limit,
      opening_balance: 0,
      billing_cycle_day: cycleDay,
      payment_due_day: dueDay,
      payment_due_date: "",
      current_bill_amount: 0,
      is_bill_paid: false,
      theme_class: theme,
      perks: perks,
      last4: last4,
      is_active: true
    };
    State.accounts.push(card);
  }

  localStorage.setItem("tracker_accounts_custom", JSON.stringify(State.accounts));

  if (State.supabase) {
    try {
      await State.supabase.from("accounts").upsert({
        name: card.name,
        type: card.type,
        credit_limit: card.credit_limit,
        billing_cycle_day: card.billing_cycle_day,
        color: card.theme_class || "#4f46e5",
        is_active: true
      }, { onConflict: "name" });
    } catch (e) {
      console.warn("Supabase account upsert warning:", e);
    }
  }

  populateAccountSelects();
  renderApp();
  closeManageCardModal();
  showToast(`Card "${name}" saved to Secure Vault!`, "success");
}

async function confirmDeleteCard() {
  const origName = document.getElementById("manageCardOriginalName").value;
  if (!origName) return;

  const txCount = State.transactions.filter(t => t.account === origName).length;
  if (txCount > 0) {
    const confirmArchive = confirm(`Card "${origName}" has ${txCount} historical transactions recorded in your ledger. Would you like to ARCHIVE it instead so past records are preserved safely?`);
    if (confirmArchive) {
      const card = State.accounts.find(a => a.name === origName);
      if (card) card.is_active = false;
      localStorage.setItem("tracker_accounts_custom", JSON.stringify(State.accounts));
      delete State.decryptedVault[origName];
      closeManageCardModal();
      populateAccountSelects();
      renderApp();
      showToast(`Card "${origName}" archived!`, "info");
    }
    return;
  }

  const confirmDel = confirm(`Are you sure you want to permanently delete "${origName}"?`);
  if (!confirmDel) return;

  State.accounts = State.accounts.filter(a => a.name !== origName);
  localStorage.setItem("tracker_accounts_custom", JSON.stringify(State.accounts));
  delete State.decryptedVault[origName];

  const allVaults = JSON.parse(localStorage.getItem("tracker_card_vaults_enc") || "{}");
  delete allVaults[origName];
  localStorage.setItem("tracker_card_vaults_enc", JSON.stringify(allVaults));

  if (State.supabase) {
    try {
      await State.supabase.from("accounts").delete().eq("name", origName);
    } catch (e) {}
  }

  closeManageCardModal();
  populateAccountSelects();
  renderApp();
  showToast(`Card "${origName}" removed.`, "info");
}

function copyCardValue(val, label) {
  if (!val) {
    showToast(`No ${label} recorded yet. Tap "Vault / Edit" to add it!`, "warning");
    return;
  }
  navigator.clipboard.writeText(val).then(() => {
    showToast(`Copied ${label} to clipboard! 📋`, "success");
  }).catch(() => {
    showToast(`Copied: ${val}`, "success");
  });
}

function toggleCardNumberVisibility(safeId, realNum) {
  const el = document.getElementById(`cardNumVal_${safeId}`);
  if (!el || !realNum) return;
  const isMasked = el.textContent.includes("••••");
  if (isMasked) {
    el.textContent = realNum.replace(/(\d{4})/g, "$1 ").trim();
  } else {
    el.textContent = realNum.replace(/(\d{4})(\d{4})?(\d{4})?(\d{4})?/, (_, a, b, c, d) => `${a} •••• •••• ${d || c || b}`);
  }
}

function toggleCvvVisibility(safeId, realCvv) {
  const el = document.getElementById(`cvvVal_${safeId}`);
  if (!el || !realCvv) return;
  el.textContent = (el.textContent === "•••") ? realCvv : "•••";
}

function togglePinVisibility(safeId, realPin) {
  const el = document.getElementById(`pinVal_${safeId}`);
  if (!el || !realPin) return;
  el.textContent = (el.textContent === "••••") ? realPin : "••••";
}

function switchMobileTab(tabId) {
  document.querySelectorAll(".dock-item").forEach(d => {
    d.classList.toggle("active", d.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll(".nav-tab").forEach(t => {
    const isActive = t.getAttribute("data-tab") === tabId;
    t.classList.toggle("active", isActive);
    if (isActive) {
      t.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  });
  document.querySelectorAll(".tab-pane").forEach(p => {
    p.classList.toggle("active", p.id === tabId);
  });
  if (tabId === "analytics") {
    setTimeout(renderCharts, 100);
  }
  if (window.lucide) {
    lucide.createIcons();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}
