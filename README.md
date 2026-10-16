# ResidentHub
### Condominium Management and Facility Booking System — for City Residences Condominium Corporation

Capstone project by **Team LockedIn**: Comcom, Camille A. · Cunanan, Ralph Vincent · Fugaban, Jessele S. · Gancero, Ruby Angelica · Lopez, Zyrine Angelica G.

## What this repository is

This repository is the **public website** of City Residences (plain HTML, CSS and JavaScript, hosted on GitHub Pages). It introduces the condominium and its amenities, and hosts the **web dashboards** (`admin.html` and `resident.html`) where the administrator and residents sign in.

The same system is also available as the **ResidentHub app** (Flutter, web and Android), in the repository `mochiematchaaa/Residenthub`; the web version opens from this site at `app.html`. The dashboards and the app read and write the same database rows, so they always show the same data.

## There is no sample data

The system starts empty. The administrator enters every detail (units, residents, dues, bookings, announcements, expenses, and so on) and creates every resident account.

- Sign-in uses real accounts (Supabase Authentication). There are no demo logins.
- All data is stored in the Supabase database and is shared between the web app and the Android app.
- Only the administrator can create resident accounts. A new account gets a temporary password and the resident must set a new one at first sign-in.
- Residents can see and change only what belongs to their own unit. This is enforced by database row-level security, not just by the screens.

## Demo (sample data, no database)

The folder `demo/` is a **separate preview** of the website dashboards with made-up people, units, dues, bookings and announcements. It is not connected to Supabase, so nobody can break anything.

- `demo/index.html`: the demo home (links to the admin demo, the resident demo and the app demo).
- `demo/admin.html` and `demo/resident.html`: the same screens as the real dashboards, using the real CSS and JavaScript from the parent folder.
- `demo/demo-backend.js`: replaces Supabase. It holds the sample data in the visitor's own browser (localStorage), builds the dates around today, and adds the yellow DEMO button (reset data, switch role). Nothing is sent to a server.
- Demo logins (password `Demo@1234`): `admin@demo.test` and `resident@demo.test` (Unit 3B). `?as=admin` or `?as=resident` signs in directly.
- After changing `admin.html` or `resident.html` (for example a `?v=` bump), run `python3 demo/build-demo.py` to rebuild the demo copies.
- The app demo is built from the app repository (`mochiematchaaa/Residenthub`) and opens at `/Residenthub/demo/`.

## Files

| File | What it is |
|---|---|
| `index.html` / `index.css` / `index.js` | Public website: the condominium and its amenities. No sign-in. |
| `portal.html` | Old address; sends visitors to `resident.html`. |
| `admin.html` / `admin.css` / `admin.js` / `admin-more.js` | Administrator dashboard (sidebar: Dashboard, Units, Facility, Announcements, Polls, Finance, Expenses, Reports, Grievances, Parking, Rentals, Activity log, Access, Settings). |
| `resident.html` / `resident.css` / `resident.js` | Resident dashboard (Home, Book a facility, Reservations, Dues, Events, Polls, Directory, Grievances, Documents, Unit Rental, Settings). |
| `core.js` | Shared by both dashboards: Supabase sign-in, first-login password and contact verification, live data from the `records` table, forms and toasts. Uses supabase-js (loaded from a CDN). |
| `shared.js`, `rh-extra.css` | Shared widgets and extra styling. |
| `app.html` / `app.css` / `app-links.js` | The full ResidentHub app inside a phone frame, plus the Android download link. |
| `supabase-config.js` | Public Supabase project address and public (anon) key. |
| `profile-refresh.css` | Shared styling. |
| `logo.jpg`, `amenity-*.jpg`, `resident-login-bg.jpg` | Images (the building photo is the sign-in background). |

## Setting up the first administrator

1. In the Supabase dashboard, open Authentication → Users and add a user (email and your own password, Auto Confirm on).
2. In the SQL editor, set that user's profile role to admin: `update public.profiles set role = 'admin', name = 'Your Name' where email = 'your@email';`
3. Turn off "Allow new users to sign up" (Authentication → Sign In / Providers) so only the administrator can create accounts.

Passwords must have at least 8 characters with an uppercase letter, a lowercase letter, a number and a symbol; the sign-in pages show a live checklist. For the same rules everywhere, also set Authentication > Sign In / Providers > Email > password requirements in Supabase to a minimum length of 8 with "lowercase, uppercase, digits and symbols".

Never put the Supabase `service_role` key or the database password in any file in this repository.
