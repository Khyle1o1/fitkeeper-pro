# FitKeeper Pro - Gym Management System

A comprehensive gym management system built with React, TypeScript, and modern web technologies.

## Project info

**URL**: https://lovable.dev/projects/1116fc44-429b-485d-bd67-f7621b2cefdf

## Authentication System

The application now features a complete user management system:

### Default Admin Account
- **Username**: `admin`
- **Password**: `Admin@123`
- **Role**: Admin (full access)

### User Management Features
- Create new user accounts with different roles (Admin/Staff)
- Secure password hashing using SHA-256
- User account activation/deactivation
- Role-based access control
- Account creation through signup page

### Getting Started
1. Use the default admin credentials to log in
2. Navigate to "User Management" to create additional accounts
3. Create staff accounts for other users
4. All users can be managed through the User Management interface

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1116fc44-429b-485d-bd67-f7621b2cefdf) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## PostgreSQL (Supabase) setup

This project uses Supabase (hosted PostgreSQL) for dynamic data.

1) Create a project at https://supabase.com
2) In the SQL editor, create a `members` table:

```
create table if not exists public.members (
  id text primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  membership_start_date date not null,
  membership_expiry_date date not null,
  status text not null default 'active',
  is_active boolean not null default true,
  inserted_at timestamp with time zone default now()
);

alter table public.members enable row level security;
create policy "Allow read" on public.members for select using (true);
create policy "Allow insert" on public.members for insert with check (true);
create policy "Allow update" on public.members for update using (true);
```

3) Add environment variables. Copy `.env.example` to `.env` and fill values from Project Settings → API:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4) Start the app:

```
npm install
npm run dev
```

Pages now read/write members via Supabase:
- Members list: fetches from `public.members`, archives by `is_active=false`.
- Add Member: inserts a new record.

### Attendance table

Run this SQL to add attendance tracking:

```
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  member_id text not null references public.members(id) on delete cascade,
  member_name text not null,
  checked_in_at timestamp with time zone not null default now()
);

alter table public.attendance enable row level security;
create policy "Allow read" on public.attendance for select using (true);
create policy "Allow insert" on public.attendance for insert with check (true);
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1116fc44-429b-485d-bd67-f7621b2cefdf) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
