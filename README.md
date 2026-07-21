# TicketFlow

## Executive Summary
This project represents a highly scalable, full-stack enterprise support and scheduling platform. Engineered for high-throughput teams, the system bridges the gap between asynchronous technical support requests and synchronous video communications. The architecture enforces rigid Role-Based Access Control (RBAC), preventing ticket hijacking, unauthorized state transitions, and unsanctioned meeting modifications. 

## System Architecture & Tech Stack
The platform is constructed utilizing modern, high-performance web standards:
- **Core Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (Strict Mode Enforced)
- **Database & ORM:** PostgreSQL managed via Prisma Client
- **State Management:** Redux Toolkit (RTK Query) for seamless data fetching and cache normalization
- **Styling:** Tailwind CSS (Version 4)
- **Authentication:** NextAuth.js (Session-based JWT Authentication)
- **Integrations:** Google Meet API for automated video room provisioning; Nodemailer for RFC-compliant ICS dispatching.

## Core Modules & Capabilities

### Authentication, Authorization & User Management
- **Session Management:** Secure session-based JWT authentication powered by NextAuth.js.
- **Role-Based Access Control (RBAC):** Users are granted specific roles (`ADMIN`, `AGENT`, `CUSTOMER`) which govern their permissions across the platform, preventing unauthorized state transitions and ticket hijacking.
- **Custom Auth Flows:** Comprehensive support for user signup, setting passwords, and password changes.
- **User Invitations:** Administrative capability to securely invite new users to the platform.

### Email-to-Ticket Gateway
- **Automated Ingestion:** A background cron service connects directly to a support Gmail inbox via OAuth2 to convert incoming customer emails into tickets.
- **Smart Filtering & Extraction:** Automatically filters out promotional emails, newsletters, and auto-replies (`no-reply`, `mailer-daemon`), stripping HTML and reply chains to extract the clean message body.
- **Automated Priority Scoring:** Scans email subjects and bodies for critical keywords (e.g., "urgent", "broken", "issue") to automatically assign the correct priority (`P1` through `P4`).
- **Domain-Based Project Routing:** Automatically maps the sender's email domain to route the ticket to the correct Project workspace, and creates customer accounts on-the-fly for new senders.

### Ticketing & Project Management
The ticketing module is the central nervous system for customer support requests.
- **Project Organization:** Tickets can be logically grouped into Projects for streamlined management.
- **State & Priority Tracking:** Tickets track precise statuses (`OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`) and priorities (`P1` to `P4`).
- **Assignment & Workflows:** Strict state-machine guards ensure tickets are properly assigned to `AGENT`s or `ADMIN`s.
- **Advanced Full-Text Search:** High-performance search capabilities utilizing PostgreSQL `tsvector` across ticket titles and descriptions.
- **Data Export:** Secure endpoints allow authorized personnel to export ticket data into CSV format filtered by date ranges.

### Collaboration System
- **Threaded Comments:** Integrated commenting system on tickets allowing seamless asynchronous communication between customers and support agents.

### Scheduling & Video Infrastructure
The calendar subsystem enables localized, multi-timezone meeting scheduling attached directly to support tickets.
- **Automated Video Rooms:** Silent Google Meet room generation via a secure, service-level OAuth2 architecture.
- **RFC-Compliant Dispatching:** Dynamic `.ics` file generation for native calendar invites (`REQUEST`) and cancellations (`CANCEL`) via the email subsystem (Nodemailer).
- **Attendee RSVP Management:** End-to-end synchronization tracking attendee statuses (`ACCEPTED`, `DECLINED`, `PENDING`, `CANCELLED`).
- **Robust UI Validation:** Bespoke time input UI with strict formatting compliance guarantees for meeting creation.

### Background Automation
- **Cron Pipeline:** A secured background service executing at 15-minute intervals, protected by a `CRON_SECRET` bearer token.
- **Preemptive Reminders:** Computes upcoming appointment boundaries and automatically dispatches reminder notifications to attendees to ensure meeting attendance.

### Localized UX & Real-Time Caching
- **RTK Query Caching:** The frontend leverages Redux Toolkit (RTK Query) for robust data fetching and request deduplication.
- **Targeted Cache Invalidation:** API mutations automatically trigger refetches of targeted dashboard panels without full page reloads.
- **Localized Timezone Rendering:** Client rendering uses `Intl.DateTimeFormat` for localized timezones. Hydration safety is managed by stable locale inputs or client-only rendering to prevent Next.js mismatch errors.

## Local Development Setup

To initialize the application locally, ensure you have PostgreSQL installed and running, then follow the instructions below:

1. **Clone the Repository**
   Retrieve the codebase and navigate to the project root.

2. **Install Dependencies**
   The project strictly uses `pnpm` for package resolution.
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**
   Duplicate the example environment file and populate the required configuration values.
   ```bash
   cp .env.example .env
   ```

4. **Initialize Database**
   Push the schema to your local PostgreSQL instance and generate the Prisma Client.
   ```bash
   pnpm prisma generate
   pnpm prisma migrate dev
   ```

5. **Start the Development Server**
   Launch the Turbopack-powered Next.js instance.
   ```bash
   pnpm run dev
   ```

## Environment Variables Reference

| Variable Name | Purpose |
| ------------- | ------- |
| `DATABASE_URL` | PostgreSQL connection string for Prisma. |
| `NEXTAUTH_SECRET` | Cryptographic secret for signing NextAuth.js JWT tokens. |
| `NEXTAUTH_URL` | Base canonical URL of the application. |
| `CRON_SECRET` | Security bearer token to validate automated cron requests. |
| `GOOGLE_EMAIL` | The Google Workspace email address for OAuth sending. |
| `GOOGLE_CLIENT_ID` | OAuth2 Client ID for the Google Workspace service account. |
| `GOOGLE_CLIENT_SECRET` | OAuth2 Client Secret for the Google Workspace service account. |
| `GOOGLE_REFRESH_TOKEN` | Persistent OAuth2 token for silent Google Meet creation. |
| `DEFAULT_FROM_EMAIL` | Default sender email address for system notifications. |
| `APP_BASE_URL` | The public base URL for links in emails (e.g. http://localhost:3000). |
| `SMTP_HOST` | Hostname for the outgoing mail server. |
| `SMTP_PORT` | Port configuration for the mail server (typically 587 or 465). |
| `SMTP_USER` | Authenticated username for the mail transporter. |
| `SMTP_PASSWORD` | Authenticated password for the mail transporter. |

## Testing & Build Verification

Prior to pushing changes or triggering CI/CD pipelines, you must verify type integrity and compile the production payload.

**Type Safety Validation:**
Execute strict TypeScript checks across the entire project repository.
```bash
pnpm tsc --noEmit
```

**Production Build:**
Verify that the Next.js build compilation passes without errors.
```bash
pnpm run build
```
