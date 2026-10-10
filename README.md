# ResidentHub
### Condominium Management and Facility Booking System — for City Residences Condominium Corporation

Capstone Project Proposal by **Team LockedIn**: Comcom, Camille A. · Cunanan, Ralph Vincent · Fugaban, Jessele S. · Gancero, Ruby Angelica · Lopez, Zyrine Angelica G.

This repository is the **front-end demo build** of that proposal: plain HTML, CSS and JavaScript, no build step, no server, no database. Every screen runs on realistic sample data and in-memory state — nothing is saved anywhere, and refreshing the page resets it. It exists to let the client and panel click through the proposed UI/UX and workflows before the full-stack system (React/Node/PostgreSQL, per the proposal's technical stack) is built out.

**Client-specific note:** City Residences is fully occupied, so this build reflects the client's actual instructions rather than the proposal's generic scope in a few places — see section 5, *Client-requested adjustments*, for the full list and rationale.

## How to run it

1. Open this folder in VS Code.
2. Right-click `index.html` → **"Open with Live Server"** (install that extension if needed).
3. Or, simpler: just double-click any `.html` file to open it in your browser directly — no server needed.

## Files

| File | What it is |
|---|---|
| `index.html` / `index.css` / `index.js` | Public website — introduces the condominium and its amenities. No login needed. |
| `admin.html` / `admin.css` / `admin.js` / `admin-features.js` | Administrator dashboard (Joseph Capili). `admin.js` holds the core pages; `admin-features.js` adds Polls, Reports, Parking, Activity log, Settings, dues reminders, unit profiles, search and notifications. |
| `resident.html` / `resident.css` / `resident.js` / `resident-features.js` | Resident portal — sign in with an account the admin created. `resident-features.js` adds Events (RSVP), Polls (voting) and the Directory. |
| `shared.js` | Small helpers used by both dashboards: icons, cards, calendar, charts, toast, pop-up window, search box, notification bell, poll bars. |
| `logo.jpg` | ResidentHub logo used on all pages. |
| `amenity-pool.jpg`, `amenity-hall.jpg`, `amenity-gym.jpg`, `amenity-coffee.jpg`, `amenity-game.jpg` | Amenity photos shown on the public website. |
| `resident-login-bg.png` | Building photo used on the home page and sign-in screens. |

Every page has its own `.html` (structure), `.css` (styling) and `.js` (behaviour). The two dashboards also load `shared.js` and a `-features.js` file, in that order: `shared.js` → `admin.js` or `resident.js` → the `-features.js` file. Keep all files in the same folder.

## Demo logins

Every "password" is a placeholder — nothing here is real authentication.

- **Admin**: `owner`, `admin`, or `joseph` — any password. (Entering these on the Resident Login screen auto-redirects to the admin dashboard — there is no public "Staff login" link, by design.)
- **Resident**: `maria.santos@cityresidences.ph` / `resident123`.

---

## 1. Project overview (from the proposal)

The proposed system is a web-based Condominium Management and Facility Booking System that centralizes resident information, announcements, facility bookings, finance records, polls, parking, grievances, documents, events, and other community activities into one platform for administrators and residents — reducing manual/paper-based work and giving administrators a single dashboard for monitoring operations.

## 2. Major System Modules and where each one lives in this demo

| Module (per proposal) | Purpose | Where it lives here |
|---|---|---|
| User & Resident Management | Manage resident accounts, profiles, roles, and unit associations | `admin.html` → Manage Access; role-based sign-in on both portals |
| Condominium Unit Management | Maintain unit, occupancy, status, and resident information | `admin.html` → Units & Residents |
| Facility Booking | Manage facilities, schedules, availability, booking requests, approvals, status | `admin.html` → Facility Booking (approvals) + `resident.html` → Book a Facility / My Reservations |
| Announcement Management | Create, publish, edit, manage announcements | `admin.html` → Announcements & Events; shown on `index.html` and `resident.html` Home |
| Event Management | Create and manage community events | `admin.html` → Announcements & Events; `resident.html` → Events (RSVP) |
| Finance Management | Record dues, charges, payment status, history, summaries; also covers the motor parking rental rate (see section 5) | `admin.html` → Finance; `resident.html` → Dues & Payment |
| Polls & Voting | Ask residents for their opinion and show results | `admin.html` → Polls (create, close, export); `resident.html` → Polls (vote once) |
| Reports | Collections, dues ageing, unit usage, facility use, grievances | `admin.html` → Reports (charts and CSV download) |
| Parking Management | Assign and release motor parking slots, approve requests | `admin.html` → Parking |
| Activity Log | Track what staff did in the system | `admin.html` → Activity log (CSV export) |
| Admin Profile | Account details and recent activity | `admin.html` → click your name in the sidebar |
| Grievance Management | Submit, track, respond to, resolve resident concerns | `resident.html` → Grievances; `admin.html` → Grievances, Docs & Vendors |
| Document Management | Upload, organize, view, manage condominium documents | `admin.html` → upload/organize/remove; `resident.html` → Documents |
| Vendor Management | Maintain vendor/service-provider information | `admin.html` → add/remove vendors |
| Notifications & Activity Feed | Display system updates and recent activity | Home dashboards on `admin.html` and `resident.html` |

Package Management is in the original proposal's module list but is descoped from this demo — see section 5.

## 3. In-scope items — implemented in this demo

- ✅ User authentication and authorization (role-based: Admin, Resident)
- ✅ Administrator dashboard (key counts, pending activity, recent activity, quick actions)
- ✅ Resident dashboard
- ✅ Resident and unit management
- ✅ Condominium facility management (Swimming Pool, Function Hall, Gym & Fitness Center, Coffee Lounge, and Game Corner — see section 5)
- ✅ Facility booking and reservation system, with conflict/availability checking
- ✅ Booking approval and status management
- ✅ Announcement management (including emergency/maintenance broadcast simulation)
- ✅ Event management
- ✅ Finance and dues record management, including the motor parking rental rate
- ✅ Polls and voting
- ✅ Parking slot management
- ✅ Activity log
- ✅ Directory (contacts, house rules, FAQ) and Events with RSVP on the resident portal
- ✅ Grievance/concern management
- ✅ Document/file management
- ✅ Vendor management
- ✅ Notifications/activity feed
- ✅ Search and filtering (a search box on every page plus category filters)
- ✅ Reporting with charts (Reports page) and dashboard statistics
- ✅ Responsive web interface (mobile hamburger navigation on all pages, dark mode on admin/resident)

## 4. Out-of-scope items — intentionally **not** in this demo

These match the proposal's own out-of-scope list, plus everything that requires a real backend (which this front-end-only prototype never had):

- Real backend, database, or server-side persistence — this build is HTML/CSS/JS only.
- Real authentication (passwords are plain equality checks, not hashed/JWT).
- Actual payment processing or payment gateway integration/fees.
- Real SMS/text gateway — the emergency/maintenance alert feature *simulates* texting residents with an on-screen toast; no message is actually sent.
- Native Android/iOS mobile apps.
- Physical access-control or biometric/CCTV integration.
- Banking integration.
- Long-term cloud hosting, 24/7 monitoring, or continuous support after turnover.
- Professional cybersecurity auditing.
- Third-party API integrations without approved access.

## 5. Client-requested adjustments (deviations from the original proposal)

The client gave the following instructions specific to City Residences' actual situation, which take priority over the proposal's generic scope for this demo:

- **Unit inquiries removed.** The condominium is fully booked, so the public "Inquire about a unit" form and the admin's inquiry-reply workflow were removed entirely — there's nothing to inquire about right now.
- **Package Management removed.** Per client instruction, package logging/tracking is not part of this system. The Visitors & Packages tabs were first renamed to "Visitors".
- **Guardhouse/Security portal removed.** `security.html` (the separate guard sign-in and gate log) has been removed, and the "Security" account role option was removed from Manage Access since there's no portal for it to sign into.
- **Visitors removed.** The Visitors page is gone from both the admin dashboard and the resident portal. The only visitor-related item left is the ₱150 guest fee for the swimming pool, collected at the gate.
- **Amenities.** Facility Booking (admin and resident) covers the two bookable facilities the client confirmed have a reservation/slot process: **Swimming Pool** and **Function Hall** — the demo's earlier placeholder amenities (Clubhouse, Basketball Court, Gym) were removed from that booking flow. The public site's Amenities page additionally showcases **Gym & Fitness Center, Coffee Lounge, and Game Corner** as informational/marketing content (with real client-provided photos), since these exist on-site but don't go through a booking workflow; they can be wired into Facility Booking later if the client wants them reservable.
- **Swimming Pool fee.** Free for residents; guests/visitors pay **₱150 per visit**, collected at the gate. Shown as a note on the Facility Booking screen (admin and resident) whenever Swimming Pool is selected, and on the public Amenities page.
- **Motor parking rental (new, not in the original proposal).** Residents can rent a motor/motorcycle parking slot. The admin sets the monthly rate under Finance (default **₱500/month**) and can update it at any time, since the client noted the rate is **not fixed and may change**. Residents see the current rate and can request a slot under Dues & Payment.
- **Unit Rental / Unit Rentals (new, not in the original proposal).** The client noted that some residents rent their unit out (long-term lease, or short-term/Airbnb-style) or run a business out of it. This now has its own dedicated nav tab — **"Unit Rental"** on `resident.html` and **"Unit Rentals"** on `admin.html` — rather than living inside Settings, since the client wanted it visible in the main navigation. Residents declare a usage type (Owner-occupied / Leased to a tenant / Short-term rental / Home-based business, with details for anything other than owner-occupied):
  - **Owner-occupied** and **Leased to a tenant** (long-term) save immediately — no approval needed.
  - **Short-term rental** (Airbnb-style) and **Home-based business** go through an approval workflow, mirroring the existing Grievances/Booking-request pattern: the declaration is marked **Pending**, the admin's Unit Rentals tab lists it for review with Approve/Reject actions (plus an optional note), and the admin's decision — **Approved** or **Rejected** with the admin's remark — is reflected back on the resident's own Unit Rental tab. The admin Home dashboard also gets a "Unit rentals to review" attention card counting pending declarations.
  - The admin's Units & Residents table still shows a **USAGE** column (now also showing Pending/Approved/Rejected for the two reviewed types) and the "Rented out / business use" filter, so the association can track which units may need HOA approval, insurance review, or different dues.

## 6. Appendix A (proposal) vs. this demo's Administrator dashboard

| Proposed dashboard item | In this demo |
|---|---|
| Total residents/members | ✅ Home hero stat |
| Number of condominium units | ✅ Home hero stat |
| Registered vendors | ✅ Home hero stat |
| Earnings/financial summary | ✅ Home hero stat |
| Announcements | ✅ Home "Announcements" panel |
| Bookings | ✅ Home "Upcoming facility bookings" panel |
| Pending dues | ✅ Home attention card ("Unpaid dues") |
| Open grievances | ✅ Home attention card |
| Pending visitors | ❌ Not applicable — Visitors removed (section 5) |
| Pending packages | ❌ Not applicable — Package Management descoped (section 5) |
| Recent system activities | ✅ Home "Recent activity" panel |
| Quick actions (Create Announcement, Add Event, Add Finance Charge, Payment Settings, Upload File) | ✅ Home quick buttons (Create Announcement, New Poll, Add Finance Charge, View Reports, Assign Parking, Settings) |

## 7. Appendix B (proposal) vs. this demo's Resident Portal

| Proposed resident item | In this demo |
|---|---|
| My Profile and Unit | ✅ Settings tab |
| Announcements | ✅ Home tab |
| Community Events | ✅ Events tab (with RSVP) and Home calendar |
| Facility Booking | ✅ Book a Facility tab |
| My Reservations | ✅ My Reservations tab |
| Finance/Dues and Payment Status | ✅ Dues & Payment tab (also motor parking rental — section 5) |
| Visitor Registration | ❌ Not applicable — Visitors removed (section 5) |
| Package Notifications | ❌ Not applicable — Package Management descoped (section 5) |
| Submit/View Grievances | ✅ Grievances tab |
| Community Documents | ✅ Documents tab |
| Notifications | ✅ Home tab + persistent emergency banner |

## 8. Additional features (beyond the proposal's approved scope)

Added as extras for the demo, not required deliverables — flag these to the panel as stretch goals rather than core requirements:

- **Emergency/maintenance broadcast simulation** — admins tag an announcement General/Maintenance/Warning/Emergency and optionally "text" it to all residents; the demo shows a confirmation toast and, for Emergency posts, a persistent banner on the resident portal. No real SMS gateway is used.
- **Motor parking rental** — see section 5. Admins also get a **Parking** page with a 24-slot grid and a request queue.
- **Polls & voting** — admins publish polls and close or export them; residents vote once per poll and see live results. (Sample data: the two dashboards do not share polls or events in this demo.)
- **Reports** — bar charts (6-month collections, dues ageing, facility use), donuts (unit usage, grievances) and poll turnout, plus a CSV download.
- **Activity log** — every admin action (payments, approvals, announcements, parking, settings) is recorded with name and time, and can be exported.
- **Dues reminders** — send one unit or all unpaid units a reminder from Finance.
- **Unit profile pop-up** — "View" on any unit shows occupancy, contact, usage and dues, with reminder and copy-contact buttons.
- **Admin Settings** — association details, monthly dues amount, due day, late fee and SMS toggle.
- **Search box and notification bell** on every page of both dashboards.
- **Resident Events** (RSVP) and **Directory** (who to call, house rules, FAQ).
- **Payment desk** (Finance) — pick an unpaid unit, record its exact amount, and see it in the latest-transactions list (exportable). A 12-month collection chart sits above it. Demo only: no money moves.
- **CSV import** — Units and Finance can import a CSV (with a downloadable template). The file is checked first, you confirm in a pop-up, then existing units are updated and new ones added for this session.
- **My profile** (admin) — click your name at the bottom of the sidebar to see your account details, a sample account-health checklist, recent activity from the log, and quick links.
- **Dark mode** on `admin.html` and `resident.html`.
- **Resident Settings** — profile editing, password change, and a mock device/session list with sign-out controls.
- **Manage Access safety controls** — form validation, duplicate/invalid-email checks, required unit for resident accounts, and Suspend/Reactivate/Revoke (with confirmation) instead of silent deletion.

## 9. Known limitations

- No real backend, database, or persistence — everything resets on reload.
- "Login" is a plain equality check in the browser, not real authentication.
- Exports are real `.csv` downloads generated entirely in the browser.
- Sample data (52 units, 184 residents, 5 vendors, etc.) is illustrative, per the proposal's note that final workflows/data are confirmed during requirements analysis with the client.


## Cozy UI and profile photos
The dashboards now use warm cream, sage-green gradients and soft gold accents. In **Admin → My profile** and **Resident → Settings → Profile**, upload or remove a JPG, PNG or WebP photo (up to 5 MB). Images are resized to 320px and stored in the browser localStorage, keyed per resident email (admin has a separate key). Photos persist across refreshes in the same browser only; they do **not** sync to other devices or constitute a server-side database. For production, use authenticated image uploads, server-side validation, access controls and private object storage.


## Blue Sunshine theme update
The admin, resident, and public pages now share a reference-inspired sapphire blue, sky blue, butter yellow and pastel gradient theme. Existing profile photo upload remains available in `profile-photo.js`.

## Latest design changes
- Removed the heart, cross, triangle, and octagon/burst decorative SVGs from admin and resident summary cards; informative icons and data remain.
- The public site and the resident sign-in no longer link to the administrator page. The admin opens `admin.html` directly (the address is not shown to residents). An admin account signed in on the resident page is still sent to the admin dashboard.
- Preserved the pastel theme and Edit Profile photo upload functionality.


## Exact CSV import update
In Admin → Units or Finance, select **Import CSV**. The CSV is immediately displayed as a full-width table with exactly the source headers, cell values, row count and order. Existing sample records in that module are replaced, not merged. All columns are shown, including custom columns. Data persists in this browser using localStorage. The **Export exact CSV** button recreates the imported data (including quoted commas and multiline fields). The existing management widgets use recognizable column names if available; for arbitrary custom columns, the exact table remains the authoritative display. This is browser-local demo storage, not a server database.


## Exact CSV import (Admin)
In **Units & Residents**, **Finance**, and **Access**, select **Import CSV**. The selected file is parsed immediately and its exact column headings and cell text replace the table in that section. Previous demo rows are not appended. Quoted commas, embedded newlines, leading zeros, and escaped quotes are supported. A CSV template and export of the imported file are provided. Imports persist in the same browser via localStorage (up to available browser quota); there is no backend synchronization. The imported access CSV is a **display-only roster** and does not automatically create authenticated accounts or passwords. Finance and unit imports also update the existing in-memory records when recognized columns are present; additional arbitrary columns remain visible in the imported table. Reload to verify browser persistence.


## Editable imported CSV records
Import a CSV in Finance, Units & Residents, or Access. The table displays the imported headers and values exactly. Use **Add** to insert a blank row, **Edit** to unlock the cells, **Remove** to delete an imported row, and **Save changes** to persist the modified rows in localStorage. No prescribed CSV columns are required for the editor. Export imported CSV was removed. Finance no longer shows the Paid/Unpaid filter buttons or Latest transactions panel. Changes update the browser's stored copy, not the original CSV file on disk.


## Connected to the ResidentHub app

- **`app.html`** shows the ResidentHub app (the Flutter web build) inside a phone frame, with a button to download the Android app. It is reached from the **Get the App** section on the home page. The public site's **Sign In** buttons still open the resident portal.
- **"Get the App"** section on `index.html`: open the app in the browser, download the Android app, or scan a QR code.
- **`app-links.js`** holds the addresses (the web app, the Android app file on GitHub Releases, this website). Change a link there and every page follows.
- The earlier `resident.html` and `admin.html` demos are still available from `app.html`. They keep their own sample data and are not shared with the app.
- The app has a "Visit our website" link on its sign-in screen that comes back here.

## Hosting on GitHub

- **This website:** make a repository named exactly `mochiematchaaa.github.io`, upload the files of this folder to it, then go to Settings > Pages and choose "Deploy from a branch", branch `main`, folder `/ (root)`. The site is then at https://mochiematchaaa.github.io/
- **The app:** the Flutter project's own repository (`Residenthub`) publishes the app with its GitHub Actions workflow, at https://mochiematchaaa.github.io/Residenthub/
- Both addresses are written in `app-links.js`.

## Files

| File | What it is |
|---|---|
| `index.html` / `index.css` / `index.js` | Public website — introduces the condominium and its amenities. No login needed. |
| `admin.html` / `admin.css` / `admin.js` / `admin-features.js` | Administrator dashboard (Joseph Capili). `admin.js` holds the core pages; `admin-features.js` adds Polls, Reports, Parking, Activity log, Settings, dues reminders, unit profiles, search and notifications. |
| `resident.html` / `resident.css` / `resident.js` / `resident-features.js` | Resident portal — sign in with an account the admin created. `resident-features.js` adds Events (RSVP), Polls (voting) and the Directory. |
| `app.html` / `app.css` / `app-links.js` | The ResidentHub app shown inside the website, and the file that holds the links to it. |
| `shared.js` | Small helpers used by both dashboards: icons, cards, calendar, charts, toast, pop-up window, search box, notification bell, poll bars. |
| `logo.jpg` | ResidentHub logo used on all pages. |
| `amenity-pool.jpg`, `amenity-hall.jpg`, `amenity-gym.jpg`, `amenity-coffee.jpg`, `amenity-game.jpg` | Amenity photos shown on the public website. |
| `resident-login-bg.png` | Building photo used on the home page and sign-in screens. |

Every page has its own `.html` (structure), `.css` (styling) and `.js` (behaviour). The two dashboards also load `shared.js` and a `-features.js` file, in that order: `shared.js` → `admin.js` or `resident.js` → the `-features.js` file. Keep all files in the same folder.

## Demo logins

Every "password" is a placeholder — nothing here is real authentication.

- **Admin**: `owner`, `admin`, or `joseph` — any password. (Entering these on the Resident Login screen auto-redirects to the admin dashboard — there is no public "Staff login" link, by design.)
- **Resident**: `maria.santos@cityresidences.ph` / `resident123`.

---

## 1. Project overview (from the proposal)

The proposed system is a web-based Condominium Management and Facility Booking System that centralizes resident information, announcements, facility bookings, finance records, polls, parking, grievances, documents, events, and other community activities into one platform for administrators and residents — reducing manual/paper-based work and giving administrators a single dashboard for monitoring operations.

## 2. Major System Modules and where each one lives in this demo

| Module (per proposal) | Purpose | Where it lives here |
|---|---|---|
| User & Resident Management | Manage resident accounts, profiles, roles, and unit associations | `admin.html` → Manage Access; role-based sign-in on both portals |
| Condominium Unit Management | Maintain unit, occupancy, status, and resident information | `admin.html` → Units & Residents |
| Facility Booking | Manage facilities, schedules, availability, booking requests, approvals, status | `admin.html` → Facility Booking (approvals) + `resident.html` → Book a Facility / My Reservations |
| Announcement Management | Create, publish, edit, manage announcements | `admin.html` → Announcements & Events; shown on `index.html` and `resident.html` Home |
| Event Management | Create and manage community events | `admin.html` → Announcements & Events; `resident.html` → Events (RSVP) |
| Finance Management | Record dues, charges, payment status, history, summaries; also covers the motor parking rental rate (see section 5) | `admin.html` → Finance; `resident.html` → Dues & Payment |
| Polls & Voting | Ask residents for their opinion and show results | `admin.html` → Polls (create, close, export); `resident.html` → Polls (vote once) |
| Reports | Collections, dues ageing, unit usage, facility use, grievances | `admin.html` → Reports (charts and CSV download) |
| Parking Management | Assign and release motor parking slots, approve requests | `admin.html` → Parking |
| Activity Log | Track what staff did in the system | `admin.html` → Activity log (CSV export) |
| Admin Profile | Account details and recent activity | `admin.html` → click your name in the sidebar |
| Grievance Management | Submit, track, respond to, resolve resident concerns | `resident.html` → Grievances; `admin.html` → Grievances, Docs & Vendors |
| Document Management | Upload, organize, view, manage condominium documents | `admin.html` → upload/organize/remove; `resident.html` → Documents |
| Vendor Management | Maintain vendor/service-provider information | `admin.html` → add/remove vendors |
| Notifications & Activity Feed | Display system updates and recent activity | Home dashboards on `admin.html` and `resident.html` |

Package Management is in the original proposal's module list but is descoped from this demo — see section 5.

## 3. In-scope items — implemented in this demo

- ✅ User authentication and authorization (role-based: Admin, Resident)
- ✅ Administrator dashboard (key counts, pending activity, recent activity, quick actions)
- ✅ Resident dashboard
- ✅ Resident and unit management
- ✅ Condominium facility management (Swimming Pool, Function Hall, Gym & Fitness Center, Coffee Lounge, and Game Corner — see section 5)
- ✅ Facility booking and reservation system, with conflict/availability checking
- ✅ Booking approval and status management
- ✅ Announcement management (including emergency/maintenance broadcast simulation)
- ✅ Event management
- ✅ Finance and dues record management, including the motor parking rental rate
- ✅ Polls and voting
- ✅ Parking slot management
- ✅ Activity log
- ✅ Directory (contacts, house rules, FAQ) and Events with RSVP on the resident portal
- ✅ Grievance/concern management
- ✅ Document/file management
- ✅ Vendor management
- ✅ Notifications/activity feed
- ✅ Search and filtering (a search box on every page plus category filters)
- ✅ Reporting with charts (Reports page) and dashboard statistics
- ✅ Responsive web interface (mobile hamburger navigation on all pages, dark mode on admin/resident)

## 4. Out-of-scope items — intentionally **not** in this demo

These match the proposal's own out-of-scope list, plus everything that requires a real backend (which this front-end-only prototype never had):

- Real backend, database, or server-side persistence — this build is HTML/CSS/JS only.
- Real authentication (passwords are plain equality checks, not hashed/JWT).
- Actual payment processing or payment gateway integration/fees.
- Real SMS/text gateway — the emergency/maintenance alert feature *simulates* texting residents with an on-screen toast; no message is actually sent.
- Native Android/iOS mobile apps.
- Physical access-control or biometric/CCTV integration.
- Banking integration.
- Long-term cloud hosting, 24/7 monitoring, or continuous support after turnover.
- Professional cybersecurity auditing.
- Third-party API integrations without approved access.

## 5. Client-requested adjustments (deviations from the original proposal)

The client gave the following instructions specific to City Residences' actual situation, which take priority over the proposal's generic scope for this demo:

- **Unit inquiries removed.** The condominium is fully booked, so the public "Inquire about a unit" form and the admin's inquiry-reply workflow were removed entirely — there's nothing to inquire about right now.
- **Package Management removed.** Per client instruction, package logging/tracking is not part of this system. The Visitors & Packages tabs were first renamed to "Visitors".
- **Guardhouse/Security portal removed.** `security.html` (the separate guard sign-in and gate log) has been removed, and the "Security" account role option was removed from Manage Access since there's no portal for it to sign into.
- **Visitors removed.** The Visitors page is gone from both the admin dashboard and the resident portal. The only visitor-related item left is the ₱150 guest fee for the swimming pool, collected at the gate.
- **Amenities.** Facility Booking (admin and resident) covers the two bookable facilities the client confirmed have a reservation/slot process: **Swimming Pool** and **Function Hall** — the demo's earlier placeholder amenities (Clubhouse, Basketball Court, Gym) were removed from that booking flow. The public site's Amenities page additionally showcases **Gym & Fitness Center, Coffee Lounge, and Game Corner** as informational/marketing content (with real client-provided photos), since these exist on-site but don't go through a booking workflow; they can be wired into Facility Booking later if the client wants them reservable.
- **Swimming Pool fee.** Free for residents; guests/visitors pay **₱150 per visit**, collected at the gate. Shown as a note on the Facility Booking screen (admin and resident) whenever Swimming Pool is selected, and on the public Amenities page.
- **Motor parking rental (new, not in the original proposal).** Residents can rent a motor/motorcycle parking slot. The admin sets the monthly rate under Finance (default **₱500/month**) and can update it at any time, since the client noted the rate is **not fixed and may change**. Residents see the current rate and can request a slot under Dues & Payment.
- **Unit Rental / Unit Rentals (new, not in the original proposal).** The client noted that some residents rent their unit out (long-term lease, or short-term/Airbnb-style) or run a business out of it. This now has its own dedicated nav tab — **"Unit Rental"** on `resident.html` and **"Unit Rentals"** on `admin.html` — rather than living inside Settings, since the client wanted it visible in the main navigation. Residents declare a usage type (Owner-occupied / Leased to a tenant / Short-term rental / Home-based business, with details for anything other than owner-occupied):
  - **Owner-occupied** and **Leased to a tenant** (long-term) save immediately — no approval needed.
  - **Short-term rental** (Airbnb-style) and **Home-based business** go through an approval workflow, mirroring the existing Grievances/Booking-request pattern: the declaration is marked **Pending**, the admin's Unit Rentals tab lists it for review with Approve/Reject actions (plus an optional note), and the admin's decision — **Approved** or **Rejected** with the admin's remark — is reflected back on the resident's own Unit Rental tab. The admin Home dashboard also gets a "Unit rentals to review" attention card counting pending declarations.
  - The admin's Units & Residents table still shows a **USAGE** column (now also showing Pending/Approved/Rejected for the two reviewed types) and the "Rented out / business use" filter, so the association can track which units may need HOA approval, insurance review, or different dues.

## 6. Appendix A (proposal) vs. this demo's Administrator dashboard

| Proposed dashboard item | In this demo |
|---|---|
| Total residents/members | ✅ Home hero stat |
| Number of condominium units | ✅ Home hero stat |
| Registered vendors | ✅ Home hero stat |
| Earnings/financial summary | ✅ Home hero stat |
| Announcements | ✅ Home "Announcements" panel |
| Bookings | ✅ Home "Upcoming facility bookings" panel |
| Pending dues | ✅ Home attention card ("Unpaid dues") |
| Open grievances | ✅ Home attention card |
| Pending visitors | ❌ Not applicable — Visitors removed (section 5) |
| Pending packages | ❌ Not applicable — Package Management descoped (section 5) |
| Recent system activities | ✅ Home "Recent activity" panel |
| Quick actions (Create Announcement, Add Event, Add Finance Charge, Payment Settings, Upload File) | ✅ Home quick buttons (Create Announcement, New Poll, Add Finance Charge, View Reports, Assign Parking, Settings) |

## 7. Appendix B (proposal) vs. this demo's Resident Portal

| Proposed resident item | In this demo |
|---|---|
| My Profile and Unit | ✅ Settings tab |
| Announcements | ✅ Home tab |
| Community Events | ✅ Events tab (with RSVP) and Home calendar |
| Facility Booking | ✅ Book a Facility tab |
| My Reservations | ✅ My Reservations tab |
| Finance/Dues and Payment Status | ✅ Dues & Payment tab (also motor parking rental — section 5) |
| Visitor Registration | ❌ Not applicable — Visitors removed (section 5) |
| Package Notifications | ❌ Not applicable — Package Management descoped (section 5) |
| Submit/View Grievances | ✅ Grievances tab |
| Community Documents | ✅ Documents tab |
| Notifications | ✅ Home tab + persistent emergency banner |

## 8. Additional features (beyond the proposal's approved scope)

Added as extras for the demo, not required deliverables — flag these to the panel as stretch goals rather than core requirements:

- **Emergency/maintenance broadcast simulation** — admins tag an announcement General/Maintenance/Warning/Emergency and optionally "text" it to all residents; the demo shows a confirmation toast and, for Emergency posts, a persistent banner on the resident portal. No real SMS gateway is used.
- **Motor parking rental** — see section 5. Admins also get a **Parking** page with a 24-slot grid and a request queue.
- **Polls & voting** — admins publish polls and close or export them; residents vote once per poll and see live results. (Sample data: the two dashboards do not share polls or events in this demo.)
- **Reports** — bar charts (6-month collections, dues ageing, facility use), donuts (unit usage, grievances) and poll turnout, plus a CSV download.
- **Activity log** — every admin action (payments, approvals, announcements, parking, settings) is recorded with name and time, and can be exported.
- **Dues reminders** — send one unit or all unpaid units a reminder from Finance.
- **Unit profile pop-up** — "View" on any unit shows occupancy, contact, usage and dues, with reminder and copy-contact buttons.
- **Admin Settings** — association details, monthly dues amount, due day, late fee and SMS toggle.
- **Search box and notification bell** on every page of both dashboards.
- **Resident Events** (RSVP) and **Directory** (who to call, house rules, FAQ).
- **Payment desk** (Finance) — pick an unpaid unit, record its exact amount, and see it in the latest-transactions list (exportable). A 12-month collection chart sits above it. Demo only: no money moves.
- **CSV import** — Units and Finance can import a CSV (with a downloadable template). The file is checked first, you confirm in a pop-up, then existing units are updated and new ones added for this session.
- **My profile** (admin) — click your name at the bottom of the sidebar to see your account details, a sample account-health checklist, recent activity from the log, and quick links.
- **Dark mode** on `admin.html` and `resident.html`.
- **Resident Settings** — profile editing, password change, and a mock device/session list with sign-out controls.
- **Manage Access safety controls** — form validation, duplicate/invalid-email checks, required unit for resident accounts, and Suspend/Reactivate/Revoke (with confirmation) instead of silent deletion.

## 9. Known limitations

- No real backend, database, or persistence — everything resets on reload.
- "Login" is a plain equality check in the browser, not real authentication.
- Exports are real `.csv` downloads generated entirely in the browser.
- Sample data (52 units, 184 residents, 5 vendors, etc.) is illustrative, per the proposal's note that final workflows/data are confirmed during requirements analysis with the client.
