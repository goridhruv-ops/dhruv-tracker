import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
# Remove default sheet
wb.remove(wb.active)

# Color Scheme: Elegant Slate / Fintech Navy
HEADER_FILL = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
TITLE_FILL = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
TITLE_FONT = Font(name="Calibri", size=13, bold=True, color="FFFFFF")
SUBTITLE_FONT = Font(name="Calibri", size=10, italic=True, color="64748B")

DATA_FONT = Font(name="Calibri", size=11)
BOLD_DATA_FONT = Font(name="Calibri", size=11, bold=True)
NOTE_FONT = Font(name="Calibri", size=9, italic=True, color="475569")

THIN_BORDER = Border(
    left=Side(style='thin', color='E2E8F0'),
    right=Side(style='thin', color='E2E8F0'),
    top=Side(style='thin', color='E2E8F0'),
    bottom=Side(style='thin', color='E2E8F0')
)

ZEBRA_FILL = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

def style_sheet(ws, title_text, headers, rows):
    # Title Row
    ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(headers))
    title_cell = ws.cell(row=1, column=1, value=title_text)
    title_cell.fill = TITLE_FILL
    title_cell.font = TITLE_FONT
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32

    # Header Row
    ws.row_dimensions[2].height = 24
    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=h)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = THIN_BORDER

    # Data Rows
    for r_idx, row_data in enumerate(rows, 3):
        ws.row_dimensions[r_idx].height = 20
        is_zebra = (r_idx % 2 == 0)
        for c_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=r_idx, column=c_idx, value=val)
            cell.font = DATA_FONT
            cell.border = THIN_BORDER
            if is_zebra:
                cell.fill = ZEBRA_FILL
            
            # Alignments & Formats
            if isinstance(val, (int, float)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
                if c_idx in [3, 5, 9]: # Amounts/Limits
                    cell.number_format = "#,##0"
            elif isinstance(val, str) and (val.startswith("2026-") or "/" in val):
                cell.alignment = Alignment(horizontal="center", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # Auto-adjust column widths
    for col in ws.columns:
        max_len = 0
        col_letter = get_column_letter(col[0].column)
        for cell in col:
            # Skip merged title row for width calculation
            if cell.row == 1:
                continue
            val_str = str(cell.value or '')
            if len(val_str) > max_len:
                max_len = len(val_str)
        ws.column_dimensions[col_letter].width = max(max_len + 4, 14)

# -------------------------------------------------------------
# SHEET 1: Opening_Balances
# -------------------------------------------------------------
ws1 = wb.create_sheet(title="Opening_Balances")
headers1 = ["Account Name", "Account Type", "Opening Balance (₹)", "Books Start Date", "Primary Purpose / Description"]
rows1 = [
    ["Opening Rollover (B/F from September)", "Rollover", 25000, "2026-10-01", "Surplus cash carried forward from previous month"],
    ["HDFC Bank Account", "Bank", 25000, "2026-10-01", "Primary Salary Account, Debits, Rent & Bills"],
    ["Kotak Bank Account", "Bank", 10000, "2026-10-01", "Stock Trading & Investment Liquidity Account"],
    ["Cash in Hand", "Cash", 1000, "2026-10-01", "Physical Wallet & Cash Expenses"]
]
style_sheet(ws1, "🏦 DHRUV FINANCIAL OS — BANK & CASH OPENING BALANCES", headers1, rows1)

# -------------------------------------------------------------
# SHEET 2: Credit_Cards_Vault
# -------------------------------------------------------------
ws2 = wb.create_sheet(title="Credit_Cards_Vault")
headers2 = [
    "Card Name", "Bank / Issuer", "Card Network", "Last 4 Digits",
    "Credit Limit (₹)", "Billing Cycle Day", "Payment Due Date",
    "Full Card Number (Optional)", "Expiry MM/YY", "CVV", "ATM PIN", "Perks & Benefits"
]
rows2 = [
    ["American Express Credit Card", "American Express", "Amex", "4001", 360000, 8, "2026-10-26", "", "10/28", "", "", "8th cycle, Due 26th of month"],
    ["ICICI Bank Credit Card (Coral)", "ICICI Bank", "Visa", "2004", 100000, 2, "2026-10-20", "", "08/28", "", "", "2nd-3rd cycle, Due 19th-20th of month"],
    ["Amazon Pay ICICI Bank Credit Card", "ICICI Bank", "Visa", "3002", 120000, 2, "2026-10-19", "", "12/27", "", "", "2nd-3rd cycle, Due 19th of month"],
    ["HDFC Bank Pixel Play Credit Card", "HDFC Bank", "Visa", "9006", 15000, 1, "2026-10-21", "", "04/28", "", "", "1st-2nd cycle, Due 21st of month"],
    ["HDFC Bank MoneyBack+ Credit Card", "HDFC Bank", "Visa", "1005", 69000, 12, "2026-11-02", "", "11/27", "", "", "12th cycle, Due 1st-2nd of following month"],
    ["Roarbank Credit Card (Unity Small Finance Bank)", "Unity / Roar", "RuPay", "5003", 150000, 30, "2026-10-28", "", "05/29", "", "", "30th/1st cycle, Due 28th of following month"],
    ["CheQ Credit Card (AU Small Finance Bank)", "AU Small Finance Bank", "Visa", "7007", 100000, 24, "2026-11-13", "", "09/29", "", "", "24th cycle, Due 13th of following month"]
]
style_sheet(ws2, "💳 DHRUV FINANCIAL OS — UNIFIED CREDIT CARDS & VAULT CONFIGURATION", headers2, rows2)

# -------------------------------------------------------------
# SHEET 3: Person_Ledgers
# -------------------------------------------------------------
ws3 = wb.create_sheet(title="Person_Ledgers")
headers3 = ["Person / Entity Name", "Category / Role", "Opening Balance B/F (₹)", "Balance Direction", "Notes & Description"]
rows3 = [
    ["Dad", "Family Ledger", 0, "They Owe Me", "Family shared expenses and monthly settles"],
    ["Bismarck", "Business / Work Ledger", 0, "They Owe Me", "Work expenses, company travel and official reimbursements"]
]
style_sheet(ws3, "👥 DHRUV FINANCIAL OS — PERSON & REIMBURSEMENT LEDGERS", headers3, rows3)

# -------------------------------------------------------------
# SHEET 4: Loans_and_EMIs
# -------------------------------------------------------------
ws4 = wb.create_sheet(title="Loans_and_EMIs")
headers4 = [
    "Loan / Item Name", "Linked Card / Account", "Original Amount (₹)",
    "Monthly EMI (₹)", "Total Tenure (Months)", "Start Date", "Remaining Months", "Status"
]
rows4 = [
    # Clean fresh slate: Add your active loans or EMIs below if any occur
]
style_sheet(ws4, "📅 DHRUV FINANCIAL OS — ACTIVE LOANS & EMI REPAYMENT SCHEDULE", headers4, rows4)

# -------------------------------------------------------------
# SHEET 5: Budget_Categories
# -------------------------------------------------------------
ws5 = wb.create_sheet(title="Budget_Categories")
headers5 = ["Category Name", "Type", "Expected Monthly Budget (₹)", "Icon / Description"]
rows5 = [
    ["Food & Dining", "Expense", 8000, "🍔 Swiggy, Zomato, Restaurants, Cafes"],
    ["Groceries & Blinkit", "Expense", 5000, "🛒 Blinkit, Zepto, Supermarket, Milk"],
    ["Fuel & Conveyance", "Expense", 4000, "⛽ Petrol, Uber, Auto, Fastag"],
    ["Shopping & Lifestyle", "Expense", 4000, "🛍️ Clothes, Amazon, Personal purchases"],
    ["Bills & Utilities", "Expense", 3000, "💡 Electricity, Wi-Fi, Mobile recharge"],
    ["Entertainment & OTT", "Expense", 1000, "🎬 Netflix, Spotify, Cinema"],
    ["Loan / EMI Payment", "Debt", 0, "💳 General EMI / Loan (Add specific when they occur)"],
    ["Salary", "Income", 25000, "💼 Monthly Professional Salary"],
    ["Kotak Transfer", "Income", 9439, "📈 Liquidity / Trading pull-in"],
    ["Emergency Fund", "Savings", 1000, "🛡️ Savings reserve"]
]
style_sheet(ws5, "📊 DHRUV FINANCIAL OS — BUDGET CATEGORIES & CASH FLOW PLAN", headers5, rows5)

# Save workbook
output_path = "Dhruv_Financial_OS_Setup_Template.xlsx"
wb.save(output_path)
print(f"Successfully generated: {output_path}")
