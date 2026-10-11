# Digital Reverse Shark Tank

Official competition platform for **IEEE Computer Society – VVCE Student Branch** (Vidyavardhaka College of Engineering, Mysuru).

In Digital Reverse Shark Tank, participating startup teams dissect real-world failed companies (e.g. Theranos, WeWork, Byju's, FTX, Quibi), pitch realistic recovery strategies, and invest a fixed budget of virtual points into competitor presentations. Independent judges evaluate each presentation privately across 5 criteria. Final scores and leaderboard rankings are computed deterministically combining judge scores (60%) and investment score (40%).

---

## 1. Architectural Highlights

- **Frontend:** Next.js (App Router, Strict TypeScript), Tailwind CSS, Lucide React, Recharts, Sonner toasts.
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Realtime).
- **Authentication & Authorization:** Secure HttpOnly cookies via `@supabase/ssr`, role guards enforced at **three distinct layers**: Next.js Middleware, Server Actions/Route Handlers, and PostgreSQL Row Level Security (default-deny).
- **Virtual Investment Engine:** PostgreSQL `SECURITY DEFINER` function with `SELECT ... FOR UPDATE` row locking to eliminate race conditions and overspending.
- **Scoring Engine:** Pure TypeScript module mirrored by a PostgreSQL calculation function, with exact tie-breaking:
  1. Higher Final Score
  2. Higher Average Judge Score
  3. Higher Points Received
  4. Team Name alphabetical (case-insensitive)
  5. Team ID
- **Excel Formula-Injection Protection:** CSV exports neutralize spreadsheet injection vectors (`=`, `+`, `-`, `@`, `\t`) and prepend UTF-8 BOM (`\uFEFF`) for Excel compatibility.

---

## 2. Core Business Rules

1. **Scoring Split:** Defaults to **Judges 60% + Investment 40%**. Weights are admin-configurable before the Verification stage and must sum to exactly 100%.
2. **Investment Score:** `(Points Received / Highest Points Received) * 100`. If highest points is 0, Investment Score is 0 for all teams (no division by zero).
3. **Judge Normalization:** A judge's score for a team is the sum over criteria of `(score / max_score * weight)` (0–100 scale). Average Judge Score is the arithmetic mean of submitted evaluations only.
4. **No Incomplete Zeroes:** Missing or incomplete evaluations are **never** treated as zero. Advancing to Verification is blocked unless all evaluations are submitted or explicitly waived with an audit reason.
5. **No Self-Investment:** A team cannot invest in itself.
6. **Investor Confidentiality:** Teams never see which teams invested in them. Judges never see investment data or peer evaluations.

---

## 3. Competition Stage State Machine

Competition stages transition sequentially:

$$\text{SETUP} \longrightarrow \text{PRESENTATIONS} \longrightarrow \text{INVESTMENT\_OPEN} \longrightarrow \text{INVESTMENT\_CLOSED} \longrightarrow \text{JUDGING\_CLOSED} \longrightarrow \text{VERIFICATION} \longrightarrow \text{PUBLISHED}$$

- **Judging Window:** Open during `PRESENTATIONS` and `INVESTMENT_OPEN`. Locks at `JUDGING_CLOSED`.
- **Investment Window:** Accepted strictly during `INVESTMENT_OPEN`.
- **Publication:** Irreversible via the UI; triggers immutable results snapshots and opens public leaderboard.

---

## 4. Local Development Setup

### Prerequisites
- Node.js 18+ (tested on Node 20 & 24)
- npm 10+
- A Supabase project (hosted or local CLI)

### 1. Clone & Install Dependencies
```bash
git clone <repo-url>
cd Reverse_Shark_Tank
npm install
```

### 2. Environment Configuration
Create a `.env.local` file from the provided template:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3000

