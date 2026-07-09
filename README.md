# Budget Tracker

A personal budget tracking web app built with React, Vite, Tailwind CSS, and Supabase.

## Tech stack

- **Frontend:** React + Vite (TypeScript)
- **Styling:** Tailwind CSS v4
- **Backend / DB:** Supabase (Postgres + Auth)
- **Hosting:** GitHub Pages (static)

## Prerequisites

- Node.js 20+ (22 recommended)
- A [Supabase](https://supabase.com) project
- A GitHub repository for deployment

## Local setup

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd budget-tracker
   npm install
   ```

2. **Environment variables**

   Copy the example file and add your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   Fill in values from **Supabase Dashboard → Project Settings → API**:

   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Database schema**

   In the Supabase SQL Editor, run the contents of [`supabase/schema.sql`](./supabase/schema.sql).

   This creates `expenses`, `income`, and `debts` tables with Row Level Security so each user only sees their own data.

4. **Supabase Auth (recommended for local dev)**

   In **Authentication → Providers → Email**, ensure email sign-up is enabled.

   For quick local testing, you can disable **Confirm email** under email provider settings. Re-enable it before production if you want verified accounts.

5. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open the URL shown in the terminal (usually `http://localhost:5173`).

## Project structure

```
src/
  components/   # Shared UI (Layout, ProtectedRoute, …)
  contexts/     # AuthProvider
  hooks/        # useAuth
  lib/          # Supabase client
  pages/        # Route pages (stubs for now)
  types/        # Shared TypeScript types
supabase/
  schema.sql    # Database tables + RLS policies
```

## Scripts

| Command           | Description              |
| ----------------- | ------------------------ |
| `npm run dev`     | Start dev server         |
| `npm run build`   | Production build         |
| `npm run preview` | Preview production build |
| `npm run lint`    | Type-check with TypeScript |

## Deployment (GitHub Pages)

### Routing & base path

The app uses **HashRouter** (`#/dashboard`, etc.) so page refreshes work on GitHub Pages without a custom 404 redirect.

`vite.config.ts` sets `base` from `VITE_BASE_PATH`. Locally it defaults to `/`. The GitHub Actions workflow sets it to `/{repo-name}/` so assets load correctly on project sites (`https://<user>.github.io/<repo>/`).

If you rename the repository, the workflow picks up the new name automatically.

### One-time GitHub configuration

1. Push this repo to GitHub on the `main` branch.

2. **Enable GitHub Pages**
   - Repo **Settings → Pages**
   - **Source:** GitHub Actions

3. **Add repository secrets** (Settings → Secrets and variables → Actions)

   | Secret                     | Value                                      |
   | -------------------------- | ------------------------------------------ |
   | `VITE_SUPABASE_URL`        | Your Supabase project URL                  |
   | `VITE_SUPABASE_ANON_KEY`   | Your Supabase anon (public) key              |

   These are injected at build time so the static bundle can talk to Supabase.

4. Push to `main` (or run the workflow manually). The site will be published at:

   ```
   https://<github-username>.github.io/<repo-name>/
   ```

### Supabase settings for production

No extra redirect URLs are required for email/password auth with HashRouter. If you later add OAuth providers, add your GitHub Pages URL to **Authentication → URL Configuration → Redirect URLs**.

## What's next

This scaffold includes auth, protected routes, and page stubs. Feature work (forms, lists, dashboard logic) is intentionally not included yet.
