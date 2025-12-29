## Financial Management Module – Usage Overview

This module is the **in‑app finance cockpit** for an agency. It pulls together jobs, chart of accounts, journal entries, and transactions so a finance manager can see and control the books for a single agency database.

### Where it is used
- **Page**: `FinancialManagement.tsx` (usually routed as `/financial-management` or similar)
- **Linked modules**:
  - `Ledger` page (deep‑dive transaction history)
  - `Reports` page (saved financial reports)
  - Job details (`/jobs/:id`) and Job Cost Items dialog

### Main tabs and what they do
- **Accounting → Chart of Accounts**
  - Shows all accounts (assets, liabilities, equity, revenue, expenses) for the current agency.
  - Lets you **create / edit / delete** accounts.
  - Displays a **live balance** per account, computed from posted journal entries.

- **Accounting → Journal Entries**
  - Lists all journal entries (date, description, reference, status, total debit/credit).
  - "New Entry" opens `JournalEntryFormDialog` to:
    - Pick accounts from the chart of accounts.
    - Enter debit/credit lines that must balance.
    - Save as **draft** or **posted**.
  - Edit/delete existing entries; deleting also removes its lines.

- **Job Costing**
  - Lists jobs for the agency (status, budget, actual cost, hours, margin).
  - Actions per job:
    - Edit job details.
    - Open **Manage Costs** (job cost items dialog) to track detailed costs.
    - View full job page.
    - Delete job.
  - Gives a quick view of **job profitability** per project.

- **General Ledger**
  - Shows **flattened transactions** derived from posted journal entry lines.
  - Views:
    - All transactions (with type: debit/credit, category, amount, date).
    - Credits only, Debits only.
    - Summary of monthly income, expenses, and net income.
  - Clicking a transaction loads full journal entry + lines for inspection.

- **Financial Reports**
  - One‑click generators for:
    - Balance Sheet
    - Profit & Loss
    - Trial Balance
    - Job Profitability
    - Cash Flow
    - Monthly Summary
  - Each generator:
    - Builds report data from real accounts, jobs, and transactions.
    - Tries to **save it to the `reports` table** and then navigates to the Reports page.
    - If saving fails, it opens a simple HTML window with the JSON report for ad‑hoc review/export.

### Typical user flows
- **Daily operations (finance manager)**
  1. Open Financial Management for an agency.
  2. Check **Unified Stats** (assets, current balance, active jobs, net profit).
  3. Review new/updated **jobs** and adjust costs.
  4. Post **journal entries** for accruals, adjustments, payroll, etc.
  5. Scan **General Ledger** for unusual transactions.

- **Month‑end / reporting**
  1. Ensure all relevant journal entries are in status **posted**.
  2. Use **Reports** tab to generate:
     - Balance Sheet
     - Profit & Loss
     - Trial Balance
  3. Open the separate **Reports** page to download or review stored reports.

- **Job profitability review**
  1. On Job Costing tab, find jobs with low or negative margins.
  2. Drill into Manage Costs / job details to see where money is going.
  3. Use **Job Profitability** report for a cross‑job summary.

### Multi‑tenant behavior (per‑agency)
- All core financial data (jobs, chart_of_accounts, journal_entries, journal_entry_lines) is **scoped by `agency_id`**.
- The frontend always resolves the **current agency** first, then sends queries that filter by `agency_id`.
- This keeps each agency’s books isolated even though the UI and code paths are shared.

This is the high‑level behavior. If you tell me which part you care about most (e.g. job costing vs GL vs reporting), I can walk through that flow and its data model in more depth and we can identify gaps or missing features.