ADMIN_BOOTSTRAP_EMAIL=admin@vvce.ieee.org
ADMIN_BOOTSTRAP_PASSWORD=AdminVVCE@2026!
ADMIN_BOOTSTRAP_NAME=IEEE VVCE Event Administrator
```

### 3. Database Migrations
Apply the migrations located in `/supabase/migrations`:
1. `20260101000000_001_initial_schema.sql` (Tables, constraints, immutability triggers)
2. `20260101000001_002_rls_policies.sql` (Row Level Security policies)
3. `20260101000002_003_stored_functions.sql` (Transactional functions and scoring mirror)
4. `supabase/seed.sql` (Default event and criteria)

### 4. Bootstrap Initial Admin
Run the one-time provisioning script:
```bash
npm run bootstrap
```
This provisions the initial admin account using `ADMIN_BOOTSTRAP_EMAIL` and `ADMIN_BOOTSTRAP_PASSWORD`.

### 5. (Optional) Seed Demo Teams and Judges
For local dry runs and UI testing:
```bash
node scripts/seed-demo-event.js
```

### 6. Run the Application
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Running the Test Suite

Run unit and invariant test suites:
```bash
npm test
```
Runs 33 automated tests covering:
- Pure scoring engine formulas & zero-investment edge cases
- Precision and rounding (round-half-up with IEEE-754 floating point handling)
- Deterministic 5-tier tie-breaking
- Zod schema validations
- CSV formula-injection neutralization
- Concurrency simulation & balance conservation

---

## 6. Event-Day Operating Runbook (For IEEE CS VVCE Organizers)

### Pre-Event Checklist
- [ ] Admin logged in at `/admin`.
- [ ] Event stage set to `SETUP`.
- [ ] Registered teams created individually or imported via CSV (`/admin/teams`).
- [ ] Team credential sheet exported and distributed to team captains.
- [ ] Judges created (`/admin/judges`) and credentials distributed.
- [ ] Evaluation criteria reviewed (`/admin/criteria`); weights confirmed to sum to 100%.

### Live Event Execution
1. **Presentations Begin:**
   - Transition stage to `PRESENTATIONS` via the top-right button on the Admin Dashboard.
   - On `/admin/teams`, update each team's presentation status (`Pending` $\to$ `Presenting` $\to$ `Completed`) as they take the stage.
   - Judges log in at `/login` and submit/draft evaluations for each team.
2. **Investment Round Opens:**
   - Once presentations conclude, advance stage to `INVESTMENT_OPEN`.
   - Teams log in, navigate to `/team/invest`, and allocate their 1,000 virtual points to other teams.
   - Admin monitors live allocations on `/admin/investments` and alerts teams with 0 points deployed.
3. **Closing Investments & Judging:**
   - Announce last call for investments.
   - Transition stage to `INVESTMENT_CLOSED`. Allocations are locked.
   - Ensure all judges have completed submissions.
   - Transition stage to `JUDGING_CLOSED`.

### Handling Exceptions During Event
- **A judge accidentally submitted an evaluation with a typo:**
  Navigate to `/admin/evaluations`, locate the team, click **Reopen**, enter a mandatory reason (e.g. *"Judge requested score correction for criterion 3"*), and confirm. The judge can now update and re-submit.
- **A judge had technical issues or mentor conflict of interest:**
  Navigate to `/admin/evaluations`, click **Waive Pair**, enter the reason (e.g. *"Judge disconnected / conflict of interest"*), and confirm. This evaluation is excluded from that team's average without penalizing them as a zero.
- **Exporting a Pre-Publish Backup:**
  Navigate to `/admin/exports` and download the CSVs for results, investments, and evaluations.

### Verification & Final Publication
1. Navigate to `/admin/results`.
2. Inspect the **Pre-Publication Verification Checklist** (all 4 indicators must show green checks).
3. Review the preview scoring table.
4. Click **Publish Results** and confirm.
5. The public leaderboard on the home page (`/`) is now live and permanently locked.

---

## 7. License & Organizing Credits

Organized by **IEEE Computer Society – VVCE Student Branch**  
Vidyavardhaka College of Engineering, Mysuru, Karnataka, India.
