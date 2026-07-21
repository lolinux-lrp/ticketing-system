# TicketFlow

**An Autonomous Helpdesk Ticketing System**

TicketFlow is a robust, autonomous helpdesk platform engineered for modern organizations. Built on top of the Next.js App Router, it features real-time email ingestion via native Gmail APIs, strict SLA escalation tracking, domain-to-project routing, and a highly dynamic management dashboard. 

## 🏗️ Technology Stack

- **Core Framework:** Next.js 16 (App Router)
- **Language:** TypeScript (Strict Mode)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Styling:** Tailwind CSS (v4)
- **Integrations:** Google APIs (`googleapis`), NextAuth.js

---

## 🚀 Core Features Breakdown

### 1. Autonomous Email Ingestion (`/api/cron/ingest-gmail`)
Our backend autonomously monitors a connected Gmail inbox for incoming support emails. When an email arrives, the ingestion engine:
- **Smart Routing:** Evaluates the sender's email domain against our registered projects. If a domain strictly matches a project, the ticket is routed accordingly. Unmapped domains safely fall back to the "Other" project category to preserve strict database relational constraints without mutating the project table unexpectedly.
- **Parses & Sanitizes:** Extracts the sender, subject, and text body, stripping out HTML and malformed characters.
- **Spam & Noise Filtering:** Automatically rejects automated newsletters, no-reply addresses, and calendar invites so agents aren't overwhelmed with junk tickets.
- **Thread Tracking:** Utilizes the RFC 2822 `Message-ID` to guarantee idempotency and prevent duplicate processing if a network failure occurs after Gmail ingestion.

### 2. Automated SLA Escalation Engine (`/api/cron/check-sla`)
The system guarantees response times using a two-tier Service Level Agreement (SLA) escalation workflow:
- **Level 1 (Admin Alerts):** Tickets unassigned for 1, 2, or 4 hours trigger automated warning emails to all system Administrators (delivered safely via `Bcc` to protect privacy).
- **Level 2 (Executive Escalation):** Tickets remaining unattended beyond 2 elapsed hours trigger a critical alert dispatched directly to the Executive Escalation Email.
- **Security:** Built with strict timing-safe authorization checks and RFC 2822 CRLF header sanitization to protect against SMTP injection attacks.

### 3. Dynamic Agent Dashboard
The web interface provides a robust workspace for support agents and administrators.
- **Real-time Ticket Grids:** Agents can view tickets, assign themselves to issues, and track priorities (P1-P4) and statuses (Open, In Progress, Resolved).
- **Strict Filtering:** The dashboard allows complex filtering combinations (by project, assignee, status, priority, and date range).
- **Defensive UI Layouts:** Designed with strict `min-w-0` and `truncate` flexbox boundaries to prevent UI collisions from unexpectedly long user strings (e.g., names and emails).

### 4. Uncapped CSV Export
The `/api/tickets/export` endpoint shares a centralized Prisma filter builder (`src/lib/filters.ts`) with the dashboard. This ensures 100% parity: clicking the "Export CSV" button safely aggregates all active UI parameters and downloads a complete, strictly-filtered CSV without pagination caps.

### 5. Interactive Ticket Comments
Tickets support robust, threaded conversation threads.
- Agents, Admins, and Customers can communicate directly on a ticket.
- Enforces strict RBAC (Customers can only comment on their own tickets).
- UI utilizes resilient flexbox spacing and truncation to handle large comment blocks gracefully.

### 6. Meeting & Calendar Integration
The app includes features to schedule meetings directly related to tickets. 
- Automatically generates `.ics` calendar invites for participants.
- Supports native Google Meet link generation for scheduled support calls.
- Provides a dedicated UI calendar view on the dashboard for agents to track upcoming ticket-related meetings.
- **Automated Reminders:** A dedicated background cron job (`/api/cron/reminders`) sweeps the database and automatically sends reminder emails to all attendees exactly 15 minutes before a scheduled meeting begins.

### 7. Role-Based Access Control (RBAC)
The platform is secured by NextAuth and enforces strict boundaries:
- **Customers:** Can only view, comment on, and export their own submitted tickets.
- **Agents:** Can view and manage all tickets, update statuses, schedule meetings, and take assignments.
- **Admins:** Have full control over system configuration, project creation, and agent invitations.

### 8. Type-Safe Email Template Engine
Located in `src/lib/email-templates/`, the centralized email engine decouples complex backend logic from MIME string formatting. It relies on strict TypeScript interfaces to guarantee that variables passed to email templates are strictly typed. All user inputs are rigorously passed through an `escapeHtml` utility to mitigate Cross-Site Scripting (XSS).

---

## 💻 Local Development & Setup Guide

### Prerequisites
- Node.js (v20+)
- PostgreSQL (running locally or via Docker)
- **Mandatory Package Manager:** `pnpm` (npm, yarn, and npx are strictly forbidden in this workspace).

### Environment Variables
Create a `.env` file in the root directory. The application relies on the following configurations:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. |
| `NEXTAUTH_SECRET` | Secret key for NextAuth session encryption. |
| `APP_BASE_URL` | The canonical URL of the application (e.g., `http://localhost:3000`). |
| `CRON_SECRET` | Bearer token secret to authenticate background CRON requests. |
| `EXEC_ESCALATION_EMAIL` | The designated email address for Level 2 SLA escalations. |
| `SLA_EXCLUDED_EMAILS` | Comma-separated list of emails exempt from receiving SLA admin warnings. |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID for Google APIs. |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret for Google APIs. |
| `GOOGLE_REFRESH_TOKEN` | Long-lived refresh token for offline Gmail access. |
| `GOOGLE_EMAIL` | The authorized inbox email address the system should monitor. |
| `DEFAULT_FROM_EMAIL` | Fallback system sender address. |
| `SMTP_HOST` / `PORT` / `USER` / `PASSWORD` | Optional manual SMTP overrides if not utilizing native Google APIs. |

### Database Initialization
Before running the application, generate the Prisma client and synchronize your PostgreSQL database schema:
```bash
pnpm prisma generate
pnpm prisma db push
```
*(Optional)* Seed the database with initial users and projects:
```bash
pnpm run seed
```

---

## ⚙️ Running the Application & Background Automation

The local development environment requires a dual-terminal workflow to simulate production background automation.

**Terminal 1 (Web App):**
Starts the Next.js development server on port 3000.
```bash
pnpm dev
```

**Terminal 2 (Local Cron Poller):**
Executes `scripts/local-cron.ts`, which autonomously pings the `/api/cron/ingest-gmail` endpoint every 5 minutes and `/api/cron/check-sla` every 10 minutes using your local `CRON_SECRET`.
```bash
pnpm cron:dev
```

### Production Automation
In a production environment (e.g., Vercel), the background automation is managed natively by `vercel.json` cron configurations. The Vercel infrastructure automatically triggers the ingestion and SLA endpoints, authenticating securely via the `Bearer CRON_SECRET` header.

---

## 🛡️ Verification & Code Quality Pipeline

We enforce strict engineering standards. Before committing code, you must run the following pipeline to guarantee zero type errors, clean linting, and build stability:

1. **Strict TypeScript Verification:**
   Ensures zero implicitly typed (`any`) variables.
   ```bash
   pnpm tsc --noEmit
   ```

2. **Linting Check:**
   Validates code style and hygiene.
   ```bash
   pnpm lint
   ```

3. **Production Build Simulation:**
   Validates the Turbopack production compilation.
   ```bash
   pnpm build
   ```
