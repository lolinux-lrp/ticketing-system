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

### Ticketing Engine
The ticketing module operates as the central nervous system for customer support requests. It implements strict state-machine guards ensuring tickets cannot progress from the open state without prior assignment. Furthermore, stringent Role-Based Access Control (RBAC) rules govern reassignment, ensuring that only administrators possess the clearance to reassign active tickets from other agents, preventing task theft and unauthorized state modifications. Database indexes optimize high-volume queries by status, priority, and creation date.

### Scheduling & Video Infrastructure
The integrated calendar subsystem enables localized, multi-timezone meeting scheduling directly attached to support tickets. Features include:
- **Robust UI Validation:** The frontend implements a bespoke 3-box time input UI coupled with custom Regex validation to guarantee strict formatting compliance and boundary safety during meeting creation.
- **Silent Room Provisioning:** Automated Google Meet room generation through a secure, service-level OAuth2 architecture.
- **RFC-Compliant Dispatching:** Dynamic `.ics` file generation triggering native calendar invites (`REQUEST`) and cancellations (`CANCEL`) via the email subsystem.
- **Smart RSVP Management:** End-to-end synchronization tracking attendee acceptance or decline statuses securely.

### Background Automation
To ensure meeting attendance and platform responsiveness, a secured background cron pipeline executes at 15-minute intervals. Protected by a stringent `CRON_SECRET` Bearer token mechanism, the service computes a forward-looking date boundary to query upcoming appointments and dispatches preemptive reminder notifications across the required network queues.

### Localized UX & Real-Time Caching
The user interface leverages RTK Query to maintain a robust, race-condition-free data layer. Granular cache invalidation (`invalidatesTags`) implementations guarantee that API mutations immediately refresh targeted dashboard panels in real-time without triggering redundant DOM reflows or full page reloads. Additionally, the application guarantees hydration-safe client rendering by utilizing `Intl.DateTimeFormat` for processing localized timezones, entirely eliminating server-to-client mismatch errors in Next.js 16 environments.

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
