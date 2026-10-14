# ResidentHub
### Condominium Management and Facility Booking System — for City Residences Condominium Corporation

Capstone project by **Team LockedIn**: Comcom, Camille A. · Cunanan, Ralph Vincent · Fugaban, Jessele S. · Gancero, Ruby Angelica · Lopez, Zyrine Angelica G.

## What this repository is

This repository is the **public website** of City Residences (plain HTML, CSS and JavaScript, hosted on GitHub Pages). It introduces the condominium and its amenities, and hosts the **web portal** (`portal.html`) where the administrator and residents sign in.

The same system is also available as the **ResidentHub app** (Flutter, web and Android), in the repository `mochiematchaaa/Residenthub`; the web version opens from this site at `app.html`. The portal and the app read and write the same database rows, so they always show the same data.

## There is no sample data

The system starts empty. The administrator enters every detail (units, residents, dues, bookings, announcements, expenses, and so on) and creates every resident account.

- Sign-in uses real accounts (Supabase Authentication). There are no demo logins.
- All data is stored in the Supabase database and is shared between the web app and the Android app.
- Only the administrator can create resident accounts. A new account gets a temporary password and the resident must set a new one at first sign-in.
- Residents can see and change only what belongs to their own unit. This is enforced by database row-level security, not just by the screens.

## Files

| File | What it is |
|---|---|
| `index.html` / `index.css` / `index.js` | Public website: the condominium and its amenities. No sign-in. |
| `portal.html` / `portal.css` / `portal.js` | The web portal. Administrator: units, resident accounts, dues and payments, bookings, announcements and events, grievances, expenses. Resident: home, dues and payment proof, facility booking, grievances, password. Uses supabase-js (loaded from a CDN). |
| `app.html` / `app.css` / `app-links.js` | The full ResidentHub app inside a phone frame, plus the Android download link. |
| `admin.html`, `resident.html` | Redirect to `portal.html` (kept so old links still work). |
| `supabase-config.js` | Public Supabase project address and public (anon) key. |
| `profile-refresh.css` | Shared styling. |
| `logo.jpg`, `amenity-*.jpg`, `resident-login-bg.png` | Images (the building photo is the sign-in background). |

## Setting up the first administrator

1. In the Supabase dashboard, open Authentication → Users and add a user (email and your own password, Auto Confirm on).
2. In the SQL editor, set that user's profile role to admin: `update public.profiles set role = 'admin', name = 'Your Name' where email = 'your@email';`
3. Turn off "Allow new users to sign up" (Authentication → Sign In / Providers) so only the administrator can create accounts.

Never put the Supabase `service_role` key or the database password in any file in this repository.
