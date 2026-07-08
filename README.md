# Ticketing System

The Ticketing System is a modern, full-stack application designed to streamline support requests and issue management. It provides a robust, scalable foundation for tracking tasks and support tickets while enforcing role-based access control and maintaining real-time client-side state.

## Overview and Architecture

This application operates on a client-server architecture using the Next.js App Router for both frontend rendering and backend API routes. The backend interfaces with a PostgreSQL database via the Prisma ORM, ensuring strict data modeling and type safety. Authentication is handled centrally by NextAuth.js, which manages sessions and enforces access controls across all protected routes and API endpoints. The client relies on Redux Toolkit for predictable state management across complex UI components, ensuring a responsive and seamless user experience.

## Key Features

- **Role-Based Authentication:** Secure user authentication, session management, and authorization rules managed by NextAuth.js.
- **Relational Data Management:** Complex data relationships and schema migrations handled by Prisma ORM connected to PostgreSQL.
- **Predictable State Management:** Centralized client-side state architecture using Redux Toolkit.
- **Responsive User Interface:** Mobile-first, utility-based styling implemented with Tailwind CSS.
- **Transactional Notifications:** Automated email delivery for ticket lifecycle events via Nodemailer.
- **End-to-End Type Safety:** Strict static typing across the entire codebase using TypeScript, with runtime data validation enforced by Zod.

## Tech Stack

### Core
- **Framework:** Next.js (App Router, v16.2)
- **UI Library:** React (v19)
- **Language:** TypeScript

### Backend and Database
- **ORM:** Prisma (v7.8)
- **Database:** PostgreSQL (via @prisma/adapter-pg)
- **Authentication:** NextAuth.js (v4.24)

### Frontend and Styling
- **Styling:** Tailwind CSS (v4)
- **State Management:** Redux Toolkit, react-redux
- **Theming:** next-themes

### Utilities
- **Validation:** Zod
- **Email:** Nodemailer, Google APIs (OAuth2)
- **Security:** bcryptjs

## Prerequisites

Ensure the following dependencies are installed on the host machine prior to setup:
- **Node.js:** v20.x or higher
- **Package Manager:** pnpm (recommended), npm, or yarn
- **Database:** A running instance of PostgreSQL

## Getting Started and Installation

1. **Clone the repository:**
```bash
git clone <repository-url>
cd ticketing-system
```

2. **Install dependencies:**
```bash
pnpm install
```

3. **Configure environment variables:**
Create a `.env` file in the project root directory and define the required variables.

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/ticketing_db"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secure-random-string"

# Email Configuration
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="your-email@example.com"
SMTP_PASSWORD="your-secure-password"
EMAIL_FROM="noreply@example.com"
```

4. **Initialize the database:**
Generate the Prisma client and synchronize the schema.
```bash
pnpm prisma generate
pnpm prisma db push
```

## Usage and Scripts

The following commands are available for local development and production builds:

- **Start development server:**
```bash
pnpm dev
```

- **Build for production:**
```bash
pnpm build
```

- **Start production server:**
```bash
pnpm start
```

- **Run code linter:**
```bash
pnpm lint
```

- **Launch database GUI:**
```bash
pnpm prisma studio
```

## Project Structure

```text
ticketing-system/
├── prisma/                 # Database schema definitions and migrations
├── public/                 # Static assets
├── src/
│   ├── app/                # Next.js App Router (pages, layouts, API routes)
│   ├── components/         # Reusable React UI components
│   ├── lib/                # Shared utilities, configuration, and database clients
│   └── store/              # Redux Toolkit slices and store configuration
├── .env                    # Local environment variables
├── next.config.ts          # Next.js framework configuration
├── package.json            # Project dependencies and script definitions
└── tailwind.config.ts      # Tailwind CSS configuration
```

## Contributing

**Contributing:** 
To contribute, please fork the repository and create a feature branch. Submit a pull request detailing the changes made. Ensure all code conforms to the existing ESLint configuration prior to submission.